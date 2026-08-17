<?php
/**
 * Template Name: 정보 찾기
 */
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();

$topics = array(
	'health'  => '건강관리',
	'welfare' => '복지혜택',
	'jobs'    => '일자리·재취업',
	'finance' => '연금·재무',
	'leisure' => '여가·배움',
	'digital' => '디지털 생활',
);

$age      = isset( $_GET['age'] ) ? sanitize_text_field( wp_unslash( $_GET['age'] ) ) : '';
$region   = isset( $_GET['region'] ) ? sanitize_text_field( wp_unslash( $_GET['region'] ) ) : '';
$interest = isset( $_GET['interest'] ) && array_key_exists( $_GET['interest'], $topics ) ? sanitize_text_field( wp_unslash( $_GET['interest'] ) ) : '';

while ( have_posts() ) : the_post();
	?>
	<header class="article-header">
		<h1 class="article-title"><?php the_title(); ?></h1>
	</header>

	<div class="entry-content">
		<?php the_content(); ?>
	</div>
	<?php
endwhile;
?>

<section class="section">
	<div class="wrap">
		<div class="finder-box">
			<form class="finder-form" action="<?php echo esc_url( get_permalink() ); ?>" method="get">
				<div class="finder-field">
					<label for="finder-age">나이대</label>
					<select id="finder-age" name="age">
						<option value="">선택 안 함</option>
						<option value="50" <?php selected( $age, '50' ); ?>>50대</option>
						<option value="60" <?php selected( $age, '60' ); ?>>60대</option>
						<option value="70" <?php selected( $age, '70' ); ?>>70대 이상</option>
					</select>
				</div>
				<div class="finder-field">
					<label for="finder-region">지역</label>
					<input type="text" id="finder-region" name="region" value="<?php echo esc_attr( $region ); ?>" placeholder="예: 서울 마포구">
				</div>
				<div class="finder-field">
					<label for="finder-interest">관심 분야</label>
					<select id="finder-interest" name="interest">
						<?php foreach ( $topics as $slug => $label ) : ?>
							<option value="<?php echo esc_attr( $slug ); ?>" <?php selected( $interest, $slug ); ?>><?php echo esc_html( $label ); ?></option>
						<?php endforeach; ?>
					</select>
				</div>
				<button type="submit" class="btn btn-primary">정보 찾기</button>
			</form>
		</div>

		<?php if ( $interest ) :
			$result_query = new WP_Query( array(
				'category_name'  => $interest,
				'posts_per_page' => 9,
			) );
			?>
			<div class="finder-results">
				<div class="finder-results__banner">
					<?php
					$banner = array();
					if ( $age ) { $banner[] = $age . '대'; }
					if ( $region ) { $banner[] = $region; }
					$banner[] = $topics[ $interest ] . ' 관련 정보';
					echo esc_html( implode( ' · ', $banner ) );
					?>
				</div>

				<?php if ( $result_query->have_posts() ) : ?>
					<div class="card-grid">
						<?php while ( $result_query->have_posts() ) : $result_query->the_post(); ?>
							<?php dd2mak_post_card(); ?>
						<?php endwhile; ?>
					</div>
					<?php wp_reset_postdata(); ?>
				<?php else : ?>
					<p>해당 분야의 콘텐츠가 아직 없습니다. 상담 전화로 문의해 주세요.</p>
				<?php endif; ?>
			</div>
		<?php endif; ?>
	</div>
</section>

<?php get_footer(); ?>
