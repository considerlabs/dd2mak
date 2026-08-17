<?php
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();
?>

<header class="archive-header">
	<h1><?php the_archive_title(); ?></h1>
	<?php the_archive_description( '<p class="archive-desc">', '</p>' ); ?>
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
