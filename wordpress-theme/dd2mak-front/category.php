<?php get_header(); ?>
<h1><?php single_cat_title(); ?></h1>
<?php if (have_posts()) : while (have_posts()) : the_post(); ?>
  <article class="post-card">
    <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
    <p class="meta"><?php echo esc_html(get_the_date()); ?></p>
    <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags(get_the_content()), 28, '…')); ?></p>
  </article>
<?php endwhile; else : ?>
  <p>이 주제의 글이 아직 없습니다.</p>
<?php endif; ?>
<?php get_footer(); ?>
