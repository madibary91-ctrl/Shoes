<?php
/**
 * بوتسترپ PHPUnit: استاب‌های حداقلی توابع وردپرس تا تست‌های واحد بدون WP اجرا شوند.
 */

declare(strict_types=1);

define('ABSPATH', __DIR__ . '/');

$GLOBALS['sf3d_test_options']    = array();
$GLOBALS['sf3d_test_transients'] = array();
$GLOBALS['sf3d_test_actions']    = array();

require_once dirname(__DIR__, 2) . '/vendor/autoload.php';

if (!function_exists('apply_filters')) {
    function apply_filters(string $tag, $value, ...$args)
    {
        return $value;
    }
    function do_action(string $tag, ...$args): void
    {
        $GLOBALS['sf3d_test_actions'][] = $tag;
    }
    function wp_json_encode($data, int $flags = 0)
    {
        return json_encode($data, $flags);
    }
    function get_locale(): string
    {
        return 'fa_IR';
    }
    function __(string $text, string $domain = ''): string
    {
        return $text;
    }
    function sanitize_title(string $s): string
    {
        return strtolower(trim(preg_replace('/[^a-z0-9_\-]+/i', '-', $s), '-'));
    }
    function sanitize_text_field(string $s): string
    {
        return trim(strip_tags($s));
    }
    function sanitize_hex_color(string $c)
    {
        return preg_match('/^#([0-9a-f]{3}|[0-9a-f]{6})$/i', $c) ? $c : null;
    }
    function get_option(string $k, $d = false)
    {
        return $GLOBALS['sf3d_test_options'][$k] ?? $d;
    }
    function update_option(string $k, $v, $autoload = null): bool
    {
        $GLOBALS['sf3d_test_options'][$k] = $v;
        return true;
    }
    function get_transient(string $k)
    {
        return $GLOBALS['sf3d_test_transients'][$k] ?? false;
    }
    function set_transient(string $k, $v, int $ttl = 0): bool
    {
        $GLOBALS['sf3d_test_transients'][$k] = $v;
        return true;
    }
    function delete_transient(string $k): bool
    {
        unset($GLOBALS['sf3d_test_transients'][$k]);
        return true;
    }
}
