<?php

declare(strict_types=1);

namespace SF3D\Plugin\Support;

/**
 * نرمال‌سازی تنظیمات ورودی از شورت‌کد، المنتور و بلوک گوتنبرگ به یک ساختار واحد.
 */
final class Settings
{
    /** پیش‌تنظیم ظاهری پیش‌فرض (باید با DEFAULT_PRESET در Config.js یکی باشد) */
    public const DEFAULT_PRESET = 'minimal';

    /** کلیدهای قابلیت‌ها (نام snake_case → نام camelCase در JS) */
    private const FEATURES = array(
        'wishlist'      => 'wishlist',
        'quick_actions' => 'quickActions',
        'badges'        => 'badges',
        'gallery'       => 'gallery',
        'related'       => 'related',
        'search'        => 'search',
        'dark_mode'     => 'darkMode',
        'filters'       => 'filters',
        'sort'          => 'sort',
        'bulk'          => 'bulk',
        'recent'        => 'recent',
        'cart_drawer'   => 'cartDrawer',
        'minimap'       => 'minimap',
        'hash_sync'     => 'hashSync',
        // [F2b] قبلاً نبود؛ بدون آن features.cardModal از PHP هرگز نمی‌رسید
        'card_modal'    => 'cardModal',
    );

    /** نگاشت تنظیمات grid (ورودی → کلید JS) */
    private const GRID = array(
        'columns'      => 'gridCols',
        'item_size'    => 'itemSize',
        'gap'          => 'gap',
        'zoom_in'      => 'zoomIn',
        'zoom_out'     => 'zoomOut',
        'drag_speed'   => 'dragSpeed',
        'focus_scale'  => 'focusScale',
        'dim_opacity'  => 'dimOpacity',
        'curvature'    => 'curvatureStrength',
        'fog_near'     => 'fogNear',
        'fog_far'      => 'fogFar',
        'bg_opacity'   => 'bgOpacity',
        'bg_line_size' => 'bgLineThickness',
    );

    /**
     * [F11] بازه‌ی مجاز (کلید JS → [min, max, فقط‌صحیح؟]).
     * باید با GRID_LIMITS در assets/src/core/Config.js یکی نگه داشته شود.
     */
    private const GRID_LIMITS = array(
        'gridCols'          => array(1, 24, true),
        'itemSize'          => array(0.5, 10, false),
        'gap'               => array(0, 5, false),
        'zoomIn'            => array(2, 80, false),
        'zoomOut'           => array(5, 160, false),
        'dragSpeed'         => array(0.1, 10, false),
        'focusScale'        => array(1, 4, false),
        'dimOpacity'        => array(0, 1, false),
        'curvatureStrength' => array(0, 1, false),
        'fogNear'           => array(0, 500, false),
        'fogFar'            => array(1, 1000, false),
        'bgOpacity'         => array(0, 1, false),
        'bgLineThickness'   => array(0, 1, false),
    );

    /**
     * @param array<string,mixed> $raw ورودی خام.
     * @return array<string,mixed>
     */
    public static function normalize(array $raw): array
    {
        $orderby = (string) self::scalar($raw['orderby'] ?? 'date');
        if (!in_array($orderby, array('date', 'title', 'price', 'popularity', 'rand', 'menu_order'), true)) {
            $orderby = 'date';
        }
        $order = strtoupper((string) self::scalar($raw['order'] ?? 'DESC')) === 'ASC' ? 'ASC' : 'DESC';

        $theme = (string) self::scalar($raw['theme'] ?? 'auto');
        if (!in_array($theme, array('auto', 'light', 'dark'), true)) {
            $theme = 'auto';
        }
        $card = (string) self::scalar($raw['card_position'] ?? 'end') === 'start' ? 'start' : 'end';

        $grid = array();
        foreach (self::GRID as $in => $out) {
            if (isset($raw[$in]) && $raw[$in] !== '') {
                $value = self::scalar($raw[$in]);
                if (is_numeric($value)) {
                    // [F11] clamp سمت سرور؛ gridCols=0 یا مقدار منفی دیگر به JS نمی‌رسد
                    $grid[$out] = self::clampGrid($out, (float) $value);
                }
            }
        }
        // [F11] روابط بین مقادیر (همان منطق JS)
        if (isset($grid['zoomIn'], $grid['zoomOut']) && $grid['zoomOut'] <= $grid['zoomIn']) {
            $grid['zoomOut'] = $grid['zoomIn'] + 1;
        }
        if (isset($grid['fogNear'], $grid['fogFar']) && $grid['fogFar'] <= $grid['fogNear']) {
            $grid['fogFar'] = $grid['fogNear'] + 1;
        }

        $bg = isset($raw['bg_color']) ? sanitize_hex_color((string) self::scalar($raw['bg_color'])) : null;
        if ($bg) {
            $grid['bgColor'] = $bg;
        }

        $features = array();
        foreach (self::FEATURES as $in => $out) {
            $features[$out] = self::bool($raw[$in] ?? null, true);
        }

        return array(
            'limit'            => max(1, min(300, (int) self::scalar($raw['limit'] ?? 60))),
            'categories'       => self::listOf($raw['categories'] ?? ($raw['category'] ?? '')),
            'orderby'          => $orderby,
            'order'            => $order,
            'only_in_stock'    => self::bool($raw['only_in_stock'] ?? null, false),
            'height'           => self::cssLength($raw['height'] ?? '100vh'),
            'title'            => sanitize_text_field((string) ($raw['title'] ?? '')),
            'theme'            => $theme,
            'card_position'    => $card,
            // [F2b] preset: فقط اسلاگ مجاز؛ نامعتبر → پیش‌فرض (همان regex سمت JS)
            'preset'           => self::preset($raw['preset'] ?? ''),
            'start_collection' => sanitize_title((string) ($raw['start_collection'] ?? 'all')) ?: 'all',
            'grid'             => $grid,
            'features'         => $features,
        );
    }

    /**
     * [F2b] اسلاگ پیش‌تنظیم: حروف کوچک، عدد، خط تیره و زیرخط (حداکثر ۳۲ کاراکتر).
     *
     * @param mixed $value مقدار خام.
     */
    public static function preset($value): string
    {
        $s = strtolower(trim((string) self::scalar($value)));
        return preg_match('/^[a-z0-9_-]{1,32}$/', $s) === 1 ? $s : self::DEFAULT_PRESET;
    }

    /**
     * [F11] مقدار را در بازه‌ی GRID_LIMITS نگه می‌دارد.
     */
    private static function clampGrid(string $key, float $value): float
    {
        if (!is_finite($value)) {
            $value = 0.0;
        }
        if (!isset(self::GRID_LIMITS[$key])) {
            return $value;
        }
        list($min, $max, $int) = self::GRID_LIMITS[$key];
        $value = max((float) $min, min((float) $max, $value));
        return $int ? (float) round($value) : $value;
    }

    /**
     * @param mixed $value مقدار.
     * @return mixed
     */
    public static function scalar($value)
    {
        if (is_array($value)) {
            return $value['size'] ?? ($value[0] ?? '');
        }
        return $value;
    }

    /**
     * @param mixed $value   مقدار.
     * @param bool  $default پیش‌فرض اگر مقدار null باشد.
     */
    public static function bool($value, bool $default): bool
    {
        if ($value === null) {
            return $default;
        }
        if (is_bool($value)) {
            return $value;
        }
        $v = strtolower(trim((string) $value));
        if ($v === '') {
            // سوئیچر المنتور در حالت خاموش مقدار خالی می‌فرستد
            return false;
        }
        return in_array($v, array('1', 'yes', 'true', 'on'), true);
    }

    /**
     * @param mixed $value آرایه یا رشته‌ی جداشده با ویرگول.
     * @return string[]
     */
    public static function listOf($value): array
    {
        if (is_string($value)) {
            $value = explode(',', $value);
        }
        if (!is_array($value)) {
            return array();
        }
        $out = array();
        foreach ($value as $item) {
            $s = sanitize_title((string) $item);
            if ($s !== '') {
                $out[] = $s;
            }
        }
        return $out;
    }

    /**
     * @param mixed $value طول CSS یا آرایه‌ی اسلایدر المنتور.
     */
    public static function cssLength($value): string
    {
        $unit = 'px';
        if (is_array($value)) {
            $unit  = isset($value['unit']) ? (string) $value['unit'] : 'px';
            $value = $value['size'] ?? '';
        }
        $value = trim((string) $value);
        if ($value === '') {
            return '100vh';
        }
        if (preg_match('/^\d+(\.\d+)?(px|vh|vw|rem|em|%|svh|dvh)?$/', $value, $m)) {
            return isset($m[2]) ? $value : $value . $unit;
        }
        return '100vh';
    }
}
