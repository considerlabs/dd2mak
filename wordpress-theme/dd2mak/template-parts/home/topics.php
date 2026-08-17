<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$topics = array(
	array( 'slug' => 'health',  'label' => '건강관리',      'icon' => '🩺' ),
	array( 'slug' => 'welfare', 'label' => '복지혜택',      'icon' => '🏛️' ),
	array( 'slug' => 'jobs',    'label' => '일자리·재취업', 'icon' => '💼' ),
	array( 'slug' => 'finance', 'label' => '연금·재무',     'icon' => '💰' ),
	array( 'slug' => 'leisure', 'label' => '여가·배움',     'icon' => '🎨' ),
	array( 'slug' => 'digital', 'label' => '디지털 생활',   'icon' => '📱' ),
);
?>
<section class="section">
	<div class="wrap">
		<div class="section__head">
			<h2 class="section__title">핵심 주제</h2>
		</div>
		<div class="topics-grid">
			<?php foreach ( $topics as $topic ) :
				$term = get_term_by( 'slug', $topic['slug'], 'category' );
				$link = $term ? get_category_link( $term->term_id ) : home_url( '/info-finder/?interest=' . $topic['slug'] );
				?>
				<a class="topic-card" href="<?php echo esc_url( $link ); ?>">
					<span class="topic-card__icon" aria-hidden="true"><?php echo esc_html( $topic['icon'] ); ?></span>
					<span class="topic-card__label"><?php echo esc_html( $topic['label'] ); ?></span>
				</a>
			<?php endforeach; ?>
		</div>
	</div>
</section>
