<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$finder_page = get_page_by_path( 'info-finder' );
$finder_url  = $finder_page ? get_permalink( $finder_page ) : home_url( '/info-finder/' );
?>
<section class="section">
	<div class="wrap">
		<div class="section__head">
			<h2 class="section__title">나에게 맞는 정보 찾기</h2>
		</div>
		<div class="finder-box">
			<form class="finder-form" action="<?php echo esc_url( $finder_url ); ?>" method="get">
				<div class="finder-field">
					<label for="finder-age">나이대</label>
					<select id="finder-age" name="age">
						<option value="">선택 안 함</option>
						<option value="50">50대</option>
						<option value="60">60대</option>
						<option value="70">70대 이상</option>
					</select>
				</div>
				<div class="finder-field">
					<label for="finder-region">지역</label>
					<input type="text" id="finder-region" name="region" placeholder="예: 서울 마포구">
				</div>
				<div class="finder-field">
					<label for="finder-interest">관심 분야</label>
					<select id="finder-interest" name="interest">
						<option value="health">건강관리</option>
						<option value="welfare">복지혜택</option>
						<option value="jobs">일자리·재취업</option>
						<option value="finance">연금·재무</option>
						<option value="leisure">여가·배움</option>
						<option value="digital">디지털 생활</option>
					</select>
				</div>
				<button type="submit" class="btn btn-primary">정보 찾기</button>
			</form>
		</div>
	</div>
</section>
