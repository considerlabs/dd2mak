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
    $all = dd2mak_providers();
    return isset($all[ $p ]) ? $p : 'anthropic';
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
    $notice_type = 'success';

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
    } elseif (isset($_POST['dd2mak_ai_ping']) && check_admin_referer('dd2mak_ai_settings')) {
        $ping_provider = isset($_POST['dd2mak_provider']) ? sanitize_key(wp_unslash($_POST['dd2mak_provider'])) : dd2mak_get_active_provider();
        if (!isset(dd2mak_providers()[ $ping_provider ])) {
            $ping_provider = dd2mak_get_active_provider();
        }
        $ping = dd2mak_ping_provider($ping_provider);
        if (is_wp_error($ping)) {
            $notice = $ping->get_error_message();
            $notice_type = 'error';
        } else {
            $notice = '연결에 성공했습니다.';
        }
    }

    $provider = dd2mak_get_active_provider();
    echo '<div class="wrap"><h1>AI 설정</h1>';
    if ($notice) {
        echo '<div class="notice notice-' . esc_attr($notice_type) . '"><p>' . esc_html($notice) . '</p></div>';
    }
    echo '<form method="post">';
    wp_nonce_field('dd2mak_ai_settings');
    echo '<table class="form-table"><tbody>';
    echo '<tr><th>사용할 제공자</th><td>';
    foreach (dd2mak_providers() as $id => $label) {
        echo '<label style="display:block;margin-bottom:6px"><input type="radio" name="dd2mak_provider" value="' . esc_attr($id) . '" ' . checked($provider, $id, false) . '> ' . esc_html($label) . '</label>';
    }
    echo '<p class="description">Cursor는 키를 저장할 수 있지만, 이 서버에서는 초안 생성에 쓸 수 없습니다.</p>';
    echo '</td></tr>';
    foreach (dd2mak_providers() as $id => $label) {
        $masked = dd2mak_mask_key(dd2mak_get_api_key($id));
        echo '<tr><th>' . esc_html($label) . ' API 키</th><td>';
        echo '<input type="password" autocomplete="new-password" name="dd2mak_key_' . esc_attr($id) . '" value="' . esc_attr($masked) . '" class="regular-text">';
        echo '<p class="description">저장 후 끝 4자만 보입니다. 바꾸려면 새 키를 넣으세요.</p>';
        echo '</td></tr>';
    }
    echo '</tbody></table>';
    echo '<p>';
    echo '<button class="button button-primary" name="dd2mak_ai_save" value="1">저장</button> ';
    echo '<button class="button" name="dd2mak_ai_ping" value="1">연결 확인</button>';
    echo '</p>';
    echo '</form></div>';
}
