<?php
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();
?>

<header class="archive-header">
	<h1>일자리·교육 공고</h1>
	<p class="archive-desc">마감일이 가까운 순으로 정렬됩니다.</p>
</header>

<div class="archive-list">
	<?php if ( have_posts() ) : ?>
		<div class="card-grid">
			<?php while ( have_posts() ) : the_post(); ?>
				<?php dd2mak_job_card(); ?>
			<?php endwhile; ?>
		</div>

		<div class="pagination">
			<?php the_posts_pagination(); ?>
		</div>
	<?php else : ?>
		<p>등록된 공고가 없습니다.</p>
	<?php endif; ?>
</div>

<?php get_footer(); ?>
