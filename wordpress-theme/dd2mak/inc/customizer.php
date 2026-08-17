<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * 커스터마이저: 히어로 문구와 상담 전화번호를 코드 수정 없이 바꿀 수 있도록 노출한다.
 */
function dd2mak_customize_register( $wp_customize ) {
	$wp_customize->add_section( 'dd2mak_options', array(
		'title'    => '시니어 사이트 설정',
		'priority' => 30,
	) );

	$fields = array(
		'dd2mak_hero_title' => array(
			'label'   => '첫 화면 가치 제안 문구',
			'default' => '50세 이후, 건강·일자리·복지 정보를 쉽게 찾으세요',
			'type'    => 'text',
		),
		'dd2mak_hero_subtitle' => array(
			'label'   => '첫 화면 보조 문구',
			'default' => '시니어를 위한 검증된 정보와 상담을 한곳에서 만나보세요.',
			'type'    => 'text',
		),
		'dd2mak_primary_cta_text' => array(
			'label'   => '메인 버튼 문구',
			'default' => '내게 맞는 정보 찾기',
			'type'    => 'text',
		),
		'dd2mak_primary_cta_link' => array(
			'label'   => '메인 버튼 링크',
			'default' => home_url( '/info-finder/' ),
			'type'    => 'url',
		),
		'dd2mak_secondary_cta_text' => array(
			'label'   => '보조 버튼 문구',
			'default' => '전화로 상담하기',
			'type'    => 'text',
		),
		'dd2mak_contact_phone' => array(
			'label'   => '상담 전화번호',
			'default' => '1588-0000',
			'type'    => 'text',
		),
		'dd2mak_contact_title' => array(
			'label'   => '상담 섹션 제목',
			'default' => '무엇을 도와드릴까요?',
			'type'    => 'text',
		),
		'dd2mak_contact_desc' => array(
			'label'   => '상담 섹션 설명',
			'default' => '전화로 편하게 물어보세요. 복지·건강·일자리 상담을 도와드립니다.',
			'type'    => 'text',
		),
	);

	foreach ( $fields as $id => $field ) {
		$sanitize_cb = 'url' === $field['type'] ? 'esc_url_raw' : 'sanitize_text_field';

		$wp_customize->add_setting( $id, array(
			'default'           => $field['default'],
			'sanitize_callback' => $sanitize_cb,
		) );

		$wp_customize->add_control( $id, array(
			'label'   => $field['label'],
			'section' => 'dd2mak_options',
			'type'    => $field['type'],
		) );
	}
}
add_action( 'customize_register', 'dd2mak_customize_register' );
