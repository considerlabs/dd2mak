<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * '글' 메뉴 하위에 "쉬운 글쓰기" 페이지를 추가한다.
 * 목적: 기본 편집기 대신 단순한 폼으로 글을 작성하게 하고, 제출 시 항상
 * '검토 대기' 상태로 등록해 발행 전 검수를 강제한다 (역할과 무관하게 동일 적용).
 */
function dd2mak_register_easy_writer_page() {
	add_posts_page(
		'쉬운 글쓰기',
		'쉬운 글쓰기',
		'edit_posts',
		'dd2mak-easy-writer',
		'dd2mak_render_easy_writer_page'
	);
}
add_action( 'admin_menu', 'dd2mak_register_easy_writer_page' );

/**
 * 워드프레스 기본 "미분류" 카테고리 ID (글쓰기 폼 선택 목록에서 제외한다).
 */
function dd2mak_easy_writer_uncategorized_id() {
	return (int) get_option( 'default_category' );
}

/**
 * 실제 등록된 워드프레스 카테고리 전체를 slug => 이름으로 반환한다 (검증, AI 프롬프트용).
 * 미분류 카테고리는 제외한다.
 */
function dd2mak_easy_writer_categories() {
	$all = get_categories( array(
		'hide_empty' => false,
		'exclude'    => array( dd2mak_easy_writer_uncategorized_id() ),
	) );

	$out = array();
	foreach ( $all as $term ) {
		$out[ $term->slug ] = $term->name;
	}

	return $out;
}

/**
 * 주메뉴(최상위 카테고리)와, 주메뉴 slug별 하위 카테고리 목록을 반환한다.
 * "쉬운 글쓰기" 폼에서 주메뉴를 고르면 오른쪽 셀렉트에 해당 하위메뉴만 보여주는 데 사용한다.
 * 반환값: array( 'parents' => slug => 이름, 'children' => 주메뉴slug => ( slug => 이름 ) )
 */
function dd2mak_easy_writer_category_tree() {
	$all = get_categories( array(
		'hide_empty' => false,
		'exclude'    => array( dd2mak_easy_writer_uncategorized_id() ),
	) );

	$by_id = array();
	foreach ( $all as $term ) {
		$by_id[ $term->term_id ] = $term;
	}

	$parents  = array();
	$children = array();

	foreach ( $all as $term ) {
		if ( 0 === $term->parent ) {
			$parents[ $term->slug ] = $term->name;
		} elseif ( isset( $by_id[ $term->parent ] ) ) {
			$parent_slug                            = $by_id[ $term->parent ]->slug;
			$children[ $parent_slug ][ $term->slug ] = $term->name;
		}
	}

	return array(
		'parents'  => $parents,
		'children' => $children,
	);
}

/**
 * 선택된 카테고리 slug가 주메뉴인지 하위메뉴인지 판별해 [주메뉴 slug, 하위메뉴 slug]를 반환한다.
 * (검증 실패 후 폼을 다시 보여줄 때 이전 선택을 복원하기 위함)
 */
function dd2mak_easy_writer_resolve_selected_category( $tree, $slug ) {
	if ( ! $slug ) {
		return array( '', '' );
	}

	if ( isset( $tree['parents'][ $slug ] ) ) {
		return array( $slug, '' );
	}

	foreach ( $tree['children'] as $parent_slug => $children ) {
		if ( isset( $children[ $slug ] ) ) {
			return array( $parent_slug, $slug );
		}
	}

	return array( '', '' );
}

function dd2mak_render_easy_writer_page() {
	if ( ! current_user_can( 'edit_posts' ) ) {
		wp_die( '이 페이지에 접근할 권한이 없습니다.' );
	}

	$categories = dd2mak_easy_writer_categories();
	$tree       = dd2mak_easy_writer_category_tree();

	$message         = '';
	$error           = '';
	$posted_title    = '';
	$posted_category = '';
	$posted_content  = '';

	if ( isset( $_POST['dd2mak_easy_writer_nonce'] ) && wp_verify_nonce( $_POST['dd2mak_easy_writer_nonce'], 'dd2mak_submit_easy_post' ) ) {

		$posted_title    = sanitize_text_field( wp_unslash( $_POST['post_title'] ?? '' ) );
		$posted_content  = wp_kses_post( wp_unslash( $_POST['post_content'] ?? '' ) );
		$posted_category = isset( $_POST['post_category'] ) && array_key_exists( $_POST['post_category'], $categories ) ? sanitize_text_field( wp_unslash( $_POST['post_category'] ) ) : '';
		$is_ai_draft     = ! empty( $_POST['dd2mak_is_ai_draft'] );

		if ( ! $posted_title || ! $posted_content || ! $posted_category ) {
			$error = '제목, 카테고리, 본문을 모두 입력해 주세요.';
		} else {
			$term = get_term_by( 'slug', $posted_category, 'category' );

			$post_id = wp_insert_post( array(
				'post_title'    => $posted_title,
				'post_content'  => $posted_content,
				'post_status'   => 'pending',
				'post_type'     => 'post',
				'post_author'   => get_current_user_id(),
				'post_category' => $term ? array( $term->term_id ) : array(),
			), true );

			if ( is_wp_error( $post_id ) ) {
				$error = '글 등록 중 오류가 발생했습니다: ' . esc_html( $post_id->get_error_message() );
			} else {
				update_post_meta( $post_id, '_dd2mak_source', sanitize_text_field( wp_unslash( $_POST['dd2mak_source'] ?? '' ) ) );
				update_post_meta( $post_id, '_dd2mak_last_reviewed', sanitize_text_field( wp_unslash( $_POST['dd2mak_last_reviewed'] ?? '' ) ) );
				update_post_meta( $post_id, '_dd2mak_caution', sanitize_textarea_field( wp_unslash( $_POST['dd2mak_caution'] ?? '' ) ) );

				if ( $is_ai_draft ) {
					update_post_meta( $post_id, '_dd2mak_ai_draft', '1' );
				}

				do_action( 'dd2mak_post_submitted_for_review', $post_id );

				$message         = '글이 제출되었습니다. 검수 후 발행되면 홈페이지 해당 카테고리 메뉴에 자동으로 노출됩니다.';
				$posted_title    = '';
				$posted_category = '';
				$posted_content  = '';
			}
		}
	}

	$ai_enabled = defined( 'DD2MAK_ANTHROPIC_API_KEY' ) && DD2MAK_ANTHROPIC_API_KEY;

	list( $selected_parent, $selected_child ) = dd2mak_easy_writer_resolve_selected_category( $tree, $posted_category );
	?>
	<div class="wrap">
		<h1>쉬운 글쓰기</h1>
		<p>제목, 카테고리, 본문만 입력하면 됩니다. 제출한 글은 자동으로 <strong>검토 대기</strong> 상태가 되며, 검수 담당자가 확인 후 발행하면 자동으로 사이트 메뉴에 노출됩니다.</p>

		<?php if ( $message ) : ?>
			<div class="notice notice-success"><p><?php echo esc_html( $message ); ?></p></div>
		<?php endif; ?>
		<?php if ( $error ) : ?>
			<div class="notice notice-error"><p><?php echo esc_html( $error ); ?></p></div>
		<?php endif; ?>

		<?php if ( ! $ai_enabled ) : ?>
			<div class="notice notice-warning"><p>AI 자동 초안 작성 기능을 사용하려면 <code>wp-config.php</code>에 <code>define('DD2MAK_ANTHROPIC_API_KEY', 'sk-ant-...');</code> 를 추가하세요.</p></div>
		<?php endif; ?>

		<div id="dd2mak-ai-box" style="background:#fff;border:1px solid #dcdcde;border-radius:6px;padding:16px 20px;max-width:760px;margin:16px 0;">
			<h2 style="margin-top:0;font-size:16px;">AI로 초안 작성 (선택)</h2>
			<p style="color:#646970;">키워드나 주제를 입력하고 카테고리를 선택한 뒤 버튼을 누르면 아래 제목·본문에 초안이 채워집니다. <strong>AI 초안은 반드시 사실 확인 후 발행해야 합니다.</strong> 특히 복지·연금 등 금액·기준 관련 내용은 AI가 임의 수치를 만들지 않도록 안내에서 제외했으니, 필요한 경우 검수자가 직접 채워 넣으세요.</p>
			<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
				<input type="text" id="dd2mak_ai_keyword" placeholder="예: 기초연금 신청 방법" style="min-width:280px;padding:8px;">
				<button type="button" id="dd2mak_ai_generate" class="button button-secondary" <?php disabled( ! $ai_enabled ); ?>>AI 초안 생성</button>
				<span id="dd2mak_ai_status" style="color:#646970;"></span>
			</div>
		</div>

		<form method="post" action="" id="dd2mak-easy-writer-form" style="max-width:760px;">
			<?php wp_nonce_field( 'dd2mak_submit_easy_post', 'dd2mak_easy_writer_nonce' ); ?>
			<input type="hidden" name="dd2mak_is_ai_draft" id="dd2mak_is_ai_draft" value="0">

			<table class="form-table">
				<tr>
					<th><label for="post_title">제목</label></th>
					<td><input type="text" id="post_title" name="post_title" class="regular-text" style="width:100%;" value="<?php echo esc_attr( $posted_title ); ?>" required></td>
				</tr>
				<tr>
					<th><label for="post_category_parent">카테고리</label></th>
					<td>
						<select id="post_category_parent" required style="min-width:200px;">
							<option value="">주메뉴 선택</option>
							<?php foreach ( $tree['parents'] as $slug => $name ) : ?>
								<option value="<?php echo esc_attr( $slug ); ?>" <?php selected( $selected_parent, $slug ); ?>><?php echo esc_html( $name ); ?></option>
							<?php endforeach; ?>
						</select>
						<select id="post_category_child" style="min-width:200px;">
							<option value="">먼저 주메뉴를 선택하세요</option>
						</select>
						<input type="hidden" name="post_category" id="post_category_final" value="<?php echo esc_attr( $posted_category ); ?>">
						<p class="description">주메뉴를 고르면 오른쪽에 해당 하위메뉴가 나타납니다. 하위메뉴가 없거나 주메뉴로 바로 등록하려면 "선택 안 함"으로 두세요.</p>
					</td>
				</tr>
				<tr>
					<th><label for="post_content">본문</label></th>
					<td>
						<?php
						wp_editor( $posted_content, 'post_content', array(
							'textarea_name' => 'post_content',
							'textarea_rows' => 16,
							'media_buttons' => true,
						) );
						?>
						<p class="description">소제목은 서식에서 "제목 2"(H2)를 선택하면 글 상단에 목차가 자동 생성됩니다.</p>
					</td>
				</tr>
				<tr>
					<th><label for="dd2mak_source">정보 출처</label></th>
					<td><input type="text" id="dd2mak_source" name="dd2mak_source" class="regular-text" placeholder="예: 보건복지부, 국민연금공단"></td>
				</tr>
				<tr>
					<th><label for="dd2mak_last_reviewed">최종 확인일</label></th>
					<td><input type="date" id="dd2mak_last_reviewed" name="dd2mak_last_reviewed"></td>
				</tr>
				<tr>
					<th><label for="dd2mak_caution">주의 문구</label></th>
					<td><textarea id="dd2mak_caution" name="dd2mak_caution" rows="2" class="large-text"></textarea></td>
				</tr>
			</table>

			<p class="submit">
				<button type="submit" class="button button-primary button-hero">검수 요청하기</button>
			</p>
		</form>
	</div>

	<script>
	( function () {
		var childrenMap = <?php echo str_replace( '</script', '<\/script', wp_json_encode( $tree['children'] ) ); ?>;
		var parentSelect = document.getElementById( 'post_category_parent' );
		var childSelect  = document.getElementById( 'post_category_child' );
		var finalInput   = document.getElementById( 'post_category_final' );

		if ( ! parentSelect || ! childSelect || ! finalInput ) { return; }

		function populateChildren( parentSlug, selectedChildSlug ) {
			childSelect.innerHTML = '';
			var children = childrenMap[ parentSlug ] || {};
			var slugs = Object.keys( children );

			if ( ! parentSlug ) {
				var placeholder = document.createElement( 'option' );
				placeholder.value = '';
				placeholder.textContent = '먼저 주메뉴를 선택하세요';
				childSelect.appendChild( placeholder );
				childSelect.disabled = true;
				return;
			}

			if ( ! slugs.length ) {
				var none = document.createElement( 'option' );
				none.value = '';
				none.textContent = '(하위메뉴 없음)';
				childSelect.appendChild( none );
				childSelect.disabled = true;
				return;
			}

			childSelect.disabled = false;

			var emptyOpt = document.createElement( 'option' );
			emptyOpt.value = '';
			emptyOpt.textContent = '선택 안 함 (주메뉴로 등록)';
			childSelect.appendChild( emptyOpt );

			slugs.forEach( function ( slug ) {
				var opt = document.createElement( 'option' );
				opt.value = slug;
				opt.textContent = children[ slug ];
				if ( slug === selectedChildSlug ) {
					opt.selected = true;
				}
				childSelect.appendChild( opt );
			} );
		}

		function updateFinal() {
			finalInput.value = childSelect.value || parentSelect.value;
		}

		parentSelect.addEventListener( 'change', function () {
			populateChildren( parentSelect.value, '' );
			updateFinal();
		} );
		childSelect.addEventListener( 'change', updateFinal );

		populateChildren( parentSelect.value, '<?php echo esc_js( $selected_child ); ?>' );
		updateFinal();
	} )();
	</script>

	<?php if ( $ai_enabled ) : ?>
	<script>
	( function () {
		var btn = document.getElementById( 'dd2mak_ai_generate' );
		var status = document.getElementById( 'dd2mak_ai_status' );
		var aiFlag = document.getElementById( 'dd2mak_is_ai_draft' );

		if ( ! btn ) { return; }

		btn.addEventListener( 'click', function () {
			var keyword = document.getElementById( 'dd2mak_ai_keyword' ).value.trim();
			var category = document.getElementById( 'post_category_final' ).value;

			if ( ! keyword ) {
				status.textContent = '키워드를 입력해 주세요.';
				return;
			}
			if ( ! category ) {
				status.textContent = '카테고리를 먼저 선택해 주세요.';
				return;
			}

			btn.disabled = true;
			status.textContent = '초안 작성 중... (10~20초 소요)';

			var data = new FormData();
			data.append( 'action', 'dd2mak_generate_draft' );
			data.append( 'nonce', '<?php echo esc_js( wp_create_nonce( 'dd2mak_ai_draft' ) ); ?>' );
			data.append( 'keyword', keyword );
			data.append( 'category', category );

			fetch( ajaxurl, { method: 'POST', credentials: 'same-origin', body: data } )
				.then( function ( res ) { return res.json(); } )
				.then( function ( res ) {
					btn.disabled = false;
					if ( ! res.success ) {
						status.textContent = '오류: ' + ( res.data && res.data.message ? res.data.message : '알 수 없는 오류' );
						return;
					}
					document.getElementById( 'post_title' ).value = res.data.title;
					if ( window.tinymce && window.tinymce.get( 'post_content' ) && ! window.tinymce.get( 'post_content' ).isHidden() ) {
						window.tinymce.get( 'post_content' ).setContent( res.data.content );
					} else {
						document.getElementById( 'post_content' ).value = res.data.content;
					}
					aiFlag.value = '1';
					status.textContent = '초안이 생성되었습니다. 내용을 검토·수정한 뒤 제출하세요.';
				} )
				.catch( function () {
					btn.disabled = false;
					status.textContent = '요청 중 오류가 발생했습니다.';
				} );
		} );
	} )();
	</script>
	<?php endif;
}

/**
 * AI 초안 생성 (Claude API 호출)
 * 사실관계 민감 카테고리(복지·재무 등)는 수치를 지어내지 않도록 시스템 프롬프트에서 명시적으로 차단한다.
 */
function dd2mak_ajax_generate_draft() {
	check_ajax_referer( 'dd2mak_ai_draft', 'nonce' );

	if ( ! current_user_can( 'edit_posts' ) ) {
		wp_send_json_error( array( 'message' => '권한이 없습니다.' ), 403 );
	}

	if ( ! defined( 'DD2MAK_ANTHROPIC_API_KEY' ) || ! DD2MAK_ANTHROPIC_API_KEY ) {
		wp_send_json_error( array( 'message' => 'API 키가 설정되지 않았습니다.' ), 400 );
	}

	$categories = dd2mak_easy_writer_categories();
	$keyword    = isset( $_POST['keyword'] ) ? sanitize_text_field( wp_unslash( $_POST['keyword'] ) ) : '';
	$category   = isset( $_POST['category'] ) && array_key_exists( $_POST['category'], $categories ) ? sanitize_text_field( wp_unslash( $_POST['category'] ) ) : '';

	if ( ! $keyword || ! $category ) {
		wp_send_json_error( array( 'message' => '키워드와 카테고리를 입력해 주세요.' ) );
	}

	$category_label = $categories[ $category ];

	$system_prompt = <<<PROMPT
당신은 50~70대 시니어를 위한 정보형 워드프레스 사이트의 콘텐츠 작가입니다.
다음 규칙을 반드시 지켜 글을 작성하세요.

1. 제목은 질문형이 아닌 행동형으로 작성합니다. (예: "65세 이상이면 확인해봐야 할 복지 혜택")
2. 본문은 반드시 HTML로 작성하고, 소제목은 <h2> 태그를 사용합니다 (목차 자동 생성에 사용됨). 문단은 <p>로 감쌉니다.
3. 문장은 짧고 쉽게 씁니다. 존댓말을 사용합니다.
4. 복지·건강·재무처럼 구체적인 금액·법령·수치가 필요한 내용은 정확한 숫자를 지어내지 말고, "정확한 금액과 대상 기준은 담당 기관(예: 주민센터, 국민연금공단)에서 확인하세요" 같은 안내로 대체합니다. 확인되지 않은 사실을 단정적으로 서술하지 않습니다.
5. 응답은 반드시 아래 JSON 형식으로만 출력합니다. 다른 설명, 코드블록 표시(```) 등은 절대 추가하지 마세요.
{"title": "글 제목", "content": "<h2>...</h2><p>...</p> 형식의 HTML 본문"}
PROMPT;

	$user_prompt = "카테고리: {$category_label}\n키워드/주제: {$keyword}\n위 키워드를 주제로 시니어 대상 글 초안을 작성해 주세요.";

	$response = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
		'timeout' => 45,
		'headers' => array(
			'content-type'      => 'application/json',
			'x-api-key'         => DD2MAK_ANTHROPIC_API_KEY,
			'anthropic-version' => '2023-06-01',
		),
		'body' => wp_json_encode( array(
			'model'      => defined( 'DD2MAK_ANTHROPIC_MODEL' ) ? DD2MAK_ANTHROPIC_MODEL : 'claude-sonnet-5',
			'max_tokens' => 2000,
			'system'     => $system_prompt,
			'messages'   => array(
				array( 'role' => 'user', 'content' => $user_prompt ),
			),
		) ),
	) );

	if ( is_wp_error( $response ) ) {
		wp_send_json_error( array( 'message' => $response->get_error_message() ) );
	}

	$code = wp_remote_retrieve_response_code( $response );
	$body = json_decode( wp_remote_retrieve_body( $response ), true );

	if ( 200 !== $code ) {
		$msg = $body['error']['message'] ?? ( 'API 오류 (코드 ' . $code . ')' );
		wp_send_json_error( array( 'message' => $msg ) );
	}

	$text   = $body['content'][0]['text'] ?? '';
	$parsed = json_decode( $text, true );

	if ( ! $parsed || empty( $parsed['title'] ) || empty( $parsed['content'] ) ) {
		wp_send_json_error( array( 'message' => 'AI 응답을 해석할 수 없습니다. 다시 시도해 주세요.' ) );
	}

	wp_send_json_success( array(
		'title'   => sanitize_text_field( $parsed['title'] ),
		'content' => wp_kses_post( $parsed['content'] ),
	) );
}
add_action( 'wp_ajax_dd2mak_generate_draft', 'dd2mak_ajax_generate_draft' );

/**
 * 검토 대기 글 제출 시 관리자에게 알림 메일 발송
 */
function dd2mak_notify_post_submitted( $post_id ) {
	$post = get_post( $post_id );
	if ( ! $post ) {
		return;
	}

	$admin_email = get_option( 'admin_email' );
	$edit_link   = admin_url( 'post.php?action=edit&post=' . $post_id );
	$is_ai       = get_post_meta( $post_id, '_dd2mak_ai_draft', true ) ? ' (AI 초안 기반 — 사실 확인 필요)' : '';

	wp_mail(
		$admin_email,
		'[검수 요청] 새 글이 등록되었습니다: ' . $post->post_title,
		"새 글이 검토 대기 상태로 등록되었습니다{$is_ai}.\n\n제목: {$post->post_title}\n작성자: " . get_the_author_meta( 'display_name', $post->post_author ) . "\n\n검토하기: {$edit_link}"
	);
}
add_action( 'dd2mak_post_submitted_for_review', 'dd2mak_notify_post_submitted' );

/**
 * 글 목록에 'AI 초안' 여부를 표시해 검수자가 사실 확인 대상을 바로 알아볼 수 있게 한다.
 */
function dd2mak_add_ai_draft_column( $columns ) {
	$columns['dd2mak_ai_draft'] = 'AI 초안';
	return $columns;
}
add_filter( 'manage_post_posts_columns', 'dd2mak_add_ai_draft_column' );

function dd2mak_render_ai_draft_column( $column, $post_id ) {
	if ( 'dd2mak_ai_draft' === $column ) {
		if ( get_post_meta( $post_id, '_dd2mak_ai_draft', true ) ) {
			echo '<span style="color:#b45309;font-weight:600;">⚠ AI 초안</span>';
		} else {
			echo '—';
		}
	}
}
add_action( 'manage_post_posts_custom_column', 'dd2mak_render_ai_draft_column', 10, 2 );
