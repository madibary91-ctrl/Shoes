<?php

declare(strict_types=1);

namespace SF3D\Plugin\Widget;

use SF3D\Plugin\Contracts\RendererInterface;
use SF3D\Plugin\Support\Settings;

/**
 * بلوک گوتنبرگ sf3d/shoe-finder (داینامیک؛ رندر سمت سرور با همان Renderer).
 */
final class Block
{
    /** @var RendererInterface */
    private $renderer;

    /** @var string */
    private $dir;

    /** @var string */
    private $url;

    public function __construct(RendererInterface $renderer, string $dir, string $url)
    {
        $this->renderer = $renderer;
        $this->dir      = rtrim($dir, '/\\') . '/';
        $this->url      = rtrim($url, '/') . '/';
    }

    public function register(): void
    {
        add_action('init', array($this, 'registerBlock'));
    }

    public function registerBlock(): void
    {
        if (!function_exists('register_block_type')) {
            return;
        }
        $base = $this->url . 'blocks/shoe-finder/';
        $ver  = defined('SF3D_VERSION') ? (string) SF3D_VERSION : '2.0.0';
        $deps = array('wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-i18n');

        wp_register_script('sf3d-block-edit', $base . 'edit.js', $deps, $ver, true);
        wp_register_script('sf3d-block-save', $base . 'save.js', $deps, $ver, true);
        wp_register_script('sf3d-block-editor', $base . 'index.js', array_merge($deps, array('sf3d-block-edit', 'sf3d-block-save')), $ver, true);

        register_block_type(
            $this->dir . 'blocks/shoe-finder',
            array('render_callback' => array($this, 'render'))
        );
    }

    /**
     * @param array<string,mixed> $attributes صفات بلوک.
     */
    public function render($attributes = array()): string
    {
        $attributes = is_array($attributes) ? $attributes : array();
        // نام صفات بلوک همان کلیدهای Settings است
        return $this->renderer->render(Settings::normalize($attributes));
    }
}
