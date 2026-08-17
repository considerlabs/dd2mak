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
expect(dd2mak_mask_key('1234567890') === '******7890', 'mask keeps last 4');

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
