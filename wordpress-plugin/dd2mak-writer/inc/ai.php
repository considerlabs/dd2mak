<?php
if (!defined('ABSPATH')) {
    exit;
}

function dd2mak_default_model($provider) {
    $map = array(
        'anthropic' => 'claude-sonnet-4-20250514',
        'openai'    => 'gpt-4o',
        'gemini'    => 'gemini-3.6-flash',
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
    if ($provider === 'anthropic') {
        $res = wp_remote_get('https://api.anthropic.com/v1/models', array(
            'timeout' => 20,
            'headers' => array(
                'x-api-key'         => $key,
                'anthropic-version' => '2023-06-01',
            ),
        ));
    } elseif ($provider === 'openai') {
        $res = wp_remote_get('https://api.openai.com/v1/models', array(
            'timeout' => 20,
            'headers' => array(
                'Authorization' => 'Bearer ' . $key,
            ),
        ));
    } elseif ($provider === 'gemini') {
        $res = wp_remote_get('https://generativelanguage.googleapis.com/v1beta/models?key=' . rawurlencode($key), array(
            'timeout' => 20,
        ));
    } else {
        return new WP_Error('bad_provider', '알 수 없는 제공자입니다.');
    }
    $body = dd2mak_http_error($res);
    if (is_wp_error($body)) {
        return $body;
    }
    return true;
}
