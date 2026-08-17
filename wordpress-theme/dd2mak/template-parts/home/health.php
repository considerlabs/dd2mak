<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$health_query = new WP_Query( array(
	'category_name'  => 'health',
	'posts_per_page' => 3,
	'meta_key'       => '_dd2mak_expert_reviewed',
	'meta_value'     => '1',
) );

if ( $health_query->have_posts() ) :
	?>
	<section class="section">
		<div class="wrap">
			<div class="section__head">
				<h2 class="section__title">전문가 검수 건강 정보</h2>
				<?php $cat = get_category_by_slug( 'health' ); ?>
				<?php if ( $cat ) : ?>
					<a class="section__more" href="<?php echo esc_url( get_category_link( $cat ) ); ?>">전체 보기</a>
				<?php endif; ?>
			</div>
			<div class="card-grid">
				<?php while ( $health_query->have_posts() ) : $health_query->the_post(); ?>
					<?php dd2mak_post_card(); ?>
				<?php endwhile; ?>
			</div>
		</div>
	</section>
	<?php
	wp_reset_postdata();
endif;
