<?php
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();
?>

<section class="section narrow" style="text-align:center;">
	<h1>페이지를 찾을 수 없습니다</h1>
	<p>주소가 변경되었거나 삭제된 페이지입니다.</p>
	<a class="btn btn-primary btn-lg" href="<?php echo esc_url( home_url( '/' ) ); ?>">홈으로 돌아가기</a>
</section>

<?php get_footer(); ?>
