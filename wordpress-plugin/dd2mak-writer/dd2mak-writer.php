<?php
/**
 * Plugin Name: dd2mak 글 등록·검수
 * Description: 시니어 정보글 초안 작성, 검수, 발행. 기존 dd2mak 테마와 함께 사용합니다.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Text Domain: dd2mak-writer
 */

if (!defined('ABSPATH')) {
    exit;
}

define('DD2MAK_WRITER_DIR', plugin_dir_path(__FILE__));
define('DD2MAK_WRITER_FILE', __FILE__);

require DD2MAK_WRITER_DIR . 'inc/helpers.php';
require DD2MAK_WRITER_DIR . 'inc/settings.php';
require DD2MAK_WRITER_DIR . 'inc/ai.php';
require DD2MAK_WRITER_DIR . 'inc/process.php';
require DD2MAK_WRITER_DIR . 'inc/pages.php';

add_action('admin_menu', 'dd2mak_writer_admin_menu');

function dd2mak_writer_admin_menu() {
    $writer_cap = 'edit_posts';
    $review_cap = 'publish_posts';

    add_menu_page(
        '정보글',
        '정보글',
        $writer_cap,
        'dd2mak-writer',
        'dd2mak_page_new_draft',
        'dashicons-edit-large',
        26
    );
    add_submenu_page('dd2mak-writer', '새 초안 작성', '새 초안 작성', $writer_cap, 'dd2mak-writer', 'dd2mak_page_new_draft');
    add_submenu_page('dd2mak-writer', '내 글', '내 글', $writer_cap, 'dd2mak-my-posts', 'dd2mak_page_my_posts');

    add_menu_page(
        '정보글 검수',
        '정보글 검수',
        $review_cap,
        'dd2mak-review',
        'dd2mak_page_review_queue',
        'dashicons-yes-alt',
        27
    );
    add_submenu_page('dd2mak-review', '검수 대기', '검수 대기', $review_cap, 'dd2mak-review', 'dd2mak_page_review_queue');
    add_submenu_page('dd2mak-review', '발행된 글', '발행된 글', $review_cap, 'dd2mak-published', 'dd2mak_page_published');
    add_submenu_page('dd2mak-review', 'AI 설정', 'AI 설정', $review_cap, 'dd2mak-ai-settings', 'dd2mak_page_ai_settings');
}
