# dd2mak Writer Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 `dd2mak` 테마를 건드리지 않는 워드프레스 플러그인으로, 작성자가 카테고리+키워드로 AI 초안(약 2천자)을 제출하고 검수자가 수정한 뒤 발행하면 기존 사이트에 글이 올라가게 한다.

**Architecture:** 관리자 UI는 `inc/pages.php`만 담당하고, 초안 생성·저장·제출·검수·발행은 전부 `inc/process.php`의 독립 함수를 호출한다. AI 호출은 `inc/ai.php`, 키/제공자는 `inc/settings.php`. Phase 2 에이전트는 이 과정 함수(이후 REST)를 그대로 호출하며 Phase 1에서는 구현하지 않는다.

**Tech Stack:** PHP 8+, WordPress 플러그인 API, `wp_remote_post`, Anthropic/OpenAI/Gemini HTTP. 단위 테스트는 WP 없이 `php tests/test-helpers.php`.

## Global Constraints

- 테마 파일(`wordpress-theme/` 등)을 수정하지 않는다.
- 글 유형은 기본 `post`만 사용한다. CPT를 만들지 않는다.
- 작성자(기여자)는 발행할 수 없다. 제출은 항상 `pending`.
- 카테고리 6개만: health, welfare, jobs, finance, leisure, digital.
- AI 제공자: Anthropic / OpenAI / Gemini는 초안 생성. Cursor는 설정에만 두고 초안 생성은 막는다.
- API 키는 옵션에 저장, 화면에는 끝 4자, 로그에 키를 넣지 않는다.
- Phase 1에서 REST·Cursor 에이전트·오케스트레이터를 구현하지 않는다.
- git commit은 사용자가 요청하기 전에는 하지 않는다.

## File map

- Create: `wordpress-plugin/dd2mak-writer/dd2mak-writer.php` — 부트스트랩, 메뉴
- Create: `wordpress-plugin/dd2mak-writer/inc/helpers.php` — 키 마스킹, AI 응답 파싱, 글자 수, 카테고리 맵 (WP 없이 테스트)
- Create: `wordpress-plugin/dd2mak-writer/inc/process.php` — 과정 함수 + `do_action` 훅
- Create: `wordpress-plugin/dd2mak-writer/inc/ai.php` — 제공자 HTTP
- Create: `wordpress-plugin/dd2mak-writer/inc/settings.php` — AI 설정 화면
- Create: `wordpress-plugin/dd2mak-writer/inc/pages.php` — 작성/내글/검수/발행 화면
- Create: `wordpress-plugin/dd2mak-writer/tests/test-helpers.php` — CLI 단위 테스트
- Create: `wordpress-plugin/dd2mak-writer/readme.txt` — 설치 안내

---

### Task 1: 헬퍼와 CLI 테스트

**Files:**
- Create: `wordpress-plugin/dd2mak-writer/inc/helpers.php`
- Create: `wordpress-plugin/dd2mak-writer/tests/test-helpers.php`

**Interfaces:**
- Consumes: 없음
- Produces: `dd2mak_categories()`, `dd2mak_mask_key()`, `dd2mak_plain_char_count()`, `dd2mak_parse_ai_output()`, `dd2mak_system_prompt()`

- [ ] **Step 1: Write the failing test**

Create `wordpress-plugin/dd2mak-writer/tests/test-helpers.php`:

```php
<?php
require dirname(__DIR__) . '/inc/helpers.php';

$fails = 0;
function expect($cond, $msg) {
    global $fails;
    if (!$cond) {
        fwrite(STDERR, "FAIL: $msg\n");
        $fails++;
    }
}

$cats = dd2mak_categories();
expect(count($cats) === 6, '6 categories');
expect($cats['health'] === '건강관리', 'health label');
expect(!isset($cats['uncategorized']), 'no uncategorized');

expect(dd2mak_mask_key('') === '', 'empty key');
expect(dd2mak_mask_key('abcd') === 'abcd', 'short key shown as-is');
expect(dd2mak_mask_key('sk-ant-abcdefghijklmnop') === '****************mnop', 'mask keeps last 4');

$html = '<h2>안녕</h2><p>세상 </p>';
expect(dd2mak_plain_char_count($html) === 6, 'strip tags count 안녕세상 + space? wait');
// 안녕(2) + 세상(2) + space(1) = 5 if one space after strip
expect(dd2mak_plain_char_count('<p>가나다</p>') === 3, '가나다 is 3');

$parsed = dd2mak_parse_ai_output("제목입니다\n\n## 하나\n본문");
expect($parsed['title'] === '제목입니다', 'first line title');
expect(str_contains($parsed['content'], '하나'), 'body has heading');

$prompt = dd2mak_system_prompt();
expect(str_contains($prompt, '2000') || str_contains($prompt, '2,000') || str_contains($prompt, '2천'), 'length rule');
expect(str_contains($prompt, '[확인 필요]'), 'placeholder rule');
expect(str_contains($prompt, '행동형'), 'title rule');

if ($fails > 0) {
    fwrite(STDERR, "$fails failed\n");
    exit(1);
}
echo "OK\n";
```

Fix the first `plain_char_count` assertion in the same file before running: **delete** the line with `안녕세상` and keep only `가나다 === 3`.

- [ ] **Step 2: Run test to verify it fails**

Run: `php wordpress-plugin/dd2mak-writer/tests/test-helpers.php`

Expected: FAIL with "Failed opening required ... helpers.php" or "Call to undefined function"

- [ ] **Step 3: Write minimal implementation**

Create `wordpress-plugin/dd2mak-writer/inc/helpers.php`:

```php
<?php
if (!defined('ABSPATH') && php_sapi_name() !== 'cli') {
    exit;
}

function dd2mak_categories() {
    return array(
        'health'   => '건강관리',
        'welfare'  => '복지혜택',
        'jobs'     => '일자리·재취업',
        'finance'  => '연금·재무',
        'leisure'  => '여가·배움',
        'digital'  => '디지털 생활',
    );
}

function dd2mak_mask_key($key) {
    $key = (string) $key;
    if ($key === '') {
        return '';
    }
    $len = strlen($key);
    if ($len <= 4) {
        return $key;
    }
    return str_repeat('*', $len - 4) . substr($key, -4);
}

function dd2mak_plain_char_count($html) {
    $text = html_entity_decode(strip_tags((string) $html), ENT_QUOTES, 'UTF-8');
    $text = preg_replace('/\s+/u', ' ', trim($text));
    if (function_exists('mb_strlen')) {
        return mb_strlen($text, 'UTF-8');
    }
    return strlen($text);
}

function dd2mak_parse_ai_output($raw) {
    $raw = trim((string) $raw);
    $raw = preg_replace('/^```(?:html|markdown)?\s*/i', '', $raw);
    $raw = preg_replace('/```$/', '', $raw);
    $lines = preg_split("/\r\n|\n|\r/", $raw);
    $title = '';
    while ($lines && trim($lines[0]) === '') {
        array_shift($lines);
    }
    if ($lines) {
        $title = trim(preg_replace('/^#+\s*/', '', array_shift($lines)));
        $title = trim($title, '"“”');
    }
    $content = trim(implode("\n", $lines));
    $content = preg_replace('/^##\s+(.+)$/m', '<h2>$1</h2>', $content);
    $content = preg_replace('/\n{2,}/', "</p>\n<p>", $content);
    if ($content !== '' && strpos($content, '<h2>') !== 0) {
        $content = '<p>' . $content . '</p>';
    }
    return array(
        'title'   => $title,
        'content' => $content,
    );
}

function dd2mak_system_prompt() {
    return <<<'PROMPT'
당신은 50~70대 독자에게 생활 정보를 전하는 한국어 필자입니다.
쉬운 말을 쓰고, 가벼운 재치(짧은 비유나 한마디)만 넣습니다. 말장난과 영어 말장난은 쓰지 않습니다.
제목은 질문형이 아니라 행동형 한 줄입니다.
본문은 HTML 없이 쓰되 소제목은 ## 로 3~6개 둡니다. 디지털 생활이면 3~5단계로 나눕니다.
본문 분량은 한글 기준 약 2,000자(공백 포함, 목표 1,800~2,200자)입니다.
복지·의료·연금액 등 수치는 지어내지 마세요. 확인이 필요하면 [확인 필요]를 남기세요.
첫 줄은 제목만, 빈 줄 다음부터 본문만 출력하세요.
PROMPT;
}
```

Adjust `dd2mak_parse_ai_output` so the test `str_contains($parsed['content'], '하나')` passes even after converting `## 하나` to `<h2>하나</h2>`.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `php wordpress-plugin/dd2mak-writer/tests/test-helpers.php`

Expected: `OK`

- [ ] **Step 5: Commit**

Skip unless the user asked to commit.

---

### Task 2: 플러그인 부트스트랩과 역할별 메뉴

**Files:**
- Create: `wordpress-plugin/dd2mak-writer/dd2mak-writer.php`

**Interfaces:**
- Consumes: `dd2mak_categories()` from helpers (loaded)
- Produces: 플러그인 헤더, `DD2MAK_WRITER_DIR`, 메뉴 훅 `dd2mak_writer_admin_menu`

- [ ] **Step 1: Create plugin bootstrap**

Create `wordpress-plugin/dd2mak-writer/dd2mak-writer.php`:

```php
<?php
/**
 * Plugin Name: dd2mak 글 등록·검수
 * Description: 시니어 정보글 초안 작성, 검수, 발행. 기존 dd2mak 테마와 함께 사용합니다.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Text Domain: dd2mak-writer
 */

if (!defined('ABSPATH')) {
    exit;
}

define('DD2MAK_WRITER_DIR', plugin_dir_path(__FILE__));
define('DD2MAK_WRITER_FILE', __FILE__);

require DD2MAK_WRITER_DIR . 'inc/helpers.php';
require DD2MAK_WRITER_DIR . 'inc/settings.php';
require DD2MAK_WRITER_DIR . 'inc/ai.php';
require DD2MAK_WRITER_DIR . 'inc/process.php';
require DD2MAK_WRITER_DIR . 'inc/pages.php';

add_action('admin_menu', 'dd2mak_writer_admin_menu');

function dd2mak_writer_admin_menu() {
    $writer_cap = 'edit_posts';
    $review_cap = 'publish_posts';

    add_menu_page(
        '정보글',
        '정보글',
        $writer_cap,
        'dd2mak-writer',
        'dd2mak_page_new_draft',
        'dashicons-edit-large',
        26
    );
    add_submenu_page('dd2mak-writer', '새 초안 작성', '새 초안 작성', $writer_cap, 'dd2mak-writer', 'dd2mak_page_new_draft');
    add_submenu_page('dd2mak-writer', '내 글', '내 글', $writer_cap, 'dd2mak-my-posts', 'dd2mak_page_my_posts');

    add_menu_page(
        '정보글 검수',
        '정보글 검수',
        $review_cap,
        'dd2mak-review',
        'dd2mak_page_review_queue',
        'dashicons-yes-alt',
        27
    );
    add_submenu_page('dd2mak-review', '검수 대기', '검수 대기', $review_cap, 'dd2mak-review', 'dd2mak_page_review_queue');
    add_submenu_page('dd2mak-review', '발행된 글', '발행된 글', $review_cap, 'dd2mak-published', 'dd2mak_page_published');
    add_submenu_page('dd2mak-review', 'AI 설정', 'AI 설정', $review_cap, 'dd2mak-ai-settings', 'dd2mak_page_ai_settings');
}
```

Until later tasks exist, `inc/settings.php`, `inc/ai.php`, `inc/process.php`, `inc/pages.php` must exist as stubs so PHP lint passes:

```php
<?php
if (!defined('ABSPATH')) {
    exit;
}
```

And in `inc/pages.php` add empty page callbacks:

```php
<?php
if (!defined('ABSPATH')) {
    exit;
}
function dd2mak_page_new_draft() { echo '<div class="wrap"><h1>새 초안 작성</h1></div>'; }
function dd2mak_page_my_posts() { echo '<div class="wrap"><h1>내 글</h1></div>'; }
function dd2mak_page_review_queue() { echo '<div class="wrap"><h1>검수 대기</h1></div>'; }
function dd2mak_page_published() { echo '<div class="wrap"><h1>발행된 글</h1></div>'; }
```

`dd2mak_page_ai_settings` is defined in settings.php in Task 3; for now add a stub in `inc/settings.php`:

```php
<?php
if (!defined('ABSPATH')) {
    exit;
}
function dd2mak_page_ai_settings() { echo '<div class="wrap"><h1>AI 설정</h1></div>'; }
```

- [ ] **Step 2: Lint**

Run: `php -l wordpress-plugin/dd2mak-writer/dd2mak-writer.php`

Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

Skip unless the user asked to commit.

---

### Task 3: AI 설정 저장과 화면

**Files:**
- Modify: `wordpress-plugin/dd2mak-writer/inc/settings.php`

**Interfaces:**
- Consumes: `dd2mak_mask_key()`
- Produces: `dd2mak_get_active_provider()`, `dd2mak_get_api_key($provider)`, `dd2mak_save_ai_settings()`, `dd2mak_page_ai_settings()`, option keys `dd2mak_ai_provider`, `dd2mak_ai_keys` (array, autoload no)

- [ ] **Step 1: Replace settings stub**

`inc/settings.php` full contents:

```php
<?php
if (!defined('ABSPATH')) {
    exit;
}

function dd2mak_providers() {
    return array(
        'anthropic' => 'Anthropic',
        'openai'    => 'OpenAI',
        'gemini'    => 'Gemini',
        'cursor'    => 'Cursor',
    );
}

function dd2mak_get_active_provider() {
    $p = get_option('dd2mak_ai_provider', 'anthropic');
    return isset(dd2mak_providers()[ $p ]) ? $p : 'anthropic';
}

function dd2mak_get_api_key($provider) {
    $keys = get_option('dd2mak_ai_keys', array());
    if (!is_array($keys)) {
        $keys = array();
    }
    $key = isset($keys[ $provider ]) ? (string) $keys[ $provider ] : '';
    if ($key === '' && $provider === 'anthropic' && defined('DD2MAK_ANTHROPIC_API_KEY')) {
        return DD2MAK_ANTHROPIC_API_KEY;
    }
    return $key;
}

function dd2mak_page_ai_settings() {
    if (!current_user_can('publish_posts')) {
        wp_die('권한이 없습니다.');
    }
    $notice = '';
    if (isset($_POST['dd2mak_ai_save']) && check_admin_referer('dd2mak_ai_settings')) {
        $provider = isset($_POST['dd2mak_provider']) ? sanitize_key(wp_unslash($_POST['dd2mak_provider'])) : 'anthropic';
        if (!isset(dd2mak_providers()[ $provider ])) {
            $provider = 'anthropic';
        }
        $keys = get_option('dd2mak_ai_keys', array());
        if (!is_array($keys)) {
            $keys = array();
        }
        foreach (array_keys(dd2mak_providers()) as $id) {
            $field = 'dd2mak_key_' . $id;
            if (!isset($_POST[ $field ])) {
                continue;
            }
            $incoming = trim((string) wp_unslash($_POST[ $field ]));
            if ($incoming === '' || strpos($incoming, '*') !== false) {
                continue;
            }
            $keys[ $id ] = $incoming;
        }
        update_option('dd2mak_ai_provider', $provider, false);
        update_option('dd2mak_ai_keys', $keys, false);
        $notice = '저장했습니다.';
    }
    $provider = dd2mak_get_active_provider();
    echo '<div class="wrap"><h1>AI 설정</h1>';
    if ($notice) {
        echo '<div class="notice notice-success"><p>' . esc_html($notice) . '</p></div>';
    }
    echo '<form method="post">';
    wp_nonce_field('dd2mak_ai_settings');
    echo '<table class="form-table">';
    echo '<tr><th>사용할 제공자</th><td>';
    foreach (dd2mak_providers() as $id => $label) {
        echo '<label style="display:block;margin-bottom:6px"><input type="radio" name="dd2mak_provider" value="' . esc_attr($id) . '" ' . checked($provider, $id, false) . '> ' . esc_html($label) . '</label>';
    }
    echo '</td></tr>';
    foreach (dd2mak_providers() as $id => $label) {
        $masked = dd2mak_mask_key(dd2mak_get_api_key($id));
        echo '<tr><th>' . esc_html($label) . ' API 키</th><td>';
        echo '<input type="password" autocomplete="new-password" name="dd2mak_key_' . esc_attr($id) . '" value="' . esc_attr($masked) . '" class="regular-text">';
        echo '<p class="description">저장 후 끝 4자만 보입니다. 바꾸려면 새 키를 넣으세요.</p>';
        echo '</td></tr>';
    }
    echo '</table>';
    echo '<p><button class="button button-primary" name="dd2mak_ai_save" value="1">저장</button></p>';
    echo '</form></div>';
}
```

Do not add a working "연결 확인" HTTP call until Task 4's `dd2mak_ping_provider` exists. Add the button in Task 4.

- [ ] **Step 2: Lint**

Run: `php -l wordpress-plugin/dd2mak-writer/inc/settings.php`

Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

Skip unless the user asked to commit.

---

### Task 4: 과정 함수 (에이전트 계약)

**Files:**
- Modify: `wordpress-plugin/dd2mak-writer/inc/process.php`

**Interfaces:**
- Consumes: `dd2mak_categories()`, later `dd2mak_generate_article()`
- Produces:
  - `dd2mak_ensure_category($slug) : int` term_id
  - `dd2mak_save_draft($post_id, $title, $content, $category_slug, $author_id) : int|\WP_Error`
  - `dd2mak_submit_for_review($post_id, $user_id) : true|\WP_Error`
  - `dd2mak_update_review($post_id, $title, $content, $meta) : true|\WP_Error`
  - `dd2mak_publish_post($post_id, $user_id) : true|\WP_Error`
  - `dd2mak_generate_draft($category_slug, $keywords, $author_id) : array|\WP_Error` with `post_id`, `title`, `content`

Hooks after success (no listeners in Phase 1): `dd2mak_after_generate_draft`, `dd2mak_after_save_draft`, `dd2mak_after_submit_for_review`, `dd2mak_after_update_review`, `dd2mak_after_publish_post`. Each receives `$post_id`.

- [ ] **Step 1: Implement process.php**

```php
<?php
if (!defined('ABSPATH')) {
    exit;
}

function dd2mak_is_writer_post($post_id) {
    return (string) get_post_meta($post_id, '_dd2mak_writer', true) === '1';
}

function dd2mak_ensure_category($slug) {
    $cats = dd2mak_categories();
    if (!isset($cats[ $slug ])) {
        return new WP_Error('bad_cat', '허용되지 않은 카테고리입니다.');
    }
    $term = get_term_by('slug', $slug, 'category');
    if ($term && !is_wp_error($term)) {
        return (int) $term->term_id;
    }
    $found = get_term_by('name', $cats[ $slug ], 'category');
    if ($found && !is_wp_error($found)) {
        return (int) $found->term_id;
    }
    $created = wp_insert_term($cats[ $slug ], 'category', array('slug' => $slug));
    if (is_wp_error($created)) {
        return $created;
    }
    return (int) $created['term_id'];
}

function dd2mak_save_draft($post_id, $title, $content, $category_slug, $author_id) {
    $title = sanitize_text_field($title);
    if ($title === '') {
        return new WP_Error('no_title', '제목을 입력하세요.');
    }
    $term_id = dd2mak_ensure_category($category_slug);
    if (is_wp_error($term_id)) {
        return $term_id;
    }
    $data = array(
        'post_title'   => $title,
        'post_content' => wp_kses_post($content),
        'post_status'  => 'draft',
        'post_type'    => 'post',
        'post_author'  => (int) $author_id,
        'meta_input'   => array('_dd2mak_writer' => '1'),
    );
    if ((int) $post_id > 0) {
        $post = get_post($post_id);
        if (!$post || $post->post_author != $author_id || $post->post_status !== 'draft' || !dd2mak_is_writer_post($post_id)) {
            return new WP_Error('forbidden', '이 글을 저장할 수 없습니다.');
        }
        $data['ID'] = (int) $post_id;
        $id = wp_update_post($data, true);
    } else {
        $id = wp_insert_post($data, true);
    }
    if (is_wp_error($id)) {
        return $id;
    }
    wp_set_post_categories($id, array($term_id));
    do_action('dd2mak_after_save_draft', $id);
    return (int) $id;
}

function dd2mak_submit_for_review($post_id, $user_id) {
    $post = get_post($post_id);
    if (!$post || !dd2mak_is_writer_post($post_id) || (int) $post->post_author !== (int) $user_id || $post->post_status !== 'draft') {
        return new WP_Error('forbidden', '제출할 수 없는 글입니다.');
    }
    if ($post->post_title === '') {
        return new WP_Error('no_title', '제목을 입력하세요.');
    }
    $r = wp_update_post(array('ID' => (int) $post_id, 'post_status' => 'pending'), true);
    if (is_wp_error($r)) {
        return $r;
    }
    do_action('dd2mak_after_submit_for_review', (int) $post_id);
    return true;
}

function dd2mak_update_review($post_id, $title, $content, $meta) {
    $post = get_post($post_id);
    if (!$post || !dd2mak_is_writer_post($post_id) || $post->post_status !== 'pending') {
        return new WP_Error('forbidden', '검수할 수 없는 글입니다.');
    }
    $title = sanitize_text_field($title);
    if ($title === '') {
        return new WP_Error('no_title', '제목을 입력하세요.');
    }
    $r = wp_update_post(array(
        'ID'           => (int) $post_id,
        'post_title'   => $title,
        'post_content' => wp_kses_post($content),
        'post_status'  => 'pending',
    ), true);
    if (is_wp_error($r)) {
        return $r;
    }
    if (isset($meta['source'])) {
        update_post_meta($post_id, '_dd2mak_source', sanitize_text_field($meta['source']));
    }
    if (isset($meta['reviewed_at'])) {
        update_post_meta($post_id, '_dd2mak_reviewed_at', sanitize_text_field($meta['reviewed_at']));
    }
    if (isset($meta['caution'])) {
        update_post_meta($post_id, '_dd2mak_caution', sanitize_textarea_field($meta['caution']));
    }
    if (array_key_exists('ai_draft', $meta)) {
        update_post_meta($post_id, '_dd2mak_ai_draft', $meta['ai_draft'] ? '1' : '');
    }
    do_action('dd2mak_after_update_review', (int) $post_id);
    return true;
}

function dd2mak_publish_post($post_id, $user_id) {
    if (!user_can($user_id, 'publish_posts')) {
        return new WP_Error('forbidden', '발행 권한이 없습니다.');
    }
    $post = get_post($post_id);
    if (!$post || !dd2mak_is_writer_post($post_id) || $post->post_status !== 'pending') {
        return new WP_Error('forbidden', '발행할 수 없는 글입니다.');
    }
    $r = wp_update_post(array('ID' => (int) $post_id, 'post_status' => 'publish'), true);
    if (is_wp_error($r)) {
        return $r;
    }
    do_action('dd2mak_after_publish_post', (int) $post_id);
    return true;
}

function dd2mak_generate_draft($category_slug, $keywords, $author_id) {
    $keywords = sanitize_text_field($keywords);
    if ($keywords === '') {
        return new WP_Error('no_kw', '키워드를 입력하세요.');
    }
    $term_id = dd2mak_ensure_category($category_slug);
    if (is_wp_error($term_id)) {
        return $term_id;
    }
    $ai = dd2mak_generate_article($category_slug, $keywords);
    if (is_wp_error($ai)) {
        return $ai;
    }
    $id = dd2mak_save_draft(0, $ai['title'], $ai['content'], $category_slug, $author_id);
    if (is_wp_error($id)) {
        return $id;
    }
    update_post_meta($id, '_dd2mak_ai_draft', '1');
    do_action('dd2mak_after_generate_draft', $id);
    return array(
        'post_id' => $id,
        'title'   => $ai['title'],
        'content' => $ai['content'],
    );
}
```

- [ ] **Step 2: Lint**

Run: `php -l wordpress-plugin/dd2mak-writer/inc/process.php`

Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

Skip unless the user asked to commit.

---

### Task 5: AI 제공자 호출

**Files:**
- Modify: `wordpress-plugin/dd2mak-writer/inc/ai.php`
- Modify: `wordpress-plugin/dd2mak-writer/inc/settings.php` (연결 확인)

**Interfaces:**
- Consumes: `dd2mak_get_active_provider()`, `dd2mak_get_api_key()`, `dd2mak_system_prompt()`, `dd2mak_parse_ai_output()`, `dd2mak_categories()`
- Produces: `dd2mak_generate_article($category_slug, $keywords) : array{title,content}|\WP_Error`, `dd2mak_ping_provider($provider) : true|\WP_Error`

- [ ] **Step 1: Implement ai.php**

```php
<?php
if (!defined('ABSPATH')) {
    exit;
}

function dd2mak_default_model($provider) {
    $map = array(
        'anthropic' => 'claude-sonnet-4-20250514',
        'openai'    => 'gpt-4o',
        'gemini'    => 'gemini-2.0-flash',
    );
    return isset($map[ $provider ]) ? $map[ $provider ] : '';
}

function dd2mak_user_prompt($category_slug, $keywords) {
    $cats = dd2mak_categories();
    $label = isset($cats[ $category_slug ]) ? $cats[ $category_slug ] : $category_slug;
    return "카테고리: {$label}\n키워드: {$keywords}\n위 주제로 글을 작성하세요.";
}

function dd2mak_generate_article($category_slug, $keywords) {
    $provider = dd2mak_get_active_provider();
    if ($provider === 'cursor') {
        return new WP_Error('cursor', 'Cursor는 이 서버에서 초안 생성에 쓸 수 없습니다. Anthropic, OpenAI, Gemini 중 하나를 선택하세요.');
    }
    $key = dd2mak_get_api_key($provider);
    if ($key === '') {
        return new WP_Error('no_key', 'API 키가 없습니다. 검수자 메뉴의 AI 설정에서 키를 저장하세요.');
    }
    $system = dd2mak_system_prompt();
    $user   = dd2mak_user_prompt($category_slug, $keywords);
    if ($provider === 'anthropic') {
        $raw = dd2mak_call_anthropic($key, $system, $user);
    } elseif ($provider === 'openai') {
        $raw = dd2mak_call_openai($key, $system, $user);
    } elseif ($provider === 'gemini') {
        $raw = dd2mak_call_gemini($key, $system, $user);
    } else {
        return new WP_Error('bad_provider', '알 수 없는 제공자입니다.');
    }
    if (is_wp_error($raw)) {
        return $raw;
    }
    $parsed = dd2mak_parse_ai_output($raw);
    if ($parsed['title'] === '' || $parsed['content'] === '') {
        return new WP_Error('parse', '초안을 해석하지 못했습니다. 다시 시도하세요.');
    }
    return $parsed;
}

function dd2mak_http_error($res) {
    if (is_wp_error($res)) {
        return $res;
    }
    $code = wp_remote_retrieve_response_code($res);
    $body = wp_remote_retrieve_body($res);
    if ($code < 200 || $code >= 300) {
        $msg = wp_strip_all_tags(substr($body, 0, 300));
        return new WP_Error('http', 'AI 호출 실패 (' . $code . '): ' . $msg);
    }
    return $body;
}

function dd2mak_call_anthropic($key, $system, $user) {
    $res = wp_remote_post('https://api.anthropic.com/v1/messages', array(
        'timeout' => 60,
        'headers' => array(
            'x-api-key'         => $key,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ),
        'body' => wp_json_encode(array(
            'model'      => dd2mak_default_model('anthropic'),
            'max_tokens' => 4096,
            'system'     => $system,
            'messages'   => array(array('role' => 'user', 'content' => $user)),
        )),
    ));
    $body = dd2mak_http_error($res);
    if (is_wp_error($body)) {
        return $body;
    }
    $data = json_decode($body, true);
    if (empty($data['content'][0]['text'])) {
        return new WP_Error('empty', 'Anthropic 응답이 비었습니다.');
    }
    return $data['content'][0]['text'];
}

function dd2mak_call_openai($key, $system, $user) {
    $res = wp_remote_post('https://api.openai.com/v1/chat/completions', array(
        'timeout' => 60,
        'headers' => array(
            'Authorization' => 'Bearer ' . $key,
            'content-type'  => 'application/json',
        ),
        'body' => wp_json_encode(array(
            'model'    => dd2mak_default_model('openai'),
            'messages' => array(
                array('role' => 'system', 'content' => $system),
                array('role' => 'user', 'content' => $user),
            ),
        )),
    ));
    $body = dd2mak_http_error($res);
    if (is_wp_error($body)) {
        return $body;
    }
    $data = json_decode($body, true);
    if (empty($data['choices'][0]['message']['content'])) {
        return new WP_Error('empty', 'OpenAI 응답이 비었습니다.');
    }
    return $data['choices'][0]['message']['content'];
}

function dd2mak_call_gemini($key, $system, $user) {
    $model = dd2mak_default_model('gemini');
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent?key=' . rawurlencode($key);
    $res = wp_remote_post($url, array(
        'timeout' => 60,
        'headers' => array('content-type' => 'application/json'),
        'body'    => wp_json_encode(array(
            'systemInstruction' => array('parts' => array(array('text' => $system))),
            'contents'          => array(array('role' => 'user', 'parts' => array(array('text' => $user)))),
        )),
    ));
    $body = dd2mak_http_error($res);
    if (is_wp_error($body)) {
        return $body;
    }
    $data = json_decode($body, true);
    if (empty($data['candidates'][0]['content']['parts'][0]['text'])) {
        return new WP_Error('empty', 'Gemini 응답이 비었습니다.');
    }
    return $data['candidates'][0]['content']['parts'][0]['text'];
}

function dd2mak_ping_provider($provider) {
    if ($provider === 'cursor') {
        return new WP_Error('cursor', 'Cursor는 이 서버에서 연결 확인할 수 없습니다.');
    }
    $key = dd2mak_get_api_key($provider);
    if ($key === '') {
        return new WP_Error('no_key', '키가 없습니다.');
    }
    $r = dd2mak_generate_article('health', '연결 확인용 짧은 인사 한 줄');
    return is_wp_error($r) ? $r : true;
}
```

Ping that generates a full article is wasteful. Change `dd2mak_ping_provider` to a cheap GET:

- Anthropic: `wp_remote_get('https://api.anthropic.com/v1/models', headers x-api-key + anthropic-version)`
- OpenAI: `wp_remote_get('https://api.openai.com/v1/models', Authorization Bearer)`
- Gemini: `wp_remote_get('https://generativelanguage.googleapis.com/v1beta/models?key=')`

Use `dd2mak_http_error` on those responses. Do not call `dd2mak_generate_article` for ping.

- [ ] **Step 2: Add 연결 확인 to settings form**

In `dd2mak_page_ai_settings`, after save handling, if `isset($_POST['dd2mak_ai_ping']) && check_admin_referer('dd2mak_ai_settings')`, call `dd2mak_ping_provider(dd2mak_get_active_provider())` and show success or `WP_Error->get_error_message()`. Add button: `<button class="button" name="dd2mak_ai_ping" value="1">연결 확인</button>`.

- [ ] **Step 3: Lint ai.php and settings.php**

Run:

```
php -l wordpress-plugin/dd2mak-writer/inc/ai.php
php -l wordpress-plugin/dd2mak-writer/inc/settings.php
```

Expected: No syntax errors.

- [ ] **Step 4: Commit**

Skip unless the user asked to commit.

---

### Task 6: 작성자 화면 (새 초안, 내 글)

**Files:**
- Modify: `wordpress-plugin/dd2mak-writer/inc/pages.php`

**Interfaces:**
- Consumes: process + ai functions, `dd2mak_plain_char_count()`, `dd2mak_categories()`
- Produces: `dd2mak_page_new_draft`, `dd2mak_page_my_posts`, admin-post handlers

- [ ] **Step 1: Replace page stubs for writer**

In `inc/pages.php` keep `if (!defined('ABSPATH')) exit;` then implement:

`dd2mak_page_new_draft`:

- Capability `edit_posts`.
- Load post if `$_GET['post']` and author is current user and status is `draft` and `_dd2mak_writer=1`.
- Form fields: category select from `dd2mak_categories()`, keywords input, title input, `wp_editor` for content, hidden post id.
- Buttons: 초안 만들기 (`dd2mak_action=generate`), 작성 중 저장 (`save`), 검수 제출 (`submit`).
- Show `dd2mak_plain_char_count` of content under the editor.
- On generate error, keep posted title/content and show the error. Do not empty the editor.

Register:

```php
add_action('admin_post_dd2mak_writer_action', 'dd2mak_handle_writer_action');
```

Handler `dd2mak_handle_writer_action`:

- `check_admin_referer('dd2mak_writer')`
- `current_user_can('edit_posts')` or die
- Read `dd2mak_action` in `generate|save|submit`
- `generate`: `$r = dd2mak_generate_draft($slug, $keywords, get_current_user_id())`. Redirect to `admin.php?page=dd2mak-writer&post={id}` or back with `error` query arg. If generate fails after user already had a post id, do not delete that post.
- `save`: `dd2mak_save_draft($post_id, $title, $content, $slug, get_current_user_id())`
- `submit`: save first if title present, then `dd2mak_submit_for_review`. Redirect to `admin.php?page=dd2mak-my-posts`.

`dd2mak_page_my_posts`:

- Query `post_type=post`, `author=current`, `meta_key=_dd2mak_writer`, `meta_value=1`, statuses `draft,pending,publish`.
- Table: 제목, 카테고리, 상태 라벨 (작성 중/검수 대기/발행됨), 날짜.
- Draft title links to `page=dd2mak-writer&post=ID`. Other statuses are plain text.

Use `esc_html`, `esc_url`, `esc_attr` on all output. `wp_kses_post` already in process for content.

- [ ] **Step 2: Lint**

Run: `php -l wordpress-plugin/dd2mak-writer/inc/pages.php`

Expected: No syntax errors.

- [ ] **Step 3: Commit**

Skip unless the user asked to commit.

---

### Task 7: 검수자 화면 (대기, 발행됨)

**Files:**
- Modify: `wordpress-plugin/dd2mak-writer/inc/pages.php`

**Interfaces:**
- Consumes: `dd2mak_update_review`, `dd2mak_publish_post`
- Produces: `dd2mak_page_review_queue`, `dd2mak_page_published`, `dd2mak_handle_review_action`

- [ ] **Step 1: Add review pages and handler**

`dd2mak_page_review_queue`:

- Require `publish_posts`.
- If `$_GET['post']`, show edit form: title, `wp_editor`, source, reviewed_at (date, default today), caution, checkbox AI 초안 배지 유지 (`_dd2mak_ai_draft`). Buttons: 검수 내용 저장, 발행.
- Else list `pending` posts with `_dd2mak_writer=1`. Link to same page with `&post=ID`.

`dd2mak_page_published`:

- List `publish` + `_dd2mak_writer=1`. Link to WP built-in editor `post.php?post=ID&action=edit` is acceptable for published re-edit, or reuse review form for `publish` status.

Spec says 발행된 글 can be re-opened and updated. Add `dd2mak_update_published($post_id, $title, $content, $meta)` in `process.php`: same as update_review but `post_status === 'publish'`, then `wp_update_post` keeping publish. Fire `dd2mak_after_update_review` or a new hook `dd2mak_after_update_published`. Use `dd2mak_after_update_review` only for pending. Add hook `dd2mak_after_update_published` for publish edits.

`admin_post_dd2mak_review_action` handler:

- nonce `dd2mak_review`
- require `publish_posts`
- `save`: `dd2mak_update_review` or published updater
- `publish`: save meta/content first, then `dd2mak_publish_post($id, get_current_user_id())`
- Redirect to queue or published list

Do not show a publish button on writer pages.

- [ ] **Step 2: Lint process.php and pages.php**

Run:

```
php -l wordpress-plugin/dd2mak-writer/inc/process.php
php -l wordpress-plugin/dd2mak-writer/inc/pages.php
```

Expected: No syntax errors.

- [ ] **Step 3: Commit**

Skip unless the user asked to commit.

---

### Task 8: 설치 zip과 안내

**Files:**
- Create: `wordpress-plugin/dd2mak-writer/readme.txt`
- Create: `wordpress-plugin/dd2mak-writer.zip` (generated, not hand-written)

**Interfaces:**
- Consumes: plugin folder
- Produces: zip + 설치 방법

- [ ] **Step 1: Write readme.txt**

```
=== dd2mak 글 등록·검수 ===
테스트 후 카페24 워드프레스에서 플러그인 업로드로 설치합니다. 기존 dd2mak 테마를 활성화한 뒤 이 플러그인을 활성화하세요.

작성자 계정은 기여자, 검수자 계정은 편집자 또는 관리자로 만드세요.
검수자: 정보글 검수 > AI 설정에서 Anthropic / OpenAI / Gemini 키를 저장하세요. Cursor는 목록에만 있으며 초안 생성은 되지 않습니다.

작성자: 정보글 > 새 초안 작성에서 카테고리와 키워드로 초안을 만든 뒤 검수 제출.
검수자: 정보글 검수 > 검수 대기에서 수정 후 발행. 발행된 글은 기존 사이트 해당 카테고리 메뉴에 나타납니다.
```

- [ ] **Step 2: Re-run helper tests and php lint all plugin files**

Run:

```
php wordpress-plugin/dd2mak-writer/tests/test-helpers.php
php -l wordpress-plugin/dd2mak-writer/dd2mak-writer.php
php -l wordpress-plugin/dd2mak-writer/inc/helpers.php
php -l wordpress-plugin/dd2mak-writer/inc/settings.php
php -l wordpress-plugin/dd2mak-writer/inc/ai.php
php -l wordpress-plugin/dd2mak-writer/inc/process.php
php -l wordpress-plugin/dd2mak-writer/inc/pages.php
```

Expected: `OK` and all `No syntax errors detected`

- [ ] **Step 3: Build zip**

Run:

```
cd wordpress-plugin
rm -f dd2mak-writer.zip
zip -r -q dd2mak-writer.zip dd2mak-writer -x "*/.DS_Store" -x "*tests*"
```

Expected: zip exists. Tests folder may stay in source but exclude from zip (카페24에 테스트 파일을 올리지 않음).

- [ ] **Step 4: Manual WP checklist (implementer runs on Cafe24 or local WP)**

1. 플러그인 활성화 후 기여자에게 정보글 메뉴만, 편집자에게 정보글 검수 메뉴가 보인다.
2. AI 키 저장 후 끝 4자만 보인다. Cursor 선택 시 초안 만들기가 안내 문구로 거절된다.
3. 기여자가 카테고리+키워드로 초안 → 제출 → 내 글이 검수 대기.
4. 편집자가 검수 대기에서 수정 후 발행 → 프론트 해당 카테고리에 글이 보인다.
5. 기여자 화면에 발행 버튼이 없다.

- [ ] **Step 5: Commit**

Skip unless the user asked to commit.

---

## Phase 2 (이 계획에서 코딩하지 않음)

테스트 통과 후 별도 계획:

1. REST `dd2mak/v1`가 `dd2mak_generate_draft` / `save_draft` / `submit_for_review` / `update_review` / `publish_post`를 그대로 감싼다.
2. DraftAgent, SubmitAgent, ReviewAgent, PublishAgent가 각각 한 엔드포인트만 호출한다.
3. PublishAgent는 사람 승인 후에만 실행. 완전 자동 발행은 스위치.
4. Cursor SDK/Cloud Agents는 REST 워커로만 쓴다.

## Spec coverage

| Spec | Task |
|---|---|
| 플러그인, 테마 미수정 | 2, 8 |
| 작성자/검수자 메뉴 | 2, 6, 7 |
| AI 설정 4사, 키 마스킹, 폴백 상수 | 3, 5 |
| Cursor 초안 차단 | 5 |
| 2천자 프롬프트, [확인 필요], 행동형 제목 | 1, 5 |
| process 함수 + hooks | 4 |
| 발행 → 기존 카테고리 글 | 4, 7 |
| zip 배포 | 8 |
| Phase 2 에이전트 | 계획만, 코드 없음 |
