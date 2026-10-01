<?php

declare(strict_types=1);

namespace SF3D\Plugin\Widget;

use Elementor\Controls_Manager;
use Elementor\Group_Control_Typography;
use Elementor\Widget_Base;
use SF3D\Plugin\Contracts\RendererInterface;
use SF3D\Plugin\Support\Container;
use SF3D\Plugin\Support\Settings;

/**
 * ویجت المنتور «SF3D Shoe Finder».
 */
final class ShoeFinderWidget extends Widget_Base
{
    /** @var Container|null */
    private $container;

    /**
     * @param array<string,mixed> $data      داده‌ی المنت.
     * @param array|null          $args      آرگومان‌ها.
     * @param Container|null      $container کانتینر سرویس‌ها.
     */
    public function __construct($data = array(), $args = null, ?Container $container = null)
    {
        parent::__construct($data, $args);
        $this->container = $container;
    }

    public function get_name()
    {
        return 'sf3d_shoe_finder';
    }

    public function get_title()
    {
        return __('SF3D Shoe Finder', 'sf3d-shoe-finder');
    }

    public function get_icon()
    {
        return 'eicon-products';
    }

    public function get_categories()
    {
        return array('sf3d', 'woocommerce-elements', 'general');
    }

    public function get_keywords()
    {
        return array('shoe', 'product', '3d', 'woocommerce', 'grid', 'کفش', 'محصول');
    }

    public function get_script_depends()
    {
        return array('sf3d');
    }

    public function get_style_depends()
    {
        return array('sf3d');
    }

    /**
     * @return array<string,string>
     */
    private function productCategories(): array
    {
        $out   = array();
        $terms = get_terms(array('taxonomy' => 'product_cat', 'hide_empty' => false));
        if (is_array($terms)) {
            foreach ($terms as $term) {
                $out[(string) $term->slug] = (string) $term->name;
            }
        }
        return $out;
    }

    protected function register_controls()
    {
        $d = 'sf3d-shoe-finder';

        // ---- محتوا: کوئری ----
        $this->start_controls_section('section_query', array('label' => __('محصولات', $d), 'tab' => Controls_Manager::TAB_CONTENT));
        $this->add_control('title', array('label' => __('عنوان هدر', $d), 'type' => Controls_Manager::TEXT, 'default' => ''));
        $this->add_control('limit', array('label' => __('تعداد محصولات', $d), 'type' => Controls_Manager::NUMBER, 'default' => 60, 'min' => 1, 'max' => 300));
        $this->add_control('categories', array('label' => __('دسته‌ها', $d), 'type' => Controls_Manager::SELECT2, 'multiple' => true, 'options' => $this->productCategories(), 'label_block' => true));
        $this->add_control('orderby', array(
            'label'   => __('مرتب‌سازی بر اساس', $d), 'type' => Controls_Manager::SELECT, 'default' => 'date',
            'options' => array('date' => __('جدیدترین', $d), 'title' => __('عنوان', $d), 'price' => __('قیمت', $d), 'popularity' => __('محبوبیت', $d), 'menu_order' => __('ترتیب دستی', $d), 'rand' => __('تصادفی', $d)),
        ));
        $this->add_control('order', array('label' => __('جهت', $d), 'type' => Controls_Manager::SELECT, 'default' => 'DESC', 'options' => array('DESC' => __('نزولی', $d), 'ASC' => __('صعودی', $d))));
        $this->add_control('only_in_stock', array('label' => __('فقط موجود', $d), 'type' => Controls_Manager::SWITCHER, 'return_value' => 'yes', 'default' => ''));
        $this->add_control('start_collection', array('label' => __('کلکسیون شروع (slug)', $d), 'type' => Controls_Manager::TEXT, 'default' => 'all'));
        $this->end_controls_section();

        // ---- محتوا: چیدمان ----
        $this->start_controls_section('section_layout', array('label' => __('چیدمان و دوربین', $d), 'tab' => Controls_Manager::TAB_CONTENT));
        $this->add_control('height', array(
            'label' => __('ارتفاع', $d), 'type' => Controls_Manager::SLIDER, 'size_units' => array('px', 'vh'),
            'range' => array('px' => array('min' => 360, 'max' => 1400), 'vh' => array('min' => 40, 'max' => 100)),
            'default' => array('size' => 100, 'unit' => 'vh'),
        ));
        $this->add_control('columns', array('label' => __('تعداد ستون', $d), 'type' => Controls_Manager::NUMBER, 'default' => 8, 'min' => 1, 'max' => 20));
        $this->add_control('item_size', array('label' => __('اندازه‌ی کاشی', $d), 'type' => Controls_Manager::NUMBER, 'default' => 2.5, 'step' => 0.1, 'min' => 1, 'max' => 6));
        $this->add_control('gap', array('label' => __('فاصله', $d), 'type' => Controls_Manager::NUMBER, 'default' => 0.4, 'step' => 0.1, 'min' => 0, 'max' => 3));
        $this->add_control('zoom_in', array('label' => __('زوم نزدیک', $d), 'type' => Controls_Manager::NUMBER, 'default' => 12));
        $this->add_control('zoom_out', array('label' => __('زوم دور (شروع)', $d), 'type' => Controls_Manager::NUMBER, 'default' => 31));
        $this->add_control('card_position', array('label' => __('جایگاه کارت', $d), 'type' => Controls_Manager::SELECT, 'default' => 'end', 'options' => array('end' => __('انتها', $d), 'start' => __('ابتدا', $d))));
        $this->add_control('theme', array('label' => __('تم', $d), 'type' => Controls_Manager::SELECT, 'default' => 'auto', 'options' => array('auto' => __('خودکار', $d), 'light' => __('روشن', $d), 'dark' => __('تاریک', $d))));
        $this->end_controls_section();

        // ---- محتوا: قابلیت‌ها ----
        $this->start_controls_section('section_features', array('label' => __('قابلیت‌ها', $d), 'tab' => Controls_Manager::TAB_CONTENT));
        $features = array(
            'wishlist'      => __('علاقه‌مندی‌ها', $d),
            'quick_actions' => __('Quick Actions (هاور)', $d),
            'badges'        => __('نشان‌ها (حراج/جدید/ناموجود)', $d),
            'gallery'       => __('گالری تصاویر', $d),
            'related'       => __('محصولات مشابه', $d),
            'search'        => __('جستجوی زنده', $d),
            'dark_mode'     => __('تغییر تم تاریک', $d),
            'filters'       => __('فیلتر سایز/رنگ', $d),
            'sort'          => __('مرتب‌سازی', $d),
            'bulk'          => __('انتخاب چندگانه', $d),
            'recent'        => __('اخیراً دیده‌شده', $d),
            'cart_drawer'   => __('دراور سبد خرید', $d),
            'minimap'       => __('مینی‌مپ', $d),
            'hash_sync'     => __('لینک مستقیم (#product-ID)', $d),
        );
        foreach ($features as $key => $label) {
            $this->add_control($key, array('label' => $label, 'type' => Controls_Manager::SWITCHER, 'return_value' => 'yes', 'default' => 'yes'));
        }
        $this->end_controls_section();

        // ---- حرکت و فیزیک ----
        $this->start_controls_section('section_motion', array('label' => __('حرکت و فیزیک', $d), 'tab' => Controls_Manager::TAB_CONTENT));
        $this->add_control('drag_speed', array('label' => __('سرعت درگ', $d), 'type' => Controls_Manager::NUMBER, 'default' => 2.2, 'step' => 0.1));
        $this->add_control('focus_scale', array('label' => __('مقیاس فوکوس', $d), 'type' => Controls_Manager::NUMBER, 'default' => 1.5, 'step' => 0.1));
        $this->add_control('dim_opacity', array('label' => __('شفافیت کاشی‌های کم‌رنگ', $d), 'type' => Controls_Manager::NUMBER, 'default' => 0.15, 'step' => 0.05, 'min' => 0, 'max' => 1));
        $this->add_control('curvature', array('label' => __('خمیدگی سه‌بعدی', $d), 'type' => Controls_Manager::NUMBER, 'default' => 0.06, 'step' => 0.01));
        $this->add_control('fog_near', array('label' => __('شروع مه', $d), 'type' => Controls_Manager::NUMBER, 'default' => 19));
        $this->add_control('fog_far', array('label' => __('پایان مه', $d), 'type' => Controls_Manager::NUMBER, 'default' => 100));
        $this->add_control('bg_opacity', array('label' => __('شفافیت خطوط پس‌زمینه', $d), 'type' => Controls_Manager::NUMBER, 'default' => 0.4, 'step' => 0.05));
        $this->end_controls_section();

        // ---- استایل ----
        $this->start_controls_section('section_style', array('label' => __('رنگ‌ها و تایپوگرافی', $d), 'tab' => Controls_Manager::TAB_STYLE));
        $this->add_control('bg_color', array(
            'label' => __('رنگ پس‌زمینه', $d), 'type' => Controls_Manager::COLOR,
            'selectors' => array('{{WRAPPER}} .sf3d-root' => '--sf3d-bg: {{VALUE}};'),
        ));
        $this->add_control('text_color', array(
            'label' => __('رنگ متن', $d), 'type' => Controls_Manager::COLOR,
            'selectors' => array('{{WRAPPER}} .sf3d-root' => '--sf3d-fg: {{VALUE}};'),
        ));
        $this->add_control('surface_color', array(
            'label' => __('رنگ کارت', $d), 'type' => Controls_Manager::COLOR,
            'selectors' => array('{{WRAPPER}} .sf3d-root' => '--sf3d-surface: {{VALUE}};'),
        ));
        $this->add_control('accent_color', array(
            'label' => __('رنگ تأکید (دکمه‌ها)', $d), 'type' => Controls_Manager::COLOR,
            'selectors' => array('{{WRAPPER}} .sf3d-root' => '--sf3d-accent: {{VALUE}};'),
        ));
        $this->add_control('island_color', array(
            'label' => __('رنگ Dynamic Island', $d), 'type' => Controls_Manager::COLOR,
            'selectors' => array('{{WRAPPER}} .sf3d-root' => '--sf3d-island: {{VALUE}};'),
        ));
        $this->add_control('card_radius', array(
            'label' => __('گردی کارت', $d), 'type' => Controls_Manager::SLIDER, 'range' => array('px' => array('min' => 0, 'max' => 48)),
            'selectors' => array('{{WRAPPER}} .sf3d-card' => 'border-radius: {{SIZE}}{{UNIT}};'),
        ));
        $this->add_group_control(Group_Control_Typography::get_type(), array('name' => 'typography', 'selector' => '{{WRAPPER}} .sf3d-root'));
        $this->end_controls_section();
    }

    protected function render()
    {
        $container = $this->container;
        if (!$container instanceof Container) {
            $container = \SF3D\Plugin\Plugin::instance()->container();
        }
        /** @var RendererInterface $renderer */
        $renderer = $container->make(RendererInterface::class);
        $raw      = $this->get_settings_for_display();
        $settings = Settings::normalize(is_array($raw) ? $raw : array());
        echo $renderer->render($settings); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- HTML ساخته‌شده و escape‌شده توسط Renderer.
    }
}
