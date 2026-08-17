<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$phone = get_theme_mod( 'dd2mak_contact_phone', '1588-0000' );
?>
<section class="contact-section">
	<div class="narrow">
		<h2><?php echo esc_html( get_theme_mod( 'dd2mak_contact_title', '무엇을 도와드릴까요?' ) ); ?></h2>
		<p><?php echo esc_html( get_theme_mod( 'dd2mak_contact_desc', '전화로 편하게 물어보세요. 복지·건강·일자리 상담을 도와드립니다.' ) ); ?></p>
		<a class="phone-number" href="tel:<?php echo esc_attr( dd2mak_phone_href( $phone ) ); ?>"><?php echo esc_html( $phone ); ?></a>
	</div>
</section>
