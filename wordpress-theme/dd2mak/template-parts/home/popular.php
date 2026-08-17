<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// 인기글 3개: 고정(sticky) 글을 우선 사용하고, 없으면 최신 글로 대체한다.
$sticky = get_option( 'sticky_posts' );

if ( ! empty( $sticky ) ) {
	$query_args = array(
		'post__in'       => array_slice( $sticky, 0, 3 ),
		'orderby'        => 'post__in',
		'posts_per_page' => 3,
		'ignore_sticky_posts' => true,
	);
} else {
	$query_args = array( 'posts_per_page' => 3 );
}

$popular_query = new WP_Query( $query_args );

if ( $popular_query->have_posts() ) :
	?>
	<section class="section section-alt">
		<div class="wrap">
			<div class="section__head">
				<h2 class="section__title">지금 가장 많이 찾는 정보</h2>
			</div>
			<div class="card-grid">
				<?php while ( $popular_query->have_posts() ) : $popular_query->the_post(); ?>
					<?php dd2mak_post_card(); ?>
				<?php endwhile; ?>
			</div>
		</div>
	</section>
	<?php
	wp_reset_postdata();
endif;
