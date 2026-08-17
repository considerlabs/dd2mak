<?php
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();
?>

<header class="archive-header">
	<?php if ( is_home() && ! is_front_page() ) : ?>
		<h1><?php single_post_title(); ?></h1>
	<?php endif; ?>
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
		<p>등록된 글이 없습니다.</p>
	<?php endif; ?>
</div>

<?php get_footer(); ?>
