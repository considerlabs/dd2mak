<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * 전화번호 문자열 -> tel: 링크용 값 (숫자와 +만 남김)
 */
function dd2mak_phone_href( $phone ) {
	return preg_replace( '/[^0-9+]/', '', (string) $phone );
}

/**
 * 신청 상태 -> 라벨/스타일
 */
function dd2mak_job_status_label( $status ) {
	$map = array(
		'open'    => array( 'label' => '모집중', 'class' => 'job-card__status--open' ),
		'ongoing' => array( 'label' => '상시모집', 'class' => 'job-card__status--open' ),
		'closed'  => array( 'label' => '마감', 'class' => 'job-card__status--closed' ),
	);

	return $map[ $status ] ?? $map['open'];
}

/**
 * 같은 카테고리의 관련 글
 */
function dd2mak_related_posts( $post_id, $count = 3 ) {
	$categories = wp_get_post_categories( $post_id );

	if ( empty( $categories ) ) {
		return new WP_Query( array( 'post__not_in' => array( $post_id ), 'posts_per_page' => $count ) );
	}

	return new WP_Query( array(
		'category__in'   => $categories,
		'post__not_in'   => array( $post_id ),
		'posts_per_page' => $count,
		'ignore_sticky_posts' => true,
	) );
}

/**
 * 목록 카드 (제목 + 요약 + 날짜 + 카테고리) - archive, search, related, popular 등에서 공통 사용
 */
function dd2mak_post_card( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();
	$categories = get_the_category( $post_id );
	$reviewed = get_post_meta( $post_id, '_dd2mak_expert_reviewed', true );
	?>
	<a class="post-card" href="<?php echo esc_url( get_permalink( $post_id ) ); ?>">
		<?php if ( has_post_thumbnail( $post_id ) ) : ?>
			<span class="post-card__thumb" style="background-image:url('<?php echo esc_url( get_the_post_thumbnail_url( $post_id, 'dd2mak-card' ) ); ?>')"></span>
		<?php endif; ?>
		<span class="post-card__body">
			<?php if ( ! empty( $categories ) ) : ?>
				<span class="post-card__cat"><?php echo esc_html( $categories[0]->name ); ?></span>
			<?php endif; ?>
			<span class="post-card__title"><?php echo esc_html( get_the_title( $post_id ) ); ?></span>
			<span class="post-card__excerpt"><?php echo esc_html( wp_trim_words( get_the_excerpt( $post_id ), 20 ) ); ?></span>
			<span class="post-card__meta">
				<span><?php echo esc_html( get_the_date( 'Y.m.d', $post_id ) ); ?></span>
				<?php if ( '1' === $reviewed ) : ?>
					<span class="post-card__review">전문가 검토완료</span>
				<?php endif; ?>
			</span>
		</span>
	</a>
	<?php
}

/**
 * 일자리·교육 공고 카드
 */
function dd2mak_job_card( $post_id = null ) {
	$post_id = $post_id ? $post_id : get_the_ID();

	$deadline = get_post_meta( $post_id, '_dd2mak_deadline', true );
	$region   = get_post_meta( $post_id, '_dd2mak_region', true );
	$cost     = get_post_meta( $post_id, '_dd2mak_cost', true );
	$target   = get_post_meta( $post_id, '_dd2mak_target', true );
	$status   = get_post_meta( $post_id, '_dd2mak_status', true );
	$apply_url   = get_post_meta( $post_id, '_dd2mak_apply_url', true );
	$apply_phone = get_post_meta( $post_id, '_dd2mak_apply_phone', true );

	$status_info = dd2mak_job_status_label( $status );
	?>
	<div class="job-card">
		<span class="job-card__status <?php echo esc_attr( $status_info['class'] ); ?>"><?php echo esc_html( $status_info['label'] ); ?></span>
		<h3 class="job-card__title"><a href="<?php echo esc_url( get_permalink( $post_id ) ); ?>"><?php echo esc_html( get_the_title( $post_id ) ); ?></a></h3>
		<ul class="job-card__facts">
			<?php if ( $deadline ) : ?><li><strong>마감일</strong><?php echo esc_html( date_i18n( 'Y.m.d', strtotime( $deadline ) ) ); ?></li><?php endif; ?>
			<?php if ( $region ) : ?><li><strong>지역</strong><?php echo esc_html( $region ); ?></li><?php endif; ?>
			<?php if ( $cost ) : ?><li><strong>비용</strong><?php echo esc_html( $cost ); ?></li><?php endif; ?>
			<?php if ( $target ) : ?><li><strong>대상</strong><?php echo esc_html( $target ); ?></li><?php endif; ?>
		</ul>
		<div class="job-card__actions">
			<?php if ( $apply_url ) : ?>
				<a class="btn btn-primary" href="<?php echo esc_url( $apply_url ); ?>" target="_blank" rel="noopener">신청하러 가기</a>
			<?php elseif ( $apply_phone ) : ?>
				<a class="btn btn-primary" href="tel:<?php echo esc_attr( dd2mak_phone_href( $apply_phone ) ); ?>"><?php echo esc_html( $apply_phone ); ?>로 신청하기</a>
			<?php else : ?>
				<a class="btn btn-secondary" href="<?php echo esc_url( get_permalink( $post_id ) ); ?>">자세히 보기</a>
			<?php endif; ?>
		</div>
	</div>
	<?php
}

/**
 * primary 메뉴: 카테고리 상위 항목에 WP 하위 카테고리를 하위메뉴로 붙인다.
 * (메뉴에 이미 있는 하위는 유지하고, 없는 것만 추가)
 */
function dd2mak_attach_category_children_to_menu( $items, $args ) {
	if ( empty( $args->theme_location ) || 'primary' !== $args->theme_location || empty( $items ) ) {
		return $items;
	}

	$existing_child_ids = array(); // parent_menu_id => [ category_term_id => true ]
	foreach ( $items as $item ) {
		$parent_id = (int) $item->menu_item_parent;
		if ( $parent_id > 0 && 'category' === $item->object ) {
			$existing_child_ids[ $parent_id ][ (int) $item->object_id ] = true;
		}
	}

	$extra   = array();
	$fake_id = 900000;

	foreach ( $items as $item ) {
		if ( (int) $item->menu_item_parent !== 0 ) {
			continue;
		}
		if ( 'category' !== $item->object ) {
			continue;
		}

		$children = get_categories( array(
			'parent'     => (int) $item->object_id,
			'hide_empty' => false,
			'orderby'    => 'name',
			'order'      => 'ASC',
		) );
		if ( empty( $children ) || is_wp_error( $children ) ) {
			continue;
		}

		$already = isset( $existing_child_ids[ $item->ID ] ) ? $existing_child_ids[ $item->ID ] : array();
		foreach ( $children as $child ) {
			if ( isset( $already[ (int) $child->term_id ] ) ) {
				continue;
			}
			$fake_id++;
			$child_item                   = new stdClass();
			$child_item->ID               = $fake_id;
			$child_item->db_id            = $fake_id;
			$child_item->menu_item_parent = (int) $item->ID;
			$child_item->object_id        = (int) $child->term_id;
			$child_item->object           = 'category';
			$child_item->type             = 'taxonomy';
			$child_item->type_label       = '카테고리';
			$child_item->url              = get_category_link( $child->term_id );
			$child_item->title            = $child->name;
			$child_item->target           = '';
			$child_item->attr_title       = '';
			$child_item->description      = '';
			$child_item->xfn              = '';
			$child_item->status           = '';
			$child_item->classes          = array(
				'menu-item',
				'menu-item-type-taxonomy',
				'menu-item-object-category',
				'menu-item-' . $fake_id,
			);
			$extra[] = $child_item;
		}

		if ( ! in_array( 'menu-item-has-children', (array) $item->classes, true ) ) {
			$item->classes[] = 'menu-item-has-children';
		}
	}

	if ( empty( $extra ) ) {
		return $items;
	}

	return array_merge( $items, $extra );
}
add_filter( 'wp_nav_menu_objects', 'dd2mak_attach_category_children_to_menu', 20, 2 );

/**
 * 간단한 이동 경로(breadcrumb)
 */
function dd2mak_breadcrumb() {
	$items = array( '<a href="' . esc_url( home_url( '/' ) ) . '">홈</a>' );

	if ( is_singular( 'post' ) ) {
		$categories = get_the_category();
		if ( ! empty( $categories ) ) {
			$items[] = '<a href="' . esc_url( get_category_link( $categories[0]->term_id ) ) . '">' . esc_html( $categories[0]->name ) . '</a>';
		}
	} elseif ( is_singular( 'job_posting' ) ) {
		$items[] = '<a href="' . esc_url( get_post_type_archive_link( 'job_posting' ) ) . '">일자리·교육 공고</a>';
	}

	echo '<nav class="breadcrumb" aria-label="이동 경로">' . implode( ' <span aria-hidden="true">›</span> ', $items ) . '</nav>'; // phpcs:ignore WordPress.Security.EscapeOutput
}

/**
 * 핵심 주제 아이콘 (slug 기준)
 */
function dd2mak_topic_icon( $slug ) {
	$map = array(
		'health'     => '🩺',
		'money'      => '💰',
		'care'       => '🤝',
		'life'       => '🎨',
		'work'       => '💼',
		'housing'    => '🏠',
		'news'       => '📰',
		'one-person' => '👤',
		'welfare'    => '🏛️',
		'jobs'       => '💼',
		'finance'    => '💰',
		'leisure'    => '🎨',
		'digital'    => '📱',
	);
	return isset( $map[ $slug ] ) ? $map[ $slug ] : '📌';
}

/**
 * 상단 주메뉴와 동일한 핵심 주제 목록.
 * 1) primary 메뉴의 최상위 카테고리 항목
 * 2) 없으면 하위가 있는 최상위 카테고리
 *
 * @return array<int, array{slug:string,label:string,term_id:int,icon:string}>
 */
function dd2mak_core_topics() {
	static $cache = null;
	if ( null !== $cache ) {
		return $cache;
	}

	$topics   = array();
	$seen     = array();
	$locations = get_nav_menu_locations();

	if ( ! empty( $locations['primary'] ) ) {
		$items = wp_get_nav_menu_items( $locations['primary'] );
		if ( $items ) {
			foreach ( $items as $item ) {
				if ( (int) $item->menu_item_parent !== 0 ) {
					continue;
				}
				if ( 'category' !== $item->object ) {
					continue;
				}
				$term = get_term( (int) $item->object_id, 'category' );
				if ( ! $term || is_wp_error( $term ) || 'uncategorized' === $term->slug ) {
					continue;
				}
				if ( isset( $seen[ $term->term_id ] ) ) {
					continue;
				}
				$seen[ $term->term_id ] = true;
				$topics[] = array(
					'slug'    => $term->slug,
					'label'   => $item->title ? $item->title : $term->name,
					'term_id' => (int) $term->term_id,
					'icon'    => dd2mak_topic_icon( $term->slug ),
				);
			}
		}
	}

	if ( empty( $topics ) ) {
		$parents = get_categories( array(
			'parent'     => 0,
			'hide_empty' => false,
			'exclude'    => array( (int) get_option( 'default_category' ) ),
		) );
		foreach ( $parents as $term ) {
			$children = get_categories( array(
				'parent'     => $term->term_id,
				'hide_empty' => false,
				'number'     => 1,
			) );
			if ( empty( $children ) ) {
				continue;
			}
			$topics[] = array(
				'slug'    => $term->slug,
				'label'   => $term->name,
				'term_id' => (int) $term->term_id,
				'icon'    => dd2mak_topic_icon( $term->slug ),
			);
		}
	}

	$cache = $topics;
	return $cache;
}

/**
 * 핵심 주제(및 하위)에 속한 최신 글 쿼리
 */
function dd2mak_topic_posts_query( $term_id, $posts_per_page = 3 ) {
	return new WP_Query( array(
		'posts_per_page' => $posts_per_page,
		'post_status'    => 'publish',
		'tax_query'      => array(
			array(
				'taxonomy'         => 'category',
				'field'            => 'term_id',
				'terms'            => array( (int) $term_id ),
				'include_children' => true,
			),
		),
		'ignore_sticky_posts' => true,
	) );
}
