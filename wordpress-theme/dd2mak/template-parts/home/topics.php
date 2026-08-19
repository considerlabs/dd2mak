<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$topics = dd2mak_core_topics();
if ( empty( $topics ) ) {
	return;
}
?>
<section class="section">
	<div class="wrap">
		<div class="section__head">
			<h2 class="section__title">핵심 주제</h2>
		</div>
		<div class="topics-grid">
			<?php foreach ( $topics as $topic ) :
				$link = get_category_link( $topic['term_id'] );
				?>
				<a class="topic-card" href="<?php echo esc_url( $link ); ?>">
					<span class="topic-card__icon" aria-hidden="true"><?php echo esc_html( $topic['icon'] ); ?></span>
					<span class="topic-card__label"><?php echo esc_html( $topic['label'] ); ?></span>
				</a>
			<?php endforeach; ?>
		</div>
	</div>
</section>
