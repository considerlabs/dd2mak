<?php get_header(); ?>
<article>
  <p class="meta"><?php echo esc_html(wp_strip_all_tags(get_the_category_list(' · '))); ?> · <?php echo esc_html(get_the_date()); ?></p>
  <h1><?php the_title(); ?></h1>
  <?php
  $source = get_post_meta(get_the_ID(), '_dd2mak_source', true);
  $reviewed = get_post_meta(get_the_ID(), '_dd2mak_reviewed_at', true);
  $caution = get_post_meta(get_the_ID(), '_dd2mak_caution', true);
  if ($source || $reviewed || $caution) :
      ?>
  <div class="trust-box">
    <?php if ($source) : ?><div>출처: <?php echo esc_html($source); ?></div><?php endif; ?>
    <?php if ($reviewed) : ?><div>최종 검수일: <?php echo esc_html($reviewed); ?></div><?php endif; ?>
    <?php if ($caution) : ?><div><?php echo esc_html($caution); ?></div><?php endif; ?>
  </div>
  <?php endif; ?>
  <?php the_content(); ?>
</article>
<?php get_footer(); ?>
