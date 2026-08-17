<?php
if (!defined('ABSPATH')) {
    exit;
}

add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    register_nav_menus(array('primary' => '주 메뉴'));
});

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('dd2mak-front', get_stylesheet_uri(), array(), '1.0.0');
});

function dd2mak_front_topics() {
    if (function_exists('dd2mak_categories')) {
        return dd2mak_categories();
    }
    return array(
        'health'   => '건강관리',
        'welfare'  => '복지혜택',
        'jobs'     => '일자리·재취업',
        'finance'  => '연금·재무',
        'leisure'  => '여가·배움',
        'digital'  => '디지털 생활',
    );
}
