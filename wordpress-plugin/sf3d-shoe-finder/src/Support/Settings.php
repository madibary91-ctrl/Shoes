<?php

declare(strict_types=1);

namespace SF3D\Plugin\Support;

/**
 * نرمال‌سازی تنظیمات ورودی از شورت‌کد، المنتور و بلوک گوتنبرگ به یک ساختار واحد.
 */
final class Settings
{
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
                    $grid[$out] = (float) $value;
                }
            }
        }
        $bg = isset($raw['bg_color']) ? sanitize_hex_color((string) $raw['bg_color']) : null;
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
            'start_collection' => sanitize_title((string) ($raw['start_collection'] ?? 'all')) ?: 'all',
            'grid'             => $grid,
            'features'         => $features,
        );
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
