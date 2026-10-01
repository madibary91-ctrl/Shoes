<?php
/**
 * لایه‌ی سازگاری عقب‌رو: کلاس‌های قدیمی با همان امضا، فقط با اعلان deprecation.
 * (بدون namespace؛ بعد از autoloader لود می‌شود.)
 *
 * @package SF3D
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('SF3D_Renderer', false)) {
    /**
     * @deprecated 2.0.0 از SF3D\Plugin\Renderer\Renderer استفاده کنید.
     */
    class SF3D_Renderer
    {
        /**
         * @param array<string,mixed> $atts صفات (همان صفات قدیمی شورت‌کد).
         * @return string
         */
        public static function render($atts = array())
        {
            _deprecated_function(__METHOD__, '2.0.0', 'SF3D\Plugin\Renderer\Renderer::render()');
            $renderer = \SF3D\Plugin\Plugin::instance()->container()->make(\SF3D\Plugin\Contracts\RendererInterface::class);
            return $renderer->render(\SF3D\Plugin\Support\Settings::normalize(is_array($atts) ? $atts : array()));
        }
    }
}

if (!class_exists('SF3D_Data', false)) {
    /**
     * @deprecated 2.0.0 از SF3D\Plugin\Data\PayloadBuilder استفاده کنید.
     */
    class SF3D_Data
    {
        /**
         * @param array<string,mixed> $args آرگومان‌های کوئری.
         * @return array<string,mixed>
         */
        public static function build_payload($args = array())
        {
            _deprecated_function(__METHOD__, '2.0.0', 'SF3D\Plugin\Data\PayloadBuilder::build()');
            $builder = \SF3D\Plugin\Plugin::instance()->container()->make(\SF3D\Plugin\Contracts\PayloadBuilder::class);
            return $builder->build(is_array($args) ? $args : array());
        }
    }
}

if (!class_exists('SF3D_Plugin', false)) {
    /**
     * @deprecated 2.0.0 از SF3D\Plugin\Plugin استفاده کنید.
     */
    class SF3D_Plugin
    {
        /**
         * آدرس wc-ajax؛ بدون endpoint، الگوی %%endpoint%% برمی‌گردد.
         *
         * @param string $endpoint نام endpoint.
         * @return string
         */
        public static function wc_ajax_url($endpoint = '')
        {
            _deprecated_function(__METHOD__, '2.0.0', 'WC_AJAX::get_endpoint()');
            return \WC_AJAX::get_endpoint($endpoint !== '' ? (string) $endpoint : '%%endpoint%%');
        }
    }
}
