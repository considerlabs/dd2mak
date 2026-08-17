<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$digital_query = new WP_Query( array(
	'category_name'  => 'digital',
	'posts_per_page' => 3,
) );

if ( $digital_query->have_posts() ) :
	?>
	<section class="section section-alt">
		<div class="wrap">
			<div class="section__head">
				<h2 class="section__title">쉬운 디지털 생활 가이드</h2>
				<?php $cat = get_category_by_slug( 'digital' ); ?>
				<?php if ( $cat ) : ?>
					<a class="section__more" href="<?php echo esc_url( get_category_link( $cat ) ); ?>">전체 보기</a>
				<?php endif; ?>
			</div>
			<div class="card-grid">
				<?php while ( $digital_query->have_posts() ) : $digital_query->the_post(); ?>
					<?php dd2mak_post_card(); ?>
				<?php endwhile; ?>
			</div>
		</div>
	</section>
	<?php
	wp_reset_postdata();
endif;
