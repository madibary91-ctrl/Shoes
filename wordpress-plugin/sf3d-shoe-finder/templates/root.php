<?php
/**
 * قالب ریشه‌ی ویجت.
 *
 * @var string               $dom_id  شناسه‌ی یکتا.
 * @var array<string,mixed>  $config  پیکربندی.
 * @var string               $json    JSON امن‌شده‌ی {config,payload}.
 * @var string[]             $preload آدرس ۴ تصویر اول.
 * @var array<string,mixed>  $settings تنظیمات.
 *
 * @package SF3D
 */

if (!defined('ABSPATH')) {
    exit;
}

$sf3d_style = '--sf3d-height:' . esc_attr((string) ($config['height'] ?? '100vh')) . ';';
if (!empty($config['grid']['bgColor']) && is_string($config['grid']['bgColor'])) {
    $sf3d_style .= '--sf3d-bg:' . esc_attr($config['grid']['bgColor']) . ';';
}
?>
<?php foreach ($preload as $sf3d_img) : ?>
<link rel="preload" as="image" href="<?php echo esc_url($sf3d_img); ?>">
<?php endforeach; ?>
<div id="<?php echo esc_attr($dom_id); ?>" class="sf3d-root" data-sf3d="1" style="<?php echo $sf3d_style; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?>" dir="<?php echo is_rtl() ? 'rtl' : 'ltr'; ?>">
	<noscript><p><?php echo esc_html__('برای مشاهده‌ی شبکه‌ی سه‌بعدی، جاوااسکریپت را فعال کنید.', 'sf3d-shoe-finder'); ?></p></noscript>
	<script type="application/json" data-sf3d-json><?php echo $json; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON با JSON_HEX_TAG امن شده. ?></script>
</div>
