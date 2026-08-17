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
    while ($lines && trim($lines[0]) === '') {
        array_shift($lines);
    }
    $title = '';
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
