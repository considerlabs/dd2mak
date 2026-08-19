<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();

$term = get_queried_object();
$term_id = ( $term && ! is_wp_error( $term ) ) ? (int) $term->term_id : 0;
$children = $term_id ? get_categories( array(
	'parent'     => $term_id,
	'hide_empty' => false,
	'orderby'    => 'name',
	'order'      => 'ASC',
) ) : array();
?>

<header class="archive-header">
	<?php dd2mak_breadcrumb(); ?>
	<h1 class="archive-title"><?php echo esc_html( single_cat_title( '', false ) ); ?></h1>
	<?php the_archive_description( '<p class="archive-desc">', '</p>' ); ?>
</header>

<?php if ( ! empty( $children ) ) : ?>
	<nav class="category-children" aria-label="하위 주제">
		<ul class="category-children__list">
			<?php foreach ( $children as $child ) : ?>
				<li>
					<a href="<?php echo esc_url( get_category_link( $child->term_id ) ); ?>">
						<?php echo esc_html( $child->name ); ?>
					</a>
				</li>
			<?php endforeach; ?>
		</ul>
	</nav>
<?php endif; ?>

<div class="archive-list">
	<?php if ( have_posts() ) : ?>
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
	<?php else : ?>
		<p>등록된 글이 없습니다.</p>
	<?php endif; ?>
</div>

<?php
get_footer();
