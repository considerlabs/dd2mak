<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();

$term      = get_queried_object();
$term_id   = ( $term && ! is_wp_error( $term ) ) ? (int) $term->term_id : 0;
$is_parent = $term_id && ( 0 === (int) $term->parent );
$children  = $term_id ? get_categories( array(
	'parent'     => $term_id,
	'hide_empty' => false,
	'orderby'    => 'name',
	'order'      => 'ASC',
) ) : array();
?>

<header class="archive-header">
	<?php dd2mak_breadcrumb(); ?>
	<h1 class="archive-title"><?php echo esc_html( single_cat_title( '', false ) ); ?></h1>
	<?php if ( $is_parent && ! empty( $children ) ) : ?>
		<p class="archive-desc">아래에서 관심 있는 하위 주제를 선택하세요. 상단 메뉴에서도 같은 하위 메뉴를 볼 수 있습니다.</p>
	<?php else : ?>
		<?php the_archive_description( '<p class="archive-desc">', '</p>' ); ?>
	<?php endif; ?>
</header>

<?php if ( ! empty( $children ) ) : ?>
	<section class="section category-hub">
		<div class="wrap">
			<div class="section__head">
				<h2 class="section__title">하위 주제</h2>
			</div>
			<div class="topics-grid">
				<?php foreach ( $children as $child ) :
					$count_label = sprintf(
						/* translators: %d: post count */
						_n( '글 %d개', '글 %d개', (int) $child->count, 'dd2mak' ),
						(int) $child->count
					);
					?>
					<a class="topic-card" href="<?php echo esc_url( get_category_link( $child->term_id ) ); ?>">
						<span class="topic-card__icon" aria-hidden="true"><?php echo esc_html( dd2mak_topic_icon( $child->slug ) ); ?></span>
						<span class="topic-card__label"><?php echo esc_html( $child->name ); ?></span>
						<span class="topic-card__meta"><?php echo esc_html( $count_label ); ?></span>
					</a>
				<?php endforeach; ?>
			</div>
		</div>
	</section>
<?php endif; ?>

<div class="archive-list">
	<?php if ( have_posts() ) : ?>
		<?php if ( ! empty( $children ) ) : ?>
			<div class="section__head" style="padding: 0 0 16px;">
				<h2 class="section__title">이 주제의 글</h2>
			</div>
		<?php endif; ?>
		<div class="card-grid">
			<?php
			while ( have_posts() ) :
				the_post();
				dd2mak_post_card();
			endwhile;
			?>
		</div>

		<div class="pagination">
			<?php the_posts_pagination(); ?>
		</div>
	<?php elseif ( empty( $children ) ) : ?>
		<p>등록된 글이 없습니다.</p>
	<?php endif; ?>
</div>

<?php
get_footer();
