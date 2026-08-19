<?php
if ( ! defined( 'ABSPATH' ) ) exit;

define( 'DD2MAK_VERSION', '1.0.2' );

/**
 * 테마 기본 설정
 */
function dd2mak_setup() {
	load_theme_textdomain( 'dd2mak', get_template_directory() . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );
	add_theme_support( 'custom-logo', array(
		'height'      => 80,
		'width'       => 240,
		'flex-height' => true,
		'flex-width'  => true,
	) );

	register_nav_menus( array(
		'primary' => __( '주 메뉴 (1차 메뉴는 6개 이하 권장)', 'dd2mak' ),
		'footer'  => __( '푸터 메뉴', 'dd2mak' ),
	) );

	set_post_thumbnail_size( 640, 400, true );
	add_image_size( 'dd2mak-card', 480, 300, true );
}
add_action( 'after_setup_theme', 'dd2mak_setup' );

/**
 * 스타일 / 스크립트
 */
function dd2mak_scripts() {
	wp_enqueue_style( 'dd2mak-style', get_stylesheet_uri(), array(), DD2MAK_VERSION );
	wp_enqueue_script( 'dd2mak-main', get_template_directory_uri() . '/assets/js/main.js', array(), DD2MAK_VERSION, true );

	if ( is_singular( 'post' ) ) {
		wp_enqueue_script( 'dd2mak-toc', get_template_directory_uri() . '/assets/js/toc.js', array(), DD2MAK_VERSION, true );
	}
}
add_action( 'wp_enqueue_scripts', 'dd2mak_scripts' );

/**
 * 요약(excerpt) 길이 - 카드 목록에서 필요한 만큼만
 */
function dd2mak_excerpt_length( $length ) {
	return 32;
}
add_filter( 'excerpt_length', 'dd2mak_excerpt_length' );

function dd2mak_excerpt_more( $more ) {
	return '…';
}
add_filter( 'excerpt_more', 'dd2mak_excerpt_more' );

/**
 * 하위 파일 포함
 */
require get_template_directory() . '/inc/custom-post-types.php';
require get_template_directory() . '/inc/meta-boxes.php';
require get_template_directory() . '/inc/customizer.php';
require get_template_directory() . '/inc/template-functions.php';
require get_template_directory() . '/inc/easy-writer.php';

/**
 * 카테고리 아카이브 제목에서 "[카테고리:]" 접두어 제거
 */
function dd2mak_archive_title( $title ) {
	if ( is_category() ) {
		return single_cat_title( '', false );
	}
	return $title;
}
add_filter( 'get_the_archive_title', 'dd2mak_archive_title' );

/**
 * 상위 카테고리 목록에도 하위 카테고리 글이 보이도록 한다.
 */
function dd2mak_category_archive_include_children( $query ) {
	if ( is_admin() || ! $query->is_main_query() || ! $query->is_category() ) {
		return;
	}
	$term_id = (int) $query->get_queried_object_id();
	if ( ! $term_id ) {
		return;
	}
	$child_ids = get_term_children( $term_id, 'category' );
	if ( is_wp_error( $child_ids ) || empty( $child_ids ) ) {
		return;
	}
	$ids = array_map( 'intval', array_merge( array( $term_id ), $child_ids ) );
	$query->set( 'category__in', $ids );
	$query->set( 'category_name', '' );
	$query->set( 'cat', '' );
}
add_action( 'pre_get_posts', 'dd2mak_category_archive_include_children' );

/**
 * 쉬운 글쓰기와 동일한 주메뉴·하위메뉴. 글 > 카테고리에 등록되어 2단계 선택에 쓰인다.
 */
function dd2mak_default_category_tree() {
	return array(
		'health'  => array(
			'name'     => '건강관리',
			'children' => array(
				'fall-prevention' => '낙상 예방',
				'checkup'         => '건강검진',
				'medication'      => '복약 관리',
			),
		),
		'welfare' => array(
			'name'     => '복지혜택',
			'children' => array(
				'basic-pension'  => '기초연금',
				'dental'         => '임플란트·틀니',
				'transport'      => '교통·통신',
				'energy-voucher' => '에너지 바우처',
			),
		),
		'jobs'    => array(
			'name'     => '일자리·재취업',
			'children' => array(
				'job-listings'     => '채용정보',
				'senior-jobs'      => '노인일자리',
				'reemployment-edu' => '재취업 교육',
			),
		),
		'finance' => array(
			'name'     => '연금·재무',
			'children' => array(
				'national-pension'   => '국민연금',
				'retirement-finance' => '노후 재무',
			),
		),
		'leisure' => array(
			'name'     => '여가·배움',
			'children' => array(
				'lifelong-learning' => '평생학습',
				'hobby'             => '취미·여가',
			),
		),
		'digital' => array(
			'name'     => '디지털 생활',
			'children' => array(
				'kakaotalk'        => '카카오톡',
				'kiosk'            => '키오스크',
				'mobile-banking'   => '모바일뱅킹',
				'gov24'            => '정부24',
				'scam-prevention'  => '사기 예방',
			),
		),
	);
}

function dd2mak_seed_categories() {
	foreach ( dd2mak_default_category_tree() as $slug => $item ) {
		if ( ! term_exists( $slug, 'category' ) ) {
			wp_insert_term( $item['name'], 'category', array( 'slug' => $slug ) );
		}
		$parent = get_term_by( 'slug', $slug, 'category' );
		if ( ! $parent || is_wp_error( $parent ) ) {
			continue;
		}
		foreach ( $item['children'] as $child_slug => $child_name ) {
			if ( ! term_exists( $child_slug, 'category' ) ) {
				wp_insert_term( $child_name, 'category', array(
					'slug'   => $child_slug,
					'parent' => (int) $parent->term_id,
				) );
			}
		}
	}
}

/**
 * 테마 활성화 시 기본 카테고리(핵심 주제 6개 + 하위) + 정보 찾기 페이지 자동 생성
 */
function dd2mak_after_switch_theme() {
	dd2mak_seed_categories();

	if ( ! get_page_by_path( 'info-finder' ) ) {
		wp_insert_post( array(
			'post_title'    => '나에게 맞는 정보 찾기',
			'post_name'     => 'info-finder',
			'post_status'   => 'publish',
			'post_type'     => 'page',
			'page_template' => 'page-finder.php',
		) );
	}

	flush_rewrite_rules();
}
add_action( 'after_switch_theme', 'dd2mak_after_switch_theme' );

function dd2mak_maybe_seed_category_children() {
	if ( get_option( 'dd2mak_cat_tree_v1' ) ) {
		return;
	}
	dd2mak_seed_categories();
	update_option( 'dd2mak_cat_tree_v1', 1 );
}
add_action( 'init', 'dd2mak_maybe_seed_category_children' );
