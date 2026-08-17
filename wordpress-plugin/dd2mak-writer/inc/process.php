<?php
if (!defined('ABSPATH')) {
    exit;
}

function dd2mak_is_writer_post($post_id) {
    return (string) get_post_meta($post_id, '_dd2mak_writer', true) === '1';
}

function dd2mak_ensure_category($slug) {
    $cats = dd2mak_categories();
    if (!isset($cats[ $slug ])) {
        return new WP_Error('bad_cat', '허용되지 않은 카테고리입니다.');
    }
    $term = get_term_by('slug', $slug, 'category');
    if ($term && !is_wp_error($term)) {
        return (int) $term->term_id;
    }
    $found = get_term_by('name', $cats[ $slug ], 'category');
    if ($found && !is_wp_error($found)) {
        return (int) $found->term_id;
    }
    $created = wp_insert_term($cats[ $slug ], 'category', array('slug' => $slug));
    if (is_wp_error($created)) {
        return $created;
    }
    return (int) $created['term_id'];
}

function dd2mak_save_draft($post_id, $title, $content, $category_slug, $author_id) {
    $title = sanitize_text_field($title);
    if ($title === '') {
        return new WP_Error('no_title', '제목을 입력하세요.');
    }
    $term_id = dd2mak_ensure_category($category_slug);
    if (is_wp_error($term_id)) {
        return $term_id;
    }
    $data = array(
        'post_title'   => $title,
        'post_content' => wp_kses_post($content),
        'post_status'  => 'draft',
        'post_type'    => 'post',
        'post_author'  => (int) $author_id,
        'meta_input'   => array('_dd2mak_writer' => '1'),
    );
    if ((int) $post_id > 0) {
        $post = get_post($post_id);
        if (!$post || (int) $post->post_author !== (int) $author_id || $post->post_status !== 'draft' || !dd2mak_is_writer_post($post_id)) {
            return new WP_Error('forbidden', '이 글을 저장할 수 없습니다.');
        }
        $data['ID'] = (int) $post_id;
        $id = wp_update_post($data, true);
    } else {
        $id = wp_insert_post($data, true);
    }
    if (is_wp_error($id)) {
        return $id;
    }
    wp_set_post_categories($id, array($term_id));
    do_action('dd2mak_after_save_draft', $id);
    return (int) $id;
}

function dd2mak_submit_for_review($post_id, $user_id) {
    $post = get_post($post_id);
    if (!$post || !dd2mak_is_writer_post($post_id) || (int) $post->post_author !== (int) $user_id || $post->post_status !== 'draft') {
        return new WP_Error('forbidden', '제출할 수 없는 글입니다.');
    }
    if ($post->post_title === '') {
        return new WP_Error('no_title', '제목을 입력하세요.');
    }
    $r = wp_update_post(array('ID' => (int) $post_id, 'post_status' => 'pending'), true);
    if (is_wp_error($r)) {
        return $r;
    }
    do_action('dd2mak_after_submit_for_review', (int) $post_id);
    return true;
}

function dd2mak_update_review($post_id, $title, $content, $meta) {
    $post = get_post($post_id);
    if (!$post || !dd2mak_is_writer_post($post_id) || $post->post_status !== 'pending') {
        return new WP_Error('forbidden', '검수할 수 없는 글입니다.');
    }
    $title = sanitize_text_field($title);
    if ($title === '') {
        return new WP_Error('no_title', '제목을 입력하세요.');
    }
    $r = wp_update_post(array(
        'ID'           => (int) $post_id,
        'post_title'   => $title,
        'post_content' => wp_kses_post($content),
        'post_status'  => 'pending',
    ), true);
    if (is_wp_error($r)) {
        return $r;
    }
    dd2mak_save_review_meta($post_id, $meta);
    do_action('dd2mak_after_update_review', (int) $post_id);
    return true;
}

function dd2mak_update_published($post_id, $title, $content, $meta) {
    $post = get_post($post_id);
    if (!$post || !dd2mak_is_writer_post($post_id) || $post->post_status !== 'publish') {
        return new WP_Error('forbidden', '수정할 수 없는 글입니다.');
    }
    $title = sanitize_text_field($title);
    if ($title === '') {
        return new WP_Error('no_title', '제목을 입력하세요.');
    }
    $r = wp_update_post(array(
        'ID'           => (int) $post_id,
        'post_title'   => $title,
        'post_content' => wp_kses_post($content),
        'post_status'  => 'publish',
    ), true);
    if (is_wp_error($r)) {
        return $r;
    }
    dd2mak_save_review_meta($post_id, $meta);
    do_action('dd2mak_after_update_published', (int) $post_id);
    return true;
}

function dd2mak_save_review_meta($post_id, $meta) {
    if (!is_array($meta)) {
        return;
    }
    if (isset($meta['source'])) {
        update_post_meta($post_id, '_dd2mak_source', sanitize_text_field($meta['source']));
    }
    if (isset($meta['reviewed_at'])) {
        update_post_meta($post_id, '_dd2mak_reviewed_at', sanitize_text_field($meta['reviewed_at']));
    }
    if (isset($meta['caution'])) {
        update_post_meta($post_id, '_dd2mak_caution', sanitize_textarea_field($meta['caution']));
    }
    if (array_key_exists('ai_draft', $meta)) {
        update_post_meta($post_id, '_dd2mak_ai_draft', $meta['ai_draft'] ? '1' : '');
    }
}

function dd2mak_publish_post($post_id, $user_id) {
    if (!user_can($user_id, 'publish_posts')) {
        return new WP_Error('forbidden', '발행 권한이 없습니다.');
    }
    $post = get_post($post_id);
    if (!$post || !dd2mak_is_writer_post($post_id) || $post->post_status !== 'pending') {
        return new WP_Error('forbidden', '발행할 수 없는 글입니다.');
    }
    $r = wp_update_post(array('ID' => (int) $post_id, 'post_status' => 'publish'), true);
    if (is_wp_error($r)) {
        return $r;
    }
    do_action('dd2mak_after_publish_post', (int) $post_id);
    return true;
}

function dd2mak_generate_draft($category_slug, $keywords, $author_id) {
    $keywords = sanitize_text_field($keywords);
    if ($keywords === '') {
        return new WP_Error('no_kw', '키워드를 입력하세요.');
    }
    $term_id = dd2mak_ensure_category($category_slug);
    if (is_wp_error($term_id)) {
        return $term_id;
    }
    $ai = dd2mak_generate_article($category_slug, $keywords);
    if (is_wp_error($ai)) {
        return $ai;
    }
    $id = dd2mak_save_draft(0, $ai['title'], $ai['content'], $category_slug, $author_id);
    if (is_wp_error($id)) {
        return $id;
    }
    update_post_meta($id, '_dd2mak_ai_draft', '1');
    do_action('dd2mak_after_generate_draft', $id);
    return array(
        'post_id' => $id,
        'title'   => $ai['title'],
        'content' => $ai['content'],
    );
}
