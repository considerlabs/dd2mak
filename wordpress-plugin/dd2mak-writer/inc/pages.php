<?php
if (!defined('ABSPATH')) {
    exit;
}

add_action('admin_post_dd2mak_writer_action', 'dd2mak_handle_writer_action');
add_action('admin_post_dd2mak_review_action', 'dd2mak_handle_review_action');

function dd2mak_set_notice($msg, $type = 'success') {
    set_transient(
        'dd2mak_notice_' . get_current_user_id(),
        array('msg' => $msg, 'type' => $type),
        60
    );
}

function dd2mak_print_notice() {
    $key = 'dd2mak_notice_' . get_current_user_id();
    $n = get_transient($key);
    if (!$n || empty($n['msg'])) {
        return;
    }
    delete_transient($key);
    $type = isset($n['type']) ? $n['type'] : 'success';
    echo '<div class="notice notice-' . esc_attr($type) . ' is-dismissible"><p>' . esc_html($n['msg']) . '</p></div>';
}

function dd2mak_status_label($status) {
    $map = array(
        'draft'   => '작성 중',
        'pending' => '검수 대기',
        'publish' => '발행됨',
    );
    return isset($map[ $status ]) ? $map[ $status ] : $status;
}

function dd2mak_post_category_slug($post_id) {
    $terms = get_the_category($post_id);
    if (!$terms) {
        return 'health';
    }
    $allowed = dd2mak_categories();
    foreach ($terms as $term) {
        if (isset($allowed[ $term->slug ])) {
            return $term->slug;
        }
    }
    return $terms[0]->slug;
}

function dd2mak_load_writer_post($post_id) {
    $post_id = (int) $post_id;
    if ($post_id <= 0) {
        return null;
    }
    $post = get_post($post_id);
    if (!$post || !dd2mak_is_writer_post($post_id)) {
        return null;
    }
    return $post;
}

function dd2mak_page_new_draft() {
    if (!current_user_can('edit_posts')) {
        wp_die('권한이 없습니다.');
    }

    $user_id = get_current_user_id();
    $post_id = isset($_GET['post']) ? (int) $_GET['post'] : 0;
    $post = dd2mak_load_writer_post($post_id);
    if ($post && ((int) $post->post_author !== $user_id || $post->post_status !== 'draft')) {
        wp_die('이 글을 편집할 수 없습니다.');
    }
    if ($post_id && !$post) {
        wp_die('글을 찾을 수 없습니다.');
    }

    $title = $post ? $post->post_title : '';
    $content = $post ? $post->post_content : '';
    $slug = $post ? dd2mak_post_category_slug($post->ID) : 'health';
    $keywords = $post ? (string) get_post_meta($post->ID, '_dd2mak_keywords', true) : '';
    $count = dd2mak_plain_char_count($content);

    echo '<div class="wrap"><h1>새 초안 작성</h1>';
    dd2mak_print_notice();
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
    wp_nonce_field('dd2mak_writer');
    echo '<input type="hidden" name="action" value="dd2mak_writer_action">';
    echo '<input type="hidden" name="post_id" value="' . esc_attr($post ? $post->ID : 0) . '">';

    echo '<table class="form-table"><tbody>';
    echo '<tr><th><label for="dd2mak_category">카테고리</label></th><td><select name="dd2mak_category" id="dd2mak_category">';
    foreach (dd2mak_categories() as $id => $label) {
        echo '<option value="' . esc_attr($id) . '" ' . selected($slug, $id, false) . '>' . esc_html($label) . '</option>';
    }
    echo '</select></td></tr>';
    echo '<tr><th><label for="dd2mak_keywords">키워드</label></th><td>';
    echo '<input type="text" class="regular-text" name="dd2mak_keywords" id="dd2mak_keywords" value="' . esc_attr($keywords) . '">';
    echo '</td></tr>';
    echo '<tr><th><label for="dd2mak_title">제목</label></th><td>';
    echo '<input type="text" class="large-text" name="dd2mak_title" id="dd2mak_title" value="' . esc_attr($title) . '">';
    echo '</td></tr>';
    echo '</tbody></table>';

    echo '<h2>본문</h2>';
    wp_editor($content, 'dd2mak_content', array(
        'textarea_name' => 'dd2mak_content',
        'media_buttons' => false,
        'textarea_rows' => 16,
    ));
    echo '<p>글자 수(태그를 뺀 본문): <strong>' . (int) $count . '</strong>자 · 목표 약 2,000자</p>';
    echo '<p>';
    echo '<button class="button" name="dd2mak_action" value="generate">초안 만들기</button> ';
    echo '<button class="button" name="dd2mak_action" value="save">작성 중 저장</button> ';
    echo '<button class="button button-primary" name="dd2mak_action" value="submit">검수 제출</button>';
    echo '</p>';
    echo '</form></div>';
}

function dd2mak_handle_writer_action() {
    if (!current_user_can('edit_posts')) {
        wp_die('권한이 없습니다.');
    }
    check_admin_referer('dd2mak_writer');

    $user_id = get_current_user_id();
    $action = isset($_POST['dd2mak_action']) ? sanitize_key(wp_unslash($_POST['dd2mak_action'])) : '';
    $post_id = isset($_POST['post_id']) ? (int) $_POST['post_id'] : 0;
    $slug = isset($_POST['dd2mak_category']) ? sanitize_key(wp_unslash($_POST['dd2mak_category'])) : 'health';
    $keywords = isset($_POST['dd2mak_keywords']) ? sanitize_text_field(wp_unslash($_POST['dd2mak_keywords'])) : '';
    $title = isset($_POST['dd2mak_title']) ? sanitize_text_field(wp_unslash($_POST['dd2mak_title'])) : '';
    $content = isset($_POST['dd2mak_content']) ? wp_kses_post(wp_unslash($_POST['dd2mak_content'])) : '';

    $edit_url = admin_url('admin.php?page=dd2mak-writer');

    if ($action === 'generate') {
        if ($post_id > 0) {
            $ai = dd2mak_generate_article($slug, $keywords);
            if (is_wp_error($ai)) {
                dd2mak_set_notice($ai->get_error_message(), 'error');
                wp_safe_redirect($edit_url . ($post_id ? '&post=' . $post_id : ''));
                exit;
            }
            $saved = dd2mak_save_draft($post_id, $ai['title'], $ai['content'], $slug, $user_id);
            if (is_wp_error($saved)) {
                dd2mak_set_notice($saved->get_error_message(), 'error');
                wp_safe_redirect($edit_url . '&post=' . $post_id);
                exit;
            }
            update_post_meta($saved, '_dd2mak_ai_draft', '1');
            update_post_meta($saved, '_dd2mak_keywords', $keywords);
            do_action('dd2mak_after_generate_draft', $saved);
            dd2mak_set_notice('초안을 만들었습니다.');
            wp_safe_redirect($edit_url . '&post=' . $saved);
            exit;
        }
        $r = dd2mak_generate_draft($slug, $keywords, $user_id);
        if (is_wp_error($r)) {
            dd2mak_set_notice($r->get_error_message(), 'error');
            wp_safe_redirect($edit_url);
            exit;
        }
        update_post_meta($r['post_id'], '_dd2mak_keywords', $keywords);
        dd2mak_set_notice('초안을 만들었습니다.');
        wp_safe_redirect($edit_url . '&post=' . (int) $r['post_id']);
        exit;
    }

    if ($action === 'save') {
        $saved = dd2mak_save_draft($post_id, $title, $content, $slug, $user_id);
        if (is_wp_error($saved)) {
            dd2mak_set_notice($saved->get_error_message(), 'error');
            wp_safe_redirect($edit_url . ($post_id ? '&post=' . $post_id : ''));
            exit;
        }
        update_post_meta($saved, '_dd2mak_keywords', $keywords);
        dd2mak_set_notice('저장했습니다.');
        wp_safe_redirect($edit_url . '&post=' . $saved);
        exit;
    }

    if ($action === 'submit') {
        $saved = dd2mak_save_draft($post_id, $title, $content, $slug, $user_id);
        if (is_wp_error($saved)) {
            dd2mak_set_notice($saved->get_error_message(), 'error');
            wp_safe_redirect($edit_url . ($post_id ? '&post=' . $post_id : ''));
            exit;
        }
        update_post_meta($saved, '_dd2mak_keywords', $keywords);
        $sub = dd2mak_submit_for_review($saved, $user_id);
        if (is_wp_error($sub)) {
            dd2mak_set_notice($sub->get_error_message(), 'error');
            wp_safe_redirect($edit_url . '&post=' . $saved);
            exit;
        }
        dd2mak_set_notice('검수에 제출했습니다.');
        wp_safe_redirect(admin_url('admin.php?page=dd2mak-my-posts'));
        exit;
    }

    wp_safe_redirect($edit_url);
    exit;
}

function dd2mak_page_my_posts() {
    if (!current_user_can('edit_posts')) {
        wp_die('권한이 없습니다.');
    }
    echo '<div class="wrap"><h1>내 글</h1>';
    dd2mak_print_notice();
    $q = new WP_Query(array(
        'post_type'      => 'post',
        'author'         => get_current_user_id(),
        'post_status'    => array('draft', 'pending', 'publish'),
        'posts_per_page' => 50,
        'meta_key'       => '_dd2mak_writer',
        'meta_value'     => '1',
        'orderby'        => 'modified',
        'order'          => 'DESC',
    ));
    echo '<table class="widefat striped"><thead><tr><th>제목</th><th>카테고리</th><th>상태</th><th>날짜</th></tr></thead><tbody>';
    if (!$q->have_posts()) {
        echo '<tr><td colspan="4">아직 글이 없습니다.</td></tr>';
    }
    while ($q->have_posts()) {
        $q->the_post();
        $id = get_the_ID();
        $status = get_post_status($id);
        $cats = get_the_category($id);
        $cat_names = array();
        foreach ($cats as $c) {
            $cat_names[] = $c->name;
        }
        $title = get_the_title($id);
        if ($status === 'draft') {
            $title_html = '<a href="' . esc_url(admin_url('admin.php?page=dd2mak-writer&post=' . $id)) . '">' . esc_html($title) . '</a>';
        } else {
            $title_html = esc_html($title);
        }
        echo '<tr>';
        echo '<td>' . $title_html . '</td>';
        echo '<td>' . esc_html(implode(', ', $cat_names)) . '</td>';
        echo '<td>' . esc_html(dd2mak_status_label($status)) . '</td>';
        echo '<td>' . esc_html(get_the_date('', $id)) . '</td>';
        echo '</tr>';
    }
    wp_reset_postdata();
    echo '</tbody></table></div>';
}

function dd2mak_review_list($status, $page, $heading) {
    echo '<div class="wrap"><h1>' . esc_html($heading) . '</h1>';
    dd2mak_print_notice();
    $q = new WP_Query(array(
        'post_type'      => 'post',
        'post_status'    => $status,
        'posts_per_page' => 50,
        'meta_key'       => '_dd2mak_writer',
        'meta_value'     => '1',
        'orderby'        => 'modified',
        'order'          => 'DESC',
    ));
    echo '<table class="widefat striped"><thead><tr><th>제목</th><th>작성자</th><th>카테고리</th><th>날짜</th></tr></thead><tbody>';
    if (!$q->have_posts()) {
        echo '<tr><td colspan="4">글이 없습니다.</td></tr>';
    }
    while ($q->have_posts()) {
        $q->the_post();
        $id = get_the_ID();
        $cats = get_the_category($id);
        $cat_names = array();
        foreach ($cats as $c) {
            $cat_names[] = $c->name;
        }
        $url = admin_url('admin.php?page=' . $page . '&post=' . $id);
        echo '<tr>';
        echo '<td><a href="' . esc_url($url) . '">' . esc_html(get_the_title($id)) . '</a></td>';
        echo '<td>' . esc_html(get_the_author()) . '</td>';
        echo '<td>' . esc_html(implode(', ', $cat_names)) . '</td>';
        echo '<td>' . esc_html(get_the_date('', $id)) . '</td>';
        echo '</tr>';
    }
    wp_reset_postdata();
    echo '</tbody></table></div>';
}

function dd2mak_review_form($post, $mode) {
    $source = (string) get_post_meta($post->ID, '_dd2mak_source', true);
    $reviewed = (string) get_post_meta($post->ID, '_dd2mak_reviewed_at', true);
    if ($reviewed === '') {
        $reviewed = current_time('Y-m-d');
    }
    $caution = (string) get_post_meta($post->ID, '_dd2mak_caution', true);
    $ai = (string) get_post_meta($post->ID, '_dd2mak_ai_draft', true) === '1';
    $count = dd2mak_plain_char_count($post->post_content);

    echo '<div class="wrap"><h1>' . esc_html($mode === 'publish' ? '발행된 글' : '검수') . '</h1>';
    echo '<p><a href="' . esc_url(admin_url('admin.php?page=' . ($mode === 'publish' ? 'dd2mak-published' : 'dd2mak-review'))) . '">&larr; 목록</a></p>';
    dd2mak_print_notice();
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
    wp_nonce_field('dd2mak_review');
    echo '<input type="hidden" name="action" value="dd2mak_review_action">';
    echo '<input type="hidden" name="post_id" value="' . esc_attr($post->ID) . '">';
    echo '<input type="hidden" name="dd2mak_mode" value="' . esc_attr($mode) . '">';
    echo '<table class="form-table"><tbody>';
    echo '<tr><th>제목</th><td><input type="text" class="large-text" name="dd2mak_title" value="' . esc_attr($post->post_title) . '"></td></tr>';
    echo '<tr><th>정보 출처</th><td><input type="text" class="regular-text" name="dd2mak_source" value="' . esc_attr($source) . '"></td></tr>';
    echo '<tr><th>최종 검수일</th><td><input type="date" name="dd2mak_reviewed_at" value="' . esc_attr($reviewed) . '"></td></tr>';
    echo '<tr><th>주의 문구</th><td><textarea name="dd2mak_caution" class="large-text" rows="3">' . esc_textarea($caution) . '</textarea></td></tr>';
    echo '<tr><th>AI 초안</th><td><label><input type="checkbox" name="dd2mak_ai_draft" value="1" ' . checked($ai, true, false) . '> AI 초안 표시 유지</label></td></tr>';
    echo '</tbody></table>';
    echo '<h2>본문</h2>';
    wp_editor($post->post_content, 'dd2mak_content', array(
        'textarea_name' => 'dd2mak_content',
        'media_buttons' => false,
        'textarea_rows' => 16,
    ));
    echo '<p>글자 수(태그를 뺀 본문): <strong>' . (int) $count . '</strong>자</p>';
    echo '<p>';
    echo '<button class="button" name="dd2mak_action" value="save">검수 내용 저장</button> ';
    if ($mode === 'pending') {
        echo '<button class="button button-primary" name="dd2mak_action" value="publish">발행</button>';
    }
    echo '</p></form></div>';
}

function dd2mak_page_review_queue() {
    if (!current_user_can('publish_posts')) {
        wp_die('권한이 없습니다.');
    }
    $post_id = isset($_GET['post']) ? (int) $_GET['post'] : 0;
    if ($post_id) {
        $post = dd2mak_load_writer_post($post_id);
        if (!$post || $post->post_status !== 'pending') {
            wp_die('검수할 수 없는 글입니다.');
        }
        dd2mak_review_form($post, 'pending');
        return;
    }
    dd2mak_review_list('pending', 'dd2mak-review', '검수 대기');
}

function dd2mak_page_published() {
    if (!current_user_can('publish_posts')) {
        wp_die('권한이 없습니다.');
    }
    $post_id = isset($_GET['post']) ? (int) $_GET['post'] : 0;
    if ($post_id) {
        $post = dd2mak_load_writer_post($post_id);
        if (!$post || $post->post_status !== 'publish') {
            wp_die('글을 찾을 수 없습니다.');
        }
        dd2mak_review_form($post, 'publish');
        return;
    }
    dd2mak_review_list('publish', 'dd2mak-published', '발행된 글');
}

function dd2mak_handle_review_action() {
    if (!current_user_can('publish_posts')) {
        wp_die('권한이 없습니다.');
    }
    check_admin_referer('dd2mak_review');

    $post_id = isset($_POST['post_id']) ? (int) $_POST['post_id'] : 0;
    $action = isset($_POST['dd2mak_action']) ? sanitize_key(wp_unslash($_POST['dd2mak_action'])) : '';
    $mode = isset($_POST['dd2mak_mode']) ? sanitize_key(wp_unslash($_POST['dd2mak_mode'])) : 'pending';
    $title = isset($_POST['dd2mak_title']) ? sanitize_text_field(wp_unslash($_POST['dd2mak_title'])) : '';
    $content = isset($_POST['dd2mak_content']) ? wp_kses_post(wp_unslash($_POST['dd2mak_content'])) : '';
    $meta = array(
        'source'      => isset($_POST['dd2mak_source']) ? sanitize_text_field(wp_unslash($_POST['dd2mak_source'])) : '',
        'reviewed_at' => isset($_POST['dd2mak_reviewed_at']) ? sanitize_text_field(wp_unslash($_POST['dd2mak_reviewed_at'])) : '',
        'caution'     => isset($_POST['dd2mak_caution']) ? sanitize_textarea_field(wp_unslash($_POST['dd2mak_caution'])) : '',
        'ai_draft'    => !empty($_POST['dd2mak_ai_draft']),
    );

    $list = $mode === 'publish' ? 'dd2mak-published' : 'dd2mak-review';
    $edit = admin_url('admin.php?page=' . $list . '&post=' . $post_id);

    if ($mode === 'publish') {
        $r = dd2mak_update_published($post_id, $title, $content, $meta);
    } else {
        $r = dd2mak_update_review($post_id, $title, $content, $meta);
    }
    if (is_wp_error($r)) {
        dd2mak_set_notice($r->get_error_message(), 'error');
        wp_safe_redirect($edit);
        exit;
    }

    if ($action === 'publish' && $mode === 'pending') {
        $pub = dd2mak_publish_post($post_id, get_current_user_id());
        if (is_wp_error($pub)) {
            dd2mak_set_notice($pub->get_error_message(), 'error');
            wp_safe_redirect($edit);
            exit;
        }
        dd2mak_set_notice('발행했습니다.');
        wp_safe_redirect(admin_url('admin.php?page=dd2mak-published'));
        exit;
    }

    dd2mak_set_notice('저장했습니다.');
    wp_safe_redirect($edit);
    exit;
}
