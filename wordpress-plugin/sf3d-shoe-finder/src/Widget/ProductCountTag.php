<?php

declare(strict_types=1);

namespace SF3D\Plugin\Widget;

use Elementor\Core\DynamicTags\Tag;

/**
 * Dynamic Tag المنتور: تعداد محصولات منتشرشده.
 * معادل متنی: {{sf3d:product_count}}
 */
final class ProductCountTag extends Tag
{
    public function get_name()
    {
        return 'sf3d-product-count';
    }

    public function get_title()
    {
        return __('SF3D: تعداد محصولات', 'sf3d-shoe-finder');
    }

    public function get_group()
    {
        return 'sf3d';
    }

    public function get_categories()
    {
        return array('text', 'number');
    }

    public function render()
    {
        echo esc_html((string) self::count());
    }

    /**
     * تعداد محصولات منتشرشده.
     */
    public static function count(): int
    {
        $counts = wp_count_posts('product');
        return is_object($counts) && isset($counts->publish) ? (int) $counts->publish : 0;
    }
}
