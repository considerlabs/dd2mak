<?php
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();
?>

<header class="archive-header">
	<h1>
		<?php
		printf(
			/* translators: %s: 검색어 */
			esc_html__( '"%s" 검색 결과', 'dd2mak' ),
			esc_html( get_search_query() )
		);
		?>
	</h1>
</header>

<div class="archive-list">
	<?php if ( have_posts() ) : ?>
		<div class="card-grid">
			<?php while ( have_posts() ) : the_post(); ?>
				<?php dd2mak_post_card(); ?>
			<?php endwhile; ?>
		</div>

		<div class="pagination">
			<?php the_posts_pagination(); ?>
		</div>
	<?php else : ?>
		<p>검색 결과가 없습니다. 다른 검색어로 다시 시도해 주세요.</p>
	<?php endif; ?>
</div>

<?php get_footer(); ?>
