<?php
/**
 * Plugin Name:       SF3D Shoe Finder
 * Plugin URI:        https://example.com/sf3d-shoe-finder
 * Description:       شبکه‌ی سه‌بعدی محصولات ووکامرس (WebGL) با ویجت المنتور، بلوک گوتنبرگ، علاقه‌مندی‌ها، فیلتر، سبد خرید AJAX و دسترس‌پذیری کامل.
 * Version:           2.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            SF3D
 * License:           GPL-2.0-or-later
 * Text Domain:       sf3d-shoe-finder
 * Domain Path:       /languages
 * WC requires at least: 6.0
 * WC tested up to:   9.0
 *
 * فقط bootstrap؛ تمام منطق در src/ است (PSR-4: SF3D\Plugin\).
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

define('SF3D_VERSION', '2.0.0');
define('SF3D_FILE', __FILE__);
define('SF3D_PATH', plugin_dir_path(__FILE__));
define('SF3D_URL', plugin_dir_url(__FILE__));

// Autoloader: ابتدا composer، در غیر این صورت autoloader سبک PSR-4
if (is_readable(SF3D_PATH . 'vendor/autoload.php')) {
    require_once SF3D_PATH . 'vendor/autoload.php';
} else {
    spl_autoload_register(
        static function (string $class): void {
            $prefix = 'SF3D\\Plugin\\';
            if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
                return;
            }
            $relative = substr($class, strlen($prefix));
            $file     = SF3D_PATH . 'src/' . str_replace('\\', '/', $relative) . '.php';
            if (is_readable($file)) {
                require_once $file;
            }
        }
    );
}

// لایه‌ی سازگاری با API قدیمی (SF3D_Renderer / SF3D_Data / SF3D_Plugin)
require_once SF3D_PATH . 'src/Legacy/legacy.php';

/**
 * اعلام سازگاری با HPOS ووکامرس.
 */
add_action(
    'before_woocommerce_init',
    static function (): void {
        if (class_exists('\Automattic\WooCommerce\Utilities\FeaturesUtil')) {
            \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', SF3D_FILE, true);
        }
    }
);

add_action(
    'plugins_loaded',
    static function (): void {
        load_plugin_textdomain('sf3d-shoe-finder', false, dirname(plugin_basename(SF3D_FILE)) . '/languages');

        if (!class_exists('WooCommerce')) {
            add_action(
                'admin_notices',
                static function (): void {
                    echo '<div class="notice notice-error"><p>'
                        . esc_html__('افزونه SF3D Shoe Finder برای کار کردن به ووکامرس نیاز دارد.', 'sf3d-shoe-finder')
                        . '</p></div>';
                }
            );
            return;
        }

        \SF3D\Plugin\Plugin::boot(SF3D_FILE);
    },
    20
);

register_deactivation_hook(
    __FILE__,
    static function (): void {
        // پاک‌سازی کش هنگام غیرفعال‌سازی
        $index = get_option('sf3d_cache_index', array());
        if (is_array($index)) {
            foreach ($index as $name) {
                delete_transient((string) $name);
            }
        }
        delete_option('sf3d_cache_index');
    }
);
