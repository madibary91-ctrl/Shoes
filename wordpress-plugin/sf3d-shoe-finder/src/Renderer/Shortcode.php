<?php

declare(strict_types=1);

namespace SF3D\Plugin\Renderer;

use SF3D\Plugin\Contracts\RendererInterface;
use SF3D\Plugin\Support\Settings;

/**
 * شورت‌کد [sf3d_shoe_finder] و نام‌های مستعار قدیمی (sf3d, sf3d_grid).
 */
final class Shortcode
{
    public const TAGS = array('sf3d_shoe_finder', 'sf3d', 'sf3d_grid');

    /** @var RendererInterface */
    private $renderer;

    public function __construct(RendererInterface $renderer)
    {
        $this->renderer = $renderer;
    }

    public function register(): void
    {
        foreach (self::TAGS as $tag) {
            add_shortcode($tag, array($this, 'handle'));
        }
    }

    /**
     * @param array<string,string>|string $atts صفات شورت‌کد.
     */
    public function handle($atts = array()): string
    {
        $atts = shortcode_atts(
            array(
                'limit' => '60', 'category' => '', 'categories' => '', 'orderby' => 'date', 'order' => 'DESC',
                'columns' => '', 'height' => '100vh', 'title' => '', 'theme' => 'auto', 'only_in_stock' => 'no',
                'card_position' => 'end', 'start_collection' => 'all',
                'wishlist' => 'yes', 'quick_actions' => 'yes', 'badges' => 'yes', 'gallery' => 'yes', 'related' => 'yes',
                'search' => 'yes', 'dark_mode' => 'yes', 'filters' => 'yes', 'sort' => 'yes', 'bulk' => 'yes',
                'recent' => 'yes', 'cart_drawer' => 'yes', 'minimap' => 'yes', 'hash_sync' => 'yes',
            ),
            is_array($atts) ? $atts : array(),
            'sf3d_shoe_finder'
        );
        return $this->renderer->render(Settings::normalize($atts));
    }
}
