<?php

declare(strict_types=1);

namespace SF3D\Plugin\Data;

use SF3D\Plugin\Contracts\CacheInterface;
use SF3D\Plugin\Contracts\PayloadBuilder as PayloadBuilderContract;
use SF3D\Plugin\Contracts\ProductRepository;
use SF3D\Plugin\Hooks\EventRegistry;

/**
 * سازنده‌ی payload با کش یک‌ساعته؛ به Repository و Cache وابسته است.
 *
 * E07: کلید کش علاوه بر آرگومان‌ها شامل «بافتار مخاطب» است (زبان، ارز، نمایش مالیات،
 * نقش کاربر، نرخ‌های مالیاتی آدرس مشتری) تا قیمتِ یک گروه به گروه دیگر نشت نکند.
 */
final class PayloadBuilder implements PayloadBuilderContract
{
    public const VERSION     = 3;
    public const DEFAULT_TTL = 3600; // ۱ ساعت

    /** @var ProductRepository */
    private $repository;

    /** @var CacheInterface */
    private $cache;

    public function __construct(ProductRepository $repository, CacheInterface $cache)
    {
        $this->repository = $repository;
        $this->cache      = $cache;
    }

    /**
     * @param array<string,mixed> $args آرگومان‌های کوئری.
     * @return array<string,mixed>
     */
    public function build(array $args = array()): array
    {
        $key = $this->cacheKey($args);

        $cached = $this->cache->get($key);
        if (is_array($cached) && isset($cached['products'])) {
            return $cached;
        }

        $collections = $this->repository->categories();
        array_unshift(
            $collections,
            array('id' => 0, 'slug' => 'all', 'name' => __('همه', 'sf3d-shoe-finder'), 'count' => 0)
        );

        $payload = array(
            'version'      => self::VERSION,
            'generated_at' => gmdate('c'),
            'products'     => $this->repository->all($args),
            'collections'  => EventRegistry::apply(EventRegistry::F_COLLECTIONS, $collections, $args),
            'filters'      => EventRegistry::apply(EventRegistry::F_FILTERS, $this->repository->filters(), $args),
        );
        $payload['collections'][0]['count'] = count($payload['products']);

        /**
         * فیلتر کل payload.
         *
         * @param array $payload payload.
         * @param array $args    آرگومان‌ها.
         */
        $payload = (array) EventRegistry::apply(EventRegistry::F_PAYLOAD, $payload, $args);

        $ttl = (int) EventRegistry::apply(EventRegistry::F_CACHE_TTL, self::DEFAULT_TTL, $key, $args);
        $this->cache->set($key, $payload, $ttl);

        return $payload;
    }

    /**
     * @param array<string,mixed> $args آرگومان‌های کوئری.
     */
    public function toJson(array $args = array()): string
    {
        $json = wp_json_encode($this->build($args), JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
        return is_string($json) ? $json : '{}';
    }

    /**
     * E07: کلید کش = آرگومان‌ها (با ترتیب کلید یکسان‌شده) + بافتار مخاطب + نسخه.
     *
     * @param array<string,mixed> $args آرگومان‌های کوئری.
     */
    public function cacheKey(array $args = array()): string
    {
        $raw = wp_json_encode(
            array(
                'args'    => self::normalize($args),
                'context' => $this->context(),
                'v'       => self::VERSION,
            )
        );

        $key = 'payload_' . md5((string) $raw);

        return (string) EventRegistry::apply(EventRegistry::F_CACHE_KEY, $key, $args);
    }

    /**
     * E07: هر چیزی که خروجی (به‌خصوص قیمت) را برای مخاطب‌های مختلف متفاوت می‌کند.
     * عمداً شناسه‌ی کاربر یا آدرس خام وارد کلید نمی‌شود تا کش تکه‌تکه نشود و حریم خصوصی حفظ بماند.
     *
     * @return array<string,mixed>
     */
    public function context(): array
    {
        $ctx = array(
            'locale'   => function_exists('determine_locale') ? (string) determine_locale() : (string) get_locale(),
            'currency' => function_exists('get_woocommerce_currency') ? (string) get_woocommerce_currency() : '',
            'audience' => $this->audience(),
            'tax'      => $this->taxContext(),
        );

        /**
         * افزودن بافتار دلخواه (مثلاً افزونه‌ی چندارزی، قیمت عمده، گروه‌های مشتری).
         *
         * @param array $ctx بافتار فعلی.
         */
        $ctx = apply_filters('sf3d_payload_context', $ctx);

        return is_array($ctx) ? $ctx : array();
    }

    /**
     * مهمان یا مجموعه‌ی نقش‌های کاربر (مرتب‌شده).
     */
    private function audience(): string
    {
        if (!function_exists('is_user_logged_in') || !is_user_logged_in()) {
            return 'guest';
        }

        $user  = function_exists('wp_get_current_user') ? wp_get_current_user() : null;
        $roles = ($user && isset($user->roles) && is_array($user->roles)) ? array_map('strval', $user->roles) : array();
        sort($roles);

        return 'user:' . implode(',', $roles);
    }

    /**
     * وضعیت مالیات: فعال بودن، نحوه‌ی نمایش، قیمت‌های شامل مالیات، معافیت، نرخ‌های آدرس مشتری.
     *
     * @return array<string,mixed>
     */
    private function taxContext(): array
    {
        $enabled = function_exists('wc_tax_enabled') ? (bool) wc_tax_enabled() : false;
        if (!$enabled) {
            return array('enabled' => false);
        }

        $customer = $this->customer();
        $exempt   = ($customer && method_exists($customer, 'get_is_vat_exempt')) ? (bool) $customer->get_is_vat_exempt() : false;

        $include = function_exists('wc_prices_include_tax')
            ? (bool) wc_prices_include_tax()
            : ('yes' === get_option('woocommerce_prices_include_tax', 'no'));

        return array(
            'enabled' => true,
            'display' => $exempt ? 'excl' : (string) get_option('woocommerce_tax_display_shop', 'excl'),
            'include' => $include,
            'exempt'  => $exempt,
            'rates'   => $this->taxRatesHash($customer),
        );
    }

    /**
     * @return \WC_Customer|null
     */
    private function customer()
    {
        if (!function_exists('WC')) {
            return null;
        }

        $wc       = WC();
        $customer = (is_object($wc) && isset($wc->customer)) ? $wc->customer : null;

        return $customer instanceof \WC_Customer ? $customer : null;
    }

    /**
     * به‌جای آدرس خام، هش «نرخ‌های مالیاتی منطبق با آدرس» وارد کلید می‌شود؛
     * تعداد حالت‌ها محدود می‌ماند و تغییر نرخ در تنظیمات هم کلید را عوض می‌کند.
     *
     * @param \WC_Customer|null $customer مشتری فعلی (در REST/Cron ممکن است null باشد).
     */
    private function taxRatesHash($customer): string
    {
        if (!$customer || !method_exists($customer, 'get_taxable_address')) {
            return 'default';
        }

        $addr = array_values((array) $customer->get_taxable_address()); // country, state, postcode, city.
        $addr = array_pad(array_map('strval', $addr), 4, '');

        if (!class_exists('\WC_Tax')) {
            return md5(implode('|', $addr));
        }

        $classes = array_merge(array(''), (array) \WC_Tax::get_tax_class_slugs());
        $out     = array();

        foreach ($classes as $class) {
            $found = \WC_Tax::find_rates(
                array(
                    'country'   => $addr[0],
                    'state'     => $addr[1],
                    'postcode'  => $addr[2],
                    'city'      => $addr[3],
                    'tax_class' => (string) $class,
                )
            );

            $rates = array();
            foreach ((array) $found as $id => $rate) {
                $rates[(int) $id] = isset($rate['rate']) ? (string) $rate['rate'] : '';
            }
            ksort($rates);
            $out[(string) $class] = $rates;
        }

        ksort($out);

        return md5((string) wp_json_encode($out));
    }

    /**
     * مرتب‌سازی بازگشتیِ کلیدها تا ['a'=>1,'b'=>2] و ['b'=>2,'a'=>1] یک کلید بدهند.
     *
     * @param mixed $value مقدار ورودی.
     * @return mixed
     */
    private static function normalize($value)
    {
        if (!is_array($value)) {
            return $value;
        }

        foreach ($value as $k => $v) {
            $value[$k] = self::normalize($v);
        }

        $isList = array_keys($value) === range(0, count($value) - 1);
        if (!$isList) {
            ksort($value);
        }

        return $value;
    }
}
