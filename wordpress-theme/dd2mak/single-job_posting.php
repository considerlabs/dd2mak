<?php
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();

while ( have_posts() ) : the_post();

	$deadline    = get_post_meta( get_the_ID(), '_dd2mak_deadline', true );
	$region      = get_post_meta( get_the_ID(), '_dd2mak_region', true );
	$cost        = get_post_meta( get_the_ID(), '_dd2mak_cost', true );
	$target      = get_post_meta( get_the_ID(), '_dd2mak_target', true );
	$status      = get_post_meta( get_the_ID(), '_dd2mak_status', true );
	$apply_url   = get_post_meta( get_the_ID(), '_dd2mak_apply_url', true );
	$apply_phone = get_post_meta( get_the_ID(), '_dd2mak_apply_phone', true );
	$status_info = dd2mak_job_status_label( $status );
	?>

	<article <?php post_class(); ?>>

		<header class="article-header">
			<?php dd2mak_breadcrumb(); ?>
			<span class="job-card__status <?php echo esc_attr( $status_info['class'] ); ?>"><?php echo esc_html( $status_info['label'] ); ?></span>
			<h1 class="article-title"><?php the_title(); ?></h1>
		</header>

		<div class="job-detail-box narrow">
			<ul class="job-card__facts">
				<?php if ( $deadline ) : ?><li><strong>마감일</strong><?php echo esc_html( date_i18n( 'Y.m.d', strtotime( $deadline ) ) ); ?></li><?php endif; ?>
				<?php if ( $region ) : ?><li><strong>지역</strong><?php echo esc_html( $region ); ?></li><?php endif; ?>
				<?php if ( $cost ) : ?><li><strong>비용</strong><?php echo esc_html( $cost ); ?></li><?php endif; ?>
				<?php if ( $target ) : ?><li><strong>대상</strong><?php echo esc_html( $target ); ?></li><?php endif; ?>
			</ul>
			<div class="job-card__actions">
				<?php if ( $apply_url ) : ?>
					<a class="btn btn-primary btn-lg" href="<?php echo esc_url( $apply_url ); ?>" target="_blank" rel="noopener">신청하러 가기</a>
				<?php endif; ?>
				<?php if ( $apply_phone ) : ?>
					<a class="btn btn-secondary btn-lg" href="tel:<?php echo esc_attr( dd2mak_phone_href( $apply_phone ) ); ?>"><?php echo esc_html( $apply_phone ); ?>로 신청하기</a>
				<?php endif; ?>
			</div>
		</div>

		<div class="entry-content">
			<?php the_content(); ?>
		</div>

	</article>

<?php endwhile;

get_footer();
