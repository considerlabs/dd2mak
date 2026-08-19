<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$topics = dd2mak_core_topics();
if ( empty( $topics ) ) {
	return;
}

$shown = 0;
foreach ( $topics as $index => $topic ) :
	$query = dd2mak_topic_posts_query( $topic['term_id'], 3 );
	if ( ! $query->have_posts() ) {
		wp_reset_postdata();
		continue;
	}
	$shown++;
	$alt = ( 0 === ( $shown % 2 ) ) ? ' section-alt' : '';
	?>
	<section class="section<?php echo esc_attr( $alt ); ?>">
		<div class="wrap">
			<div class="section__head">
				<h2 class="section__title"><?php echo esc_html( $topic['label'] ); ?></h2>
				<a class="section__more" href="<?php echo esc_url( get_category_link( $topic['term_id'] ) ); ?>">전체 보기</a>
			</div>
			<div class="card-grid">
				<?php while ( $query->have_posts() ) : $query->the_post(); ?>
					<?php dd2mak_post_card(); ?>
				<?php endwhile; ?>
			</div>
		</div>
	</section>
	<?php
	wp_reset_postdata();
endforeach;
