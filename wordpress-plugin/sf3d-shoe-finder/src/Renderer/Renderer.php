<?php

declare(strict_types=1);

namespace SF3D\Plugin\Renderer;

use SF3D\Plugin\Assets\Assets;
use SF3D\Plugin\Contracts\NonceProvider;
use SF3D\Plugin\Contracts\PayloadBuilder;
use SF3D\Plugin\Contracts\RendererInterface;
use SF3D\Plugin\Hooks\EventRegistry;
use SF3D\Plugin\Support\Settings;

/**
 * رندر HTML ویجت: ریشه‌ی DOM + JSON داده (config + payload).
 */
final class Renderer implements RendererInterface
{
    /** @var PayloadBuilder */
    private $payload;

    /** @var NonceProvider */
    private $nonce;

    /** @var Assets */
    private $assets;

    /** @var string */
    private $templateDir;

    /** @var int */
    private static $counter = 0;

    public function __construct(PayloadBuilder $payload, NonceProvider $nonce, Assets $assets, string $templateDir)
    {
        $this->payload     = $payload;
        $this->nonce       = $nonce;
        $this->assets      = $assets;
        $this->templateDir = rtrim($templateDir, '/\\') . '/';
    }

    /**
     * @param array<string,mixed> $settings تنظیمات نرمال‌شده.
     */
    public function render(array $settings = array()): string
    {
        if (!isset($settings['features'])) {
            $settings = Settings::normalize($settings);
        }

        EventRegistry::fire(EventRegistry::A_BEFORE_RENDER, $settings);
        $this->assets->enqueue();

        $config  = $this->config($settings);
        $payload = $this->payload->build(
            array(
                'limit'         => $settings['limit'] ?? 60,
                'categories'    => $settings['categories'] ?? array(),
                'orderby'       => $settings['orderby'] ?? 'date',
                'order'         => $settings['order'] ?? 'DESC',
                'only_in_stock' => $settings['only_in_stock'] ?? false,
            )
        );

        $dom_id  = 'sf3d-' . (++self::$counter);
        $preload = array();
        foreach (array_slice((array) ($payload['products'] ?? array()), 0, 4) as $p) {
            if (!empty($p['image'])) {
                $preload[] = (string) $p['image'];
            }
        }
        $json = wp_json_encode(array('config' => $config, 'payload' => $payload), JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
        $json = is_string($json) ? $json : '{}';

        $template = $this->templateDir . 'root.php';
        ob_start();
        if (is_readable($template)) {
            include $template; // متغیرها: $dom_id, $config, $json, $preload, $settings
        }
        $html = (string) ob_get_clean();

        EventRegistry::fire(EventRegistry::A_AFTER_RENDER, $html, $settings);
        return $html;
    }

    /**
     * @param array<string,mixed> $settings تنظیمات نرمال‌شده.
     * @return array<string,mixed>
     */
    public function config(array $settings = array()): array
    {
        global $wp_locale;
        if (!isset($settings['features'])) {
            $settings = Settings::normalize($settings);
        }

        $grid_defaults = (array) EventRegistry::apply(
            EventRegistry::F_GRID_DEFAULTS,
            array(
                'gridCols' => 8,
                'itemSize' => 2.5,
                'gap'      => 0.4,
                'zoomIn'   => 12,
                'zoomOut'  => 31,
                'bgColor'  => '#e0e0e0',
            ),
            $settings
        );
        $grid = array_merge($grid_defaults, (array) ($settings['grid'] ?? array()));

        $user_id  = get_current_user_id();
        $wishlist = array();
        if ($user_id) {
            $stored = get_user_meta($user_id, 'sf3d_wishlist', true);
            if (is_array($stored)) {
                $wishlist = array_values(array_map('intval', $stored));
            }
        }

        $locale = str_replace('_', '-', (string) determine_locale());
        $months = array();
        $days   = array();
        if (isset($wp_locale) && is_object($wp_locale)) {
            $months = array_values((array) $wp_locale->month);
            $days   = array_values((array) $wp_locale->weekday);
        }
        $nf = isset($wp_locale) && is_object($wp_locale) && is_array($wp_locale->number_format) ? $wp_locale->number_format : array();

        $config = array(
            'ajaxUrl'         => \WC_AJAX::get_endpoint('%%endpoint%%'),
            'nonce'           => $this->nonce->create(),
            'locale'          => $locale,
            'rtl'             => is_rtl(),
            'isLoggedIn'      => (bool) $user_id,
            'wishlist'        => $wishlist,
            'title'           => (string) ($settings['title'] ?? ''),
            'height'          => (string) ($settings['height'] ?? '100vh'),
            'theme'           => (string) ($settings['theme'] ?? 'auto'),
            'cardPosition'    => (string) ($settings['card_position'] ?? 'end'),
            'startCollection' => (string) ($settings['start_collection'] ?? 'all'),
            'grid'            => $grid,
            'features'        => (array) ($settings['features'] ?? array()),
            'currency'        => array(
                'symbol'      => html_entity_decode(get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8'),
                'position'    => (string) get_option('woocommerce_currency_pos', 'left'),
                'decimals'    => (int) wc_get_price_decimals(),
                'decimalSep'  => wc_get_price_decimal_separator(),
                'thousandSep' => wc_get_price_thousand_separator(),
            ),
            'wpLocale'        => array(
                'decimal'   => (string) ($nf['decimal_point'] ?? '.'),
                'thousands' => (string) ($nf['thousands_sep'] ?? ','),
                'months'    => $months,
                'weekdays'  => $days,
            ),
            'cartUrl'         => wc_get_cart_url(),
            'checkoutUrl'     => wc_get_checkout_url(),
            'i18n'            => $this->strings(),
        );

        /**
         * فیلتر پیکربندی نهایی.
         *
         * @param array $config   پیکربندی.
         * @param array $settings تنظیمات.
         */
        return (array) EventRegistry::apply(EventRegistry::F_CONFIG, $config, $settings);
    }

    /**
     * متن‌های رابط (منبع فارسی؛ ترجمه از طریق فایل‌های زبان).
     *
     * @return array<string,string>
     */
    private function strings(): array
    {
        $d = 'sf3d-shoe-finder';
        return array(
            'all'            => __('همه', $d),
            'wishlist'       => __('علاقه‌مندی‌ها', $d),
            'recent'         => __('اخیراً دیده‌شده', $d),
            'filters'        => __('فیلترها', $d),
            'sort'           => __('مرتب‌سازی', $d),
            'reset'          => __('پاک‌کردن فیلترها', $d),
            'search'         => __('جستجوی کفش…', $d),
            'noResults'      => __('نتیجه‌ای پیدا نشد', $d),
            'addToCart'      => __('افزودن به سبد', $d),
            'selectOptions'  => __('گزینه‌ها را انتخاب کنید', $d),
            'outOfStock'     => __('ناموجود', $d),
            'sale'           => __('حراج', $d),
            'new'            => __('جدید', $d),
            'added'          => __('به سبد اضافه شد', $d),
            'error'          => __('خطایی رخ داد. دوباره تلاش کنید.', $d),
            'cart'           => __('سبد خرید', $d),
            'cartEmpty'      => __('سبد خرید شما خالی است', $d),
            'subtotal'       => __('جمع جزء', $d),
            'checkout'       => __('تسویه حساب', $d),
            'continueShopping' => __('ادامه‌ی خرید', $d),
            'related'        => __('محصولات مشابه', $d),
            'emptyWishlist'  => __('هنوز چیزی ذخیره نکردی', $d),
            'lowStock'       => __('فقط {n} عدد باقی مانده!', $d),
            'viewProduct'    => __('مشاهده محصول', $d),
        );
    }
}
