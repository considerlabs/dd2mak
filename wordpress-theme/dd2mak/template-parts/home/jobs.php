<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$jobs_query = new WP_Query( array(
	'post_type'      => 'job_posting',
	'posts_per_page' => 3,
	'meta_key'       => '_dd2mak_deadline',
	'orderby'        => 'meta_value',
	'order'          => 'ASC',
	'meta_query'     => array(
		array(
			'key'     => '_dd2mak_deadline',
			'value'   => current_time( 'Y-m-d' ),
			'compare' => '>=',
			'type'    => 'DATE',
		),
	),
) );

if ( $jobs_query->have_posts() ) :
	?>
	<section class="section section-alt">
		<div class="wrap">
			<div class="section__head">
				<h2 class="section__title">마감 임박 일자리·교육</h2>
				<a class="section__more" href="<?php echo esc_url( get_post_type_archive_link( 'job_posting' ) ); ?>">전체 보기</a>
			</div>
			<div class="card-grid">
				<?php while ( $jobs_query->have_posts() ) : $jobs_query->the_post(); ?>
					<?php dd2mak_job_card(); ?>
				<?php endwhile; ?>
			</div>
		</div>
	</section>
	<?php
	wp_reset_postdata();
endif;
