<?php

declare(strict_types=1);

namespace SF3D\Plugin\Widget;

use SF3D\Plugin\Support\Container;

/**
 * اتصال به المنتور: دسته‌ی ویجت، ویجت، Dynamic Tag و جایگزین {{sf3d:product_count}}.
 * اگر المنتور نصب نباشد هیچ‌کدام اجرا نمی‌شوند.
 */
final class ElementorIntegration
{
    /** @var Container */
    private $container;

    public function __construct(Container $container)
    {
        $this->container = $container;
    }

    public function register(): void
    {
        add_action('elementor/elements/categories_registered', array($this, 'categories'));
        add_action('elementor/widgets/register', array($this, 'widgets'));
        if (defined('ELEMENTOR_VERSION') && version_compare((string) ELEMENTOR_VERSION, '3.5', '<')) {
            add_action('elementor/widgets/widgets_registered', array($this, 'widgetsLegacy')); // Elementor < 3.5
        }
        add_action('elementor/dynamic_tags/register', array($this, 'tags'));

        // جایگزین متنی: {{sf3d:product_count}}
        add_filter('the_content', array($this, 'placeholders'), 20);
        add_filter('elementor/widget/render_content', array($this, 'placeholders'), 20);
    }

    /**
     * @param \Elementor\Elements_Manager $manager مدیر دسته‌ها.
     */
    public function categories($manager): void
    {
        $manager->add_category(
            'sf3d',
            array('title' => __('SF3D', 'sf3d-shoe-finder'), 'icon' => 'eicon-products')
        );
    }

    /**
     * @param \Elementor\Widgets_Manager $manager مدیر ویجت‌ها.
     */
    public function widgets($manager): void
    {
        $manager->register(new ShoeFinderWidget(array(), null, $this->container));
    }

    /**
     * @param \Elementor\Widgets_Manager $manager مدیر ویجت‌ها.
     */
    public function widgetsLegacy($manager): void
    {
        if (!method_exists($manager, 'register') && method_exists($manager, 'register_widget_type')) {
            $manager->register_widget_type(new ShoeFinderWidget(array(), null, $this->container));
        }
    }

    /**
     * @param \Elementor\Core\DynamicTags\Manager $manager مدیر تگ‌ها.
     */
    public function tags($manager): void
    {
        $manager->register_group('sf3d', array('title' => __('SF3D', 'sf3d-shoe-finder')));
        $tag = new ProductCountTag();
        if (method_exists($manager, 'register')) {
            $manager->register($tag);
        } elseif (method_exists($manager, 'register_tag')) {
            $manager->register_tag($tag);
        }
    }

    /**
     * @param string $content محتوا.
     */
    public function placeholders($content): string
    {
        $content = (string) $content;
        if (strpos($content, '{{sf3d:') === false) {
            return $content;
        }
        return str_replace('{{sf3d:product_count}}', (string) ProductCountTag::count(), $content);
    }
}
