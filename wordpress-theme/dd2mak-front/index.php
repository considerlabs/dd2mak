<?php get_header(); ?>
<section class="hero">
  <h1>50세 이후, 건강·일자리·복지 정보를 쉽게 찾으세요.</h1>
  <p>필요한 주제만 고르면 됩니다.</p>
</section>
<section class="topic-grid" aria-label="핵심 주제">
<?php foreach (dd2mak_front_topics() as $slug => $label) :
    $term = get_term_by('slug', $slug, 'category');
    $link = ($term && !is_wp_error($term)) ? get_category_link($term) : home_url('/');
    ?>
  <a class="topic-card" href="<?php echo esc_url($link); ?>"><?php echo esc_html($label); ?></a>
<?php endforeach; ?>
</section>
<h2>최근 정보</h2>
<?php if (have_posts()) : while (have_posts()) : the_post(); ?>
  <article class="post-card">
    <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
    <p class="meta"><?php echo esc_html(get_the_date()); ?> · <?php echo esc_html(wp_strip_all_tags(get_the_category_list(', '))); ?></p>
    <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags(get_the_content()), 28, '…')); ?></p>
  </article>
<?php endwhile; else : ?>
  <p>아직 발행된 글이 없습니다.</p>
<?php endif; ?>
<?php get_footer(); ?>
