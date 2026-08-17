<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * 일자리·교육 공고 커스텀 포스트 타입
 * 마감일 / 지역 / 활동비 / 대상 / 신청상태를 별도 메타로 관리한다 (inc/meta-boxes.php).
 */
function dd2mak_register_job_posting_cpt() {
	$labels = array(
		'name'               => '일자리·교육 공고',
		'singular_name'      => '공고',
		'add_new'            => '공고 추가',
		'add_new_item'       => '새 공고 추가',
		'edit_item'          => '공고 수정',
		'new_item'           => '새 공고',
		'view_item'          => '공고 보기',
		'search_items'       => '공고 검색',
		'not_found'          => '등록된 공고가 없습니다',
		'not_found_in_trash' => '휴지통에 공고가 없습니다',
		'menu_name'          => '일자리·교육 공고',
	);

	register_post_type( 'job_posting', array(
		'labels'        => $labels,
		'public'        => true,
		'has_archive'   => 'jobs-edu',
		'rewrite'       => array( 'slug' => 'jobs-edu' ),
		'menu_icon'     => 'dashicons-groups',
		'supports'      => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
		'show_in_rest'  => true,
		'menu_position' => 5,
	) );
}
add_action( 'init', 'dd2mak_register_job_posting_cpt' );

/**
 * 일자리·교육 공고 목록은 마감일이 가까운 순으로 정렬한다.
 */
function dd2mak_job_posting_archive_order( $query ) {
	if ( ! is_admin() && $query->is_main_query() && is_post_type_archive( 'job_posting' ) ) {
		$query->set( 'meta_key', '_dd2mak_deadline' );
		$query->set( 'orderby', 'meta_value' );
		$query->set( 'order', 'ASC' );
	}
}
add_action( 'pre_get_posts', 'dd2mak_job_posting_archive_order' );
