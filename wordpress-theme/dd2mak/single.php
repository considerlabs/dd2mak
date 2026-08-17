<?php
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();

while ( have_posts() ) : the_post();

	$last_reviewed = get_post_meta( get_the_ID(), '_dd2mak_last_reviewed', true );
	$source        = get_post_meta( get_the_ID(), '_dd2mak_source', true );
	$reviewed      = get_post_meta( get_the_ID(), '_dd2mak_expert_reviewed', true );
	$caution       = get_post_meta( get_the_ID(), '_dd2mak_caution', true );
	$summary       = has_excerpt() ? get_the_excerpt() : wp_trim_words( wp_strip_all_tags( get_the_content() ), 60 );
	?>

	<article <?php post_class(); ?>>

		<header class="article-header">
			<?php dd2mak_breadcrumb(); ?>
			<h1 class="article-title"><?php the_title(); ?></h1>
			<div class="article-meta">
				<span>작성일 <?php echo esc_html( get_the_date( 'Y.m.d' ) ); ?></span>
				<?php if ( $last_reviewed ) : ?>
					<span>최종 검수일 <?php echo esc_html( date_i18n( 'Y.m.d', strtotime( $last_reviewed ) ) ); ?></span>
				<?php endif; ?>
				<?php if ( $source ) : ?>
					<span>출처 <?php echo esc_html( $source ); ?></span>
				<?php endif; ?>
				<?php if ( '1' === $reviewed ) : ?>
					<span class="is-reviewed">✔ 전문가 검토완료</span>
				<?php endif; ?>
			</div>
		</header>

		<?php if ( $summary ) : ?>
			<div class="summary-box">
				<span class="summary-box__label">한눈에 보기</span>
				<?php echo esc_html( $summary ); ?>
			</div>
		<?php endif; ?>

		<div class="toc-box" id="dd2mak-toc">
			<span class="toc-box__label">목차</span>
			<ol></ol>
		</div>

		<div class="entry-content">
			<?php the_content(); ?>
		</div>

		<?php if ( $caution ) : ?>
			<div class="caution-box">
				<span class="caution-box__label">⚠ 주의</span>
				<?php echo esc_html( $caution ); ?>
			</div>
		<?php endif; ?>

	</article>

	<?php
	$related = dd2mak_related_posts( get_the_ID(), 3 );
	if ( $related->have_posts() ) :
		?>
		<section class="related-posts">
			<div class="section__head">
				<h2 class="section__title">다음으로 읽을 글</h2>
			</div>
			<div class="card-grid">
				<?php while ( $related->have_posts() ) : $related->the_post(); ?>
					<?php dd2mak_post_card(); ?>
				<?php endwhile; ?>
			</div>
		</section>
		<?php
		wp_reset_postdata();
	endif;

endwhile;

get_footer();
