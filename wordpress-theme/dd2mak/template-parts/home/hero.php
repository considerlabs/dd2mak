<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$phone = get_theme_mod( 'dd2mak_contact_phone', '1588-0000' );
?>
<section class="hero">
	<div class="hero__inner">
		<h1 class="hero__title"><?php echo esc_html( get_theme_mod( 'dd2mak_hero_title', '50세 이후, 건강·일자리·복지 정보를 쉽게 찾으세요' ) ); ?></h1>
		<p class="hero__subtitle"><?php echo esc_html( get_theme_mod( 'dd2mak_hero_subtitle', '시니어를 위한 검증된 정보와 상담을 한곳에서 만나보세요.' ) ); ?></p>
		<div class="hero__actions">
			<a class="btn btn-primary btn-lg" href="<?php echo esc_url( get_theme_mod( 'dd2mak_primary_cta_link', home_url( '/info-finder/' ) ) ); ?>">
				<?php echo esc_html( get_theme_mod( 'dd2mak_primary_cta_text', '내게 맞는 정보 찾기' ) ); ?>
			</a>
			<a class="btn btn-secondary btn-lg" href="tel:<?php echo esc_attr( dd2mak_phone_href( $phone ) ); ?>">
				<?php echo esc_html( get_theme_mod( 'dd2mak_secondary_cta_text', '전화로 상담하기' ) ); ?>
			</a>
		</div>
	</div>
</section>
