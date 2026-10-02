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
            // [F2b] preset از PHP پاس داده می‌شود (قبلاً هرگز به JS نمی‌رسید)
            'preset'          => Settings::preset($settings['preset'] ?? ''),
            'cardPosition'    => (string) ($settings['card_position'] ?? 'end'),
            'startCollection' => (string) ($settings['start_collection'] ?? 'all'),
            'grid'            => $grid,
            // [F2b] شامل features.cardModal (از Settings::FEATURES)
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
     * [F14] تمام رشته‌های رابط (منبع فارسی؛ ترجمه از طریق فایل‌های زبان).
     * کلیدها باید دقیقاً با STRINGS در assets/src/core/Config.js یکی باشند.
     * دامنه‌ی متن به‌صورت literal نوشته شده تا ابزار استخراج (wp i18n make-pot) همه را ببیند؛
     * با متغیر $d استخراج رشته‌ها انجام نمی‌شد.
     *
     * @return array<string,string>
     */
    private function strings(): array
    {
        return array(
            'all'              => __('همه', 'sf3d-shoe-finder'),
            'wishlist'         => __('علاقه‌مندی‌ها', 'sf3d-shoe-finder'),
            'recent'           => __('اخیراً دیده‌شده', 'sf3d-shoe-finder'),
            'filters'          => __('فیلترها', 'sf3d-shoe-finder'),
            'sort'             => __('مرتب‌سازی', 'sf3d-shoe-finder'),
            'reset'            => __('پاک‌کردن فیلترها', 'sf3d-shoe-finder'),
            'search'           => __('جستجوی کفش…', 'sf3d-shoe-finder'),
            'noResults'        => __('نتیجه‌ای پیدا نشد', 'sf3d-shoe-finder'),
            'addToCart'        => __('افزودن به سبد', 'sf3d-shoe-finder'),
            'selectOptions'    => __('گزینه‌ها را انتخاب کنید', 'sf3d-shoe-finder'),
            'outOfStock'       => __('ناموجود', 'sf3d-shoe-finder'),
            'sale'             => __('حراج', 'sf3d-shoe-finder'),
            'new'              => __('جدید', 'sf3d-shoe-finder'),
            'added'            => __('به سبد اضافه شد', 'sf3d-shoe-finder'),
            'adding'           => __('در حال افزودن…', 'sf3d-shoe-finder'),
            'error'            => __('خطایی رخ داد. دوباره تلاش کنید.', 'sf3d-shoe-finder'),
            'cart'             => __('سبد خرید', 'sf3d-shoe-finder'),
            'cartEmpty'        => __('سبد خرید شما خالی است', 'sf3d-shoe-finder'),
            'subtotal'         => __('جمع جزء', 'sf3d-shoe-finder'),
            'checkout'         => __('تسویه حساب', 'sf3d-shoe-finder'),
            'continueShopping' => __('ادامه‌ی خرید', 'sf3d-shoe-finder'),
            'remove'           => __('حذف', 'sf3d-shoe-finder'),
            'close'            => __('بستن', 'sf3d-shoe-finder'),
            'related'          => __('محصولات مشابه', 'sf3d-shoe-finder'),
            'emptyWishlist'    => __('هنوز چیزی ذخیره نکردی', 'sf3d-shoe-finder'),
            'emptyRecent'      => __('هنوز محصولی ندیده‌ای', 'sf3d-shoe-finder'),
            // توجه: placeholderهایی مثل {n} و {title} را در ترجمه تغییر ندهید (JS جایگزین می‌کند)
            'lowStock'         => __('فقط {n} عدد باقی مانده!', 'sf3d-shoe-finder'),
            'inStock'          => __('موجود در انبار', 'sf3d-shoe-finder'),
            'share'            => __('اشتراک‌گذاری', 'sf3d-shoe-finder'),
            'linkCopied'       => __('لینک کپی شد', 'sf3d-shoe-finder'),
            'quickView'        => __('مشاهده سریع', 'sf3d-shoe-finder'),
            'compare'          => __('مقایسه', 'sf3d-shoe-finder'),
            'compareTitle'     => __('مقایسه محصولات', 'sf3d-shoe-finder'),
            'selected'         => __('{n} محصول انتخاب شد', 'sf3d-shoe-finder'),
            'bulkAdd'          => __('افزودن به سبد', 'sf3d-shoe-finder'),
            'clear'            => __('لغو انتخاب', 'sf3d-shoe-finder'),
            'skip'             => __('پرش به شبکه', 'sf3d-shoe-finder'),
            'gridLabel'        => __('شبکه محصولات', 'sf3d-shoe-finder'),
            'viewProduct'      => __('مشاهده محصول', 'sf3d-shoe-finder'),
            'prev'             => __('قبلی', 'sf3d-shoe-finder'),
            'next'             => __('بعدی', 'sf3d-shoe-finder'),
            'darkMode'         => __('حالت تاریک', 'sf3d-shoe-finder'),
            'lightMode'        => __('حالت روشن', 'sf3d-shoe-finder'),
            'sortDefault'      => __('پیش‌فرض', 'sf3d-shoe-finder'),
            'sortNew'          => __('جدیدترین', 'sf3d-shoe-finder'),
            'sortPriceAsc'     => __('ارزان‌ترین', 'sf3d-shoe-finder'),
            'sortPriceDesc'    => __('گران‌ترین', 'sf3d-shoe-finder'),
            'sortPopular'      => __('محبوب‌ترین', 'sf3d-shoe-finder'),
            'size'             => __('سایز', 'sf3d-shoe-finder'),
            'color'            => __('رنگ', 'sf3d-shoe-finder'),
            'choose'           => __('انتخاب…', 'sf3d-shoe-finder'),
            'spin360'          => __('برای چرخاندن بکشید', 'sf3d-shoe-finder'),
            'addedAnnounce'    => __('{title} به سبد اضافه شد', 'sf3d-shoe-finder'),
            'wishlistAdded'    => __('{title} به علاقه‌مندی‌ها اضافه شد', 'sf3d-shoe-finder'),
            'wishlistRemoved'  => __('{title} از علاقه‌مندی‌ها حذف شد', 'sf3d-shoe-finder'),
            'focused'          => __('{title} انتخاب شد', 'sf3d-shoe-finder'),
            'products'         => __('محصول', 'sf3d-shoe-finder'),
            // ── کلید جدید F14 ──
            'gallery'          => __('گالری تصاویر', 'sf3d-shoe-finder'),
            // ── کلیدهای مورد نیاز fixهای F5, F7, F9, F10, F17 ──
            'networkError'     => __('اتصال برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.', 'sf3d-shoe-finder'),
            'resultsCount'     => __('{n} محصول یافت شد', 'sf3d-shoe-finder'),
            'cartCount'        => __('سبد خرید، {n} کالا', 'sf3d-shoe-finder'),
            'compareOn'        => __('{title} به مقایسه اضافه شد', 'sf3d-shoe-finder'),
            'compareOff'       => __('{title} از مقایسه حذف شد', 'sf3d-shoe-finder'),
            'selectOn'         => __('{title} برای افزودن گروهی انتخاب شد', 'sf3d-shoe-finder'),
            'selectOff'        => __('{title} از انتخاب گروهی خارج شد', 'sf3d-shoe-finder'),
            'webglLost'        => __('نمایش سه‌بعدی قطع شد؛ در حال بازیابی…', 'sf3d-shoe-finder'),
            'webglRestored'    => __('نمایش سه‌بعدی دوباره برقرار شد', 'sf3d-shoe-finder'),
        );
    }
}
