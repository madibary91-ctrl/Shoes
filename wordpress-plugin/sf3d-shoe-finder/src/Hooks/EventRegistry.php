<?php

declare(strict_types=1);

namespace SF3D\Plugin\Hooks;

/**
 * ثبت متمرکز هوک‌ها + نقطه‌ی واحد برای فراخوانی فیلترها/اکشن‌های عمومی افزونه.
 */
final class EventRegistry
{
    // --- فیلترها ---
    public const F_QUERY_ARGS          = 'sf3d_query_args';
    public const F_PRODUCT_DATA        = 'sf3d_product_data';
    public const F_PAYLOAD             = 'sf3d_payload';
    public const F_CONFIG              = 'sf3d_config';
    public const F_GRID_DEFAULTS       = 'sf3d_grid_defaults';
    public const F_COLLECTIONS         = 'sf3d_available_collections';
    public const F_FILTERS             = 'sf3d_available_filters';
    public const F_AJAX_RESPONSE       = 'sf3d_ajax_response';
    public const F_CACHE_TTL           = 'sf3d_cache_ttl';
    public const F_CACHE_KEY           = 'sf3d_cache_key';

    // --- اکشن‌ها ---
    public const A_LOADED              = 'sf3d_loaded';
    public const A_BEFORE_RENDER       = 'sf3d_before_render';
    public const A_AFTER_RENDER        = 'sf3d_after_render';
    public const A_BEFORE_ADD_TO_CART  = 'sf3d_before_add_to_cart';
    public const A_AFTER_ADD_TO_CART   = 'sf3d_after_add_to_cart';
    public const A_CACHE_FLUSHED       = 'sf3d_cache_flushed';
    public const A_PRODUCT_SERIALIZED  = 'sf3d_product_serialized';

    /** @var array<int,array{type:string,hook:string}> */
    private $registered = array();

    /**
     * ثبت اکشن.
     *
     * @param string   $hook     نام هوک.
     * @param callable $callback تابع.
     * @param int      $priority اولویت.
     * @param int      $args     تعداد آرگومان.
     */
    public function listen(string $hook, callable $callback, int $priority = 10, int $args = 1): void
    {
        add_action($hook, $callback, $priority, $args);
        $this->registered[] = array('type' => 'action', 'hook' => $hook);
    }

    /**
     * ثبت فیلتر.
     */
    public function filter(string $hook, callable $callback, int $priority = 10, int $args = 1): void
    {
        add_filter($hook, $callback, $priority, $args);
        $this->registered[] = array('type' => 'filter', 'hook' => $hook);
    }

    /**
     * @return array<int,array{type:string,hook:string}>
     */
    public function registered(): array
    {
        return $this->registered;
    }

    /**
     * اجرای فیلتر عمومی.
     *
     * @param string $hook  نام فیلتر.
     * @param mixed  $value مقدار.
     * @param mixed  ...$args آرگومان‌های اضافه.
     * @return mixed
     */
    public static function apply(string $hook, $value, ...$args)
    {
        return apply_filters($hook, $value, ...$args);
    }

    /**
     * اجرای اکشن عمومی.
     *
     * @param string $hook نام اکشن.
     * @param mixed  ...$args آرگومان‌ها.
     */
    public static function fire(string $hook, ...$args): void
    {
        do_action($hook, ...$args);
    }
}
