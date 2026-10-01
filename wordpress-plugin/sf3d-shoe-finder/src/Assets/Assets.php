<?php

declare(strict_types=1);

namespace SF3D\Plugin\Assets;

/**
 * ثبت و بارگذاری شرطی اسکریپت/استایل (فقط وقتی ویجت رندر می‌شود).
 */
final class Assets
{
    public const HANDLE = 'sf3d';

    /** @var string */
    private $path;

    /** @var string */
    private $url;

    public function __construct(string $path, string $url)
    {
        $this->path = rtrim($path, '/\\') . '/';
        $this->url  = rtrim($url, '/') . '/';
    }

    public function register(): void
    {
        $debug  = defined('SCRIPT_DEBUG') && SCRIPT_DEBUG;
        $file   = $debug && is_readable($this->path . 'assets/dist/sf3d.js') ? 'sf3d.js' : 'sf3d.min.js';
        $script = $this->path . 'assets/dist/' . $file;
        $style  = $this->path . 'assets/css/sf3d.css';

        // WP 6.3+ از strategy پشتیبانی می‌کند؛ نسخه‌های قدیمی‌تر فقط in_footer
        global $wp_version;
        $args = version_compare((string) $wp_version, '6.3', '>=') ? array('in_footer' => true, 'strategy' => 'defer') : true;

        wp_register_script(self::HANDLE, $this->url . 'assets/dist/' . $file, array(), $this->version($script), $args);
        wp_register_style(self::HANDLE, $this->url . 'assets/css/sf3d.css', array(), $this->version($style));
    }

    public function enqueue(): void
    {
        if (!wp_script_is(self::HANDLE, 'registered')) {
            $this->register();
        }
        wp_enqueue_script(self::HANDLE);
        wp_enqueue_style(self::HANDLE);
    }

    private function version(string $file): string
    {
        return is_readable($file) ? (string) filemtime($file) : (defined('SF3D_VERSION') ? (string) SF3D_VERSION : '2.0.0');
    }
}
