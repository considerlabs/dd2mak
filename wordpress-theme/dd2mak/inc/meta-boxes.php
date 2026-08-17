<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * 메타박스 등록
 * - 일반 글(post): 검수일 / 출처 / 전문가 검토 여부 / 주의문구 (NIA 참고: 정보 신뢰 UX)
 * - 일자리·교육 공고(job_posting): 마감일 / 지역 / 활동비 / 대상 / 신청상태 / 신청링크·전화 (서울시50플러스 참고)
 */
function dd2mak_add_meta_boxes() {
	add_meta_box(
		'dd2mak_senior_info',
		'시니어 콘텐츠 신뢰 정보',
		'dd2mak_render_senior_info_box',
		'post',
		'side',
		'default'
	);

	add_meta_box(
		'dd2mak_job_details',
		'일자리·교육 상세 정보',
		'dd2mak_render_job_details_box',
		'job_posting',
		'normal',
		'high'
	);
}
add_action( 'add_meta_boxes', 'dd2mak_add_meta_boxes' );

function dd2mak_render_senior_info_box( $post ) {
	wp_nonce_field( 'dd2mak_save_senior_info', 'dd2mak_senior_info_nonce' );

	$last_reviewed = get_post_meta( $post->ID, '_dd2mak_last_reviewed', true );
	$source        = get_post_meta( $post->ID, '_dd2mak_source', true );
	$reviewed      = get_post_meta( $post->ID, '_dd2mak_expert_reviewed', true );
	$caution       = get_post_meta( $post->ID, '_dd2mak_caution', true );
	?>
	<p>
		<label for="dd2mak_last_reviewed"><strong>최종 검수일</strong></label><br>
		<input type="date" id="dd2mak_last_reviewed" name="dd2mak_last_reviewed" value="<?php echo esc_attr( $last_reviewed ); ?>" style="width:100%;">
	</p>
	<p>
		<label for="dd2mak_source"><strong>정보 출처</strong></label><br>
		<input type="text" id="dd2mak_source" name="dd2mak_source" value="<?php echo esc_attr( $source ); ?>" placeholder="예: 보건복지부, 국민연금공단" style="width:100%;">
	</p>
	<p>
		<label>
			<input type="checkbox" name="dd2mak_expert_reviewed" value="1" <?php checked( $reviewed, '1' ); ?>>
			전문가 검토 완료
		</label>
	</p>
	<p>
		<label for="dd2mak_caution"><strong>주의 문구</strong></label><br>
		<textarea id="dd2mak_caution" name="dd2mak_caution" rows="3" style="width:100%;" placeholder="예: 본 정보는 일반적인 안내이며, 개인 상황에 따라 전문가 상담이 필요할 수 있습니다."><?php echo esc_textarea( $caution ); ?></textarea>
	</p>
	<?php
}

function dd2mak_render_job_details_box( $post ) {
	wp_nonce_field( 'dd2mak_save_job_details', 'dd2mak_job_details_nonce' );

	$deadline    = get_post_meta( $post->ID, '_dd2mak_deadline', true );
	$region      = get_post_meta( $post->ID, '_dd2mak_region', true );
	$cost        = get_post_meta( $post->ID, '_dd2mak_cost', true );
	$target      = get_post_meta( $post->ID, '_dd2mak_target', true );
	$status      = get_post_meta( $post->ID, '_dd2mak_status', true );
	$apply_url   = get_post_meta( $post->ID, '_dd2mak_apply_url', true );
	$apply_phone = get_post_meta( $post->ID, '_dd2mak_apply_phone', true );

	if ( ! $status ) {
		$status = 'open';
	}
	?>
	<table class="form-table">
		<tr>
			<th><label for="dd2mak_deadline">마감일</label></th>
			<td><input type="date" id="dd2mak_deadline" name="dd2mak_deadline" value="<?php echo esc_attr( $deadline ); ?>"></td>
		</tr>
		<tr>
			<th><label for="dd2mak_region">지역</label></th>
			<td><input type="text" id="dd2mak_region" name="dd2mak_region" value="<?php echo esc_attr( $region ); ?>" placeholder="예: 서울 마포구" style="width:100%;"></td>
		</tr>
		<tr>
			<th><label for="dd2mak_cost">활동비 / 비용</label></th>
			<td><input type="text" id="dd2mak_cost" name="dd2mak_cost" value="<?php echo esc_attr( $cost ); ?>" placeholder="예: 무료, 월 30만원" style="width:100%;"></td>
		</tr>
		<tr>
			<th><label for="dd2mak_target">모집 대상</label></th>
			<td><input type="text" id="dd2mak_target" name="dd2mak_target" value="<?php echo esc_attr( $target ); ?>" placeholder="예: 만 50세 이상 서울 거주자" style="width:100%;"></td>
		</tr>
		<tr>
			<th><label for="dd2mak_status">신청 상태</label></th>
			<td>
				<select id="dd2mak_status" name="dd2mak_status">
					<option value="open" <?php selected( $status, 'open' ); ?>>모집중</option>
					<option value="ongoing" <?php selected( $status, 'ongoing' ); ?>>상시모집</option>
					<option value="closed" <?php selected( $status, 'closed' ); ?>>마감</option>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="dd2mak_apply_url">신청 링크</label></th>
			<td><input type="url" id="dd2mak_apply_url" name="dd2mak_apply_url" value="<?php echo esc_attr( $apply_url ); ?>" placeholder="https://" style="width:100%;"></td>
		</tr>
		<tr>
			<th><label for="dd2mak_apply_phone">신청 전화번호</label></th>
			<td><input type="text" id="dd2mak_apply_phone" name="dd2mak_apply_phone" value="<?php echo esc_attr( $apply_phone ); ?>" placeholder="예: 02-1234-5678" style="width:100%;"></td>
		</tr>
	</table>
	<?php
}

function dd2mak_save_meta_boxes( $post_id ) {
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	if ( isset( $_POST['dd2mak_senior_info_nonce'] ) && wp_verify_nonce( $_POST['dd2mak_senior_info_nonce'], 'dd2mak_save_senior_info' ) && current_user_can( 'edit_post', $post_id ) ) {
		update_post_meta( $post_id, '_dd2mak_last_reviewed', sanitize_text_field( wp_unslash( $_POST['dd2mak_last_reviewed'] ?? '' ) ) );
		update_post_meta( $post_id, '_dd2mak_source', sanitize_text_field( wp_unslash( $_POST['dd2mak_source'] ?? '' ) ) );
		update_post_meta( $post_id, '_dd2mak_expert_reviewed', isset( $_POST['dd2mak_expert_reviewed'] ) ? '1' : '' );
		update_post_meta( $post_id, '_dd2mak_caution', sanitize_textarea_field( wp_unslash( $_POST['dd2mak_caution'] ?? '' ) ) );
	}

	if ( isset( $_POST['dd2mak_job_details_nonce'] ) && wp_verify_nonce( $_POST['dd2mak_job_details_nonce'], 'dd2mak_save_job_details' ) && current_user_can( 'edit_post', $post_id ) ) {
		update_post_meta( $post_id, '_dd2mak_deadline', sanitize_text_field( wp_unslash( $_POST['dd2mak_deadline'] ?? '' ) ) );
		update_post_meta( $post_id, '_dd2mak_region', sanitize_text_field( wp_unslash( $_POST['dd2mak_region'] ?? '' ) ) );
		update_post_meta( $post_id, '_dd2mak_cost', sanitize_text_field( wp_unslash( $_POST['dd2mak_cost'] ?? '' ) ) );
		update_post_meta( $post_id, '_dd2mak_target', sanitize_text_field( wp_unslash( $_POST['dd2mak_target'] ?? '' ) ) );
		update_post_meta( $post_id, '_dd2mak_status', sanitize_text_field( wp_unslash( $_POST['dd2mak_status'] ?? 'open' ) ) );
		update_post_meta( $post_id, '_dd2mak_apply_url', esc_url_raw( wp_unslash( $_POST['dd2mak_apply_url'] ?? '' ) ) );
		update_post_meta( $post_id, '_dd2mak_apply_phone', sanitize_text_field( wp_unslash( $_POST['dd2mak_apply_phone'] ?? '' ) ) );
	}
}
add_action( 'save_post', 'dd2mak_save_meta_boxes' );
