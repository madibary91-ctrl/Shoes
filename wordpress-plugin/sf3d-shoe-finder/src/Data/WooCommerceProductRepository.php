<?php

declare(strict_types=1);

namespace SF3D\Plugin\Data;

use SF3D\Plugin\Contracts\ProductRepository;
use SF3D\Plugin\Hooks\EventRegistry;
use WC_Product;
use WC_Product_Variation;
use WP_Query;

/**
 * پیاده‌سازی ProductRepository روی ووکامرس (WC 6.0+).
 */
final class WooCommerceProductRepository implements ProductRepository
{
    /** نام‌های رنگ رایج برای حالتی که term meta رنگ ندارد */
    private const COLOR_NAMES = array(
        'black'  => '#111111', 'white' => '#ffffff', 'red' => '#dc2626', 'blue' => '#2563eb',
        'green'  => '#16a34a', 'yellow' => '#eab308', 'orange' => '#f97316', 'pink' => '#ec4899',
        'purple' => '#9333ea', 'grey' => '#9ca3af', 'gray' => '#9ca3af', 'brown' => '#92400e',
        'beige'  => '#d6c3a1', 'navy' => '#1e3a8a', 'silver' => '#c0c0c0', 'gold' => '#d4af37',
        'مشکی'   => '#111111', 'سفید' => '#ffffff', 'قرمز' => '#dc2626', 'آبی' => '#2563eb',
        'سبز'    => '#16a34a', 'زرد' => '#eab308', 'نارنجی' => '#f97316', 'صورتی' => '#ec4899',
        'بنفش'   => '#9333ea', 'طوسی' => '#9ca3af', 'قهوه‌ای' => '#92400e', 'کرم' => '#d6c3a1',
        'سرمه‌ای' => '#1e3a8a',
    );

    /** کلیدهای term meta که ممکن است hex رنگ را نگه دارند */
    private const HEX_META_KEYS = array('color_hex', 'sf3d_color', 'product_attribute_color', '_color', 'color', 'pa_color');

    /** کلیدهای term meta که ممکن است تصویر نمونه را نگه دارند */
    private const THUMB_META_KEYS = array('thumbnail_id', 'product_attribute_image', 'image_id', 'sf3d_image');

    /**
     * [F13] کش درون‌درخواستی نتیجه‌ی wc_get_attribute_taxonomies().
     *
     * @var array<int,object>|null
     */
    private $attributeTaxonomies = null;

    /**
     * [F13] کش درون‌درخواستی get_term_by (کلید: taxonomy|slug).
     *
     * @var array<string,mixed>
     */
    private $termCache = array();

    /**
     * @param array<string,mixed> $args آرگومان‌ها.
     * @return array<int,array<string,mixed>>
     */
    public function all(array $args = array()): array
    {
        $limit   = isset($args['limit']) ? max(1, min(300, (int) $args['limit'])) : 60;
        $orderby = isset($args['orderby']) ? (string) $args['orderby'] : 'date';
        $order   = isset($args['order']) && strtoupper((string) $args['order']) === 'ASC' ? 'ASC' : 'DESC';

        $query_args = array(
            'post_type'           => 'product',
            'post_status'         => 'publish',
            // [F3] محصولات رمزدار هرگز در شبکه نمی‌آیند
            'has_password'        => false,
            'posts_per_page'      => $limit,
            'order'               => $order,
            'fields'              => 'ids',
            'no_found_rows'       => true,
            'ignore_sticky_posts' => true,
            // [F3] exclude-from-catalog شامل محصول «مخفی» (hidden) هم می‌شود
            'tax_query'           => array(
                array(
                    'taxonomy' => 'product_visibility',
                    'field'    => 'name',
                    'terms'    => array('exclude-from-catalog'),
                    'operator' => 'NOT IN',
                ),
            ),
        );

        switch ($orderby) {
            case 'price':
                $query_args['meta_key'] = '_price'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
                $query_args['orderby']  = 'meta_value_num';
                break;
            case 'popularity':
                $query_args['meta_key'] = 'total_sales'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
                $query_args['orderby']  = 'meta_value_num';
                break;
            default:
                $query_args['orderby'] = in_array($orderby, array('date', 'title', 'rand', 'menu_order'), true) ? $orderby : 'date';
        }

        if (!empty($args['categories']) && is_array($args['categories'])) {
            $query_args['tax_query'][] = array(
                'taxonomy' => 'product_cat',
                'field'    => 'slug',
                'terms'    => array_map('strval', $args['categories']),
            );
        }
        // [F3] گزینه‌ی ووکامرس «پنهان کردن محصولات ناموجود» هم رعایت می‌شود
        if (!empty($args['only_in_stock']) || 'yes' === get_option('woocommerce_hide_out_of_stock_items')) {
            $query_args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
                array('key' => '_stock_status', 'value' => 'instock'),
            );
        }
        if (!empty($args['include']) && is_array($args['include'])) {
            $query_args['post__in'] = array_map('absint', $args['include']);
        }
        if (!empty($args['exclude']) && is_array($args['exclude'])) {
            $query_args['post__not_in'] = array_map('absint', $args['exclude']);
        }

        /**
         * فیلتر آرگومان‌های WP_Query.
         *
         * @param array $query_args آرگومان‌های کوئری.
         * @param array $args       آرگومان‌های ورودی.
         */
        $query_args = EventRegistry::apply(EventRegistry::F_QUERY_ARGS, $query_args, $args);

        $query = new WP_Query($query_args);
        return $this->hydrate(array_map('intval', (array) $query->posts), 'catalog');
    }

    /**
     * @return array<string,mixed>|null
     */
    public function find(int $id): ?array
    {
        $product = wc_get_product($id);
        // [F3] محصول رمزدار، مخفی، پیش‌نویس و variation (با شناسه‌ی مستقیم) → null (یعنی 404)
        if (!$product instanceof WC_Product || !$this->isPublic($product, 'any')) {
            return null;
        }
        $this->primeProducts(array($product));
        return $this->serialize($product);
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function search(string $query, int $limit = 5): array
    {
        $query = trim($query);
        if ($query === '') {
            return array();
        }
        $wp_query = new WP_Query(
            array(
                'post_type'      => 'product',
                'post_status'    => 'publish',
                // [F3] رمزدار و «مخفی از جستجو» حذف می‌شوند
                'has_password'   => false,
                's'              => $query,
                'posts_per_page' => max(1, min(20, $limit)),
                'fields'         => 'ids',
                'no_found_rows'  => true,
                'tax_query'      => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
                    array(
                        'taxonomy' => 'product_visibility',
                        'field'    => 'name',
                        'terms'    => array('exclude-from-search'),
                        'operator' => 'NOT IN',
                    ),
                ),
            )
        );
        return $this->hydrate(array_map('intval', (array) $wp_query->posts), 'search');
    }

    /**
     * @return array<int,array{id:int,slug:string,name:string,count:int}>
     */
    public function categories(): array
    {
        $terms = get_terms(
            array(
                'taxonomy'   => 'product_cat',
                'hide_empty' => true,
                'exclude'    => array((int) get_option('default_product_cat')),
            )
        );
        if (is_wp_error($terms) || !is_array($terms)) {
            return array();
        }
        $out = array();
        foreach ($terms as $term) {
            $out[] = array(
                'id'    => (int) $term->term_id,
                'slug'  => (string) $term->slug,
                'name'  => wp_specialchars_decode((string) $term->name),
                'count' => (int) $term->count,
            );
        }
        return $out;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function related(int $id, int $limit = 4): array
    {
        // [F3] خود محصول مبدأ هم باید عمومی باشد؛ وگرنه لیست مشابه‌ها هم چیزی لو می‌دهد
        $origin = wc_get_product($id);
        if (!$origin instanceof WC_Product || !$this->isPublic($origin, 'any')) {
            return array();
        }

        $ids = array_map('intval', (array) wc_get_related_products($id, $limit));
        if (!$ids) {
            // جایگزین: همان دسته، بدون خود محصول (all() خودش فیلتر عمومی بودن را اعمال می‌کند)
            $cats = wc_get_product_cat_ids($id);
            if ($cats) {
                $rows = $this->all(array('categories' => $this->slugsFromIds($cats), 'limit' => $limit + 1, 'exclude' => array($id)));
                return array_slice($rows, 0, $limit);
            }
        }
        return $this->hydrate(array_slice($ids, 0, $limit), 'any');
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function filters(): array
    {
        $groups = array();
        if (!function_exists('wc_get_attribute_taxonomies')) {
            return $groups;
        }
        foreach ($this->attributeTaxonomies() as $tax) {
            $taxonomy = wc_attribute_taxonomy_name((string) $tax->attribute_name);
            if (!taxonomy_exists($taxonomy)) {
                continue;
            }
            $terms = get_terms(array('taxonomy' => $taxonomy, 'hide_empty' => true));
            if (is_wp_error($terms) || !is_array($terms) || !$terms || count($terms) > 60) {
                continue;
            }
            $key  = (string) $tax->attribute_name;
            $type = $this->isColorKey($key) ? 'color' : 'select';
            $opts = array();
            foreach ($terms as $term) {
                $opts[] = array(
                    'value' => (string) $term->slug,
                    'label' => wp_specialchars_decode((string) $term->name),
                    'hex'   => $type === 'color' ? $this->termHex($term) : '',
                );
            }
            $groups[] = array(
                'key'     => $key,
                'label'   => (string) $tax->attribute_label !== '' ? (string) $tax->attribute_label : $key,
                'type'    => $type,
                'options' => $opts,
            );
        }
        return $groups;
    }

    /**
     * [F3] آیا محصول اجازه‌ی نمایش عمومی دارد؟
     *
     * - فقط post_type=product با وضعیت publish (variation و پیش‌نویس رد می‌شوند)
     * - بدون رمز (post_password). عمداً از post_password_required() استفاده نشده؛
     *   آن تابع به کوکی کاربر وابسته است و پاسخ‌ها/کش مشترک بین کاربران را نشت می‌داد.
     * - catalog_visibility:
     *     any     → هر چیز جز hidden
     *     catalog → visible | catalog   (شبکه)
     *     search  → visible | search    (جستجو)
     *
     * @param WC_Product $product محصول.
     * @param string     $context any|catalog|search.
     */
    private function isPublic(WC_Product $product, string $context = 'any'): bool
    {
        $id = $product->get_id();
        if ($product->is_type('variation') || get_post_type($id) !== 'product') {
            return false;
        }
        if (get_post_status($id) !== 'publish') {
            return false;
        }
        if ((string) get_post_field('post_password', $id) !== '') {
            return false;
        }

        $visibility = (string) $product->get_catalog_visibility();
        switch ($context) {
            case 'catalog':
                $ok = in_array($visibility, array('visible', 'catalog'), true);
                break;
            case 'search':
                $ok = in_array($visibility, array('visible', 'search'), true);
                break;
            default:
                $ok = $visibility !== 'hidden';
        }

        /**
         * فیلتر نهایی عمومی‌بودن محصول (مثلاً برای محدودیت‌های سفارشی).
         *
         * @param bool       $ok      نتیجه.
         * @param WC_Product $product محصول.
         * @param string     $context زمینه.
         */
        return (bool) apply_filters('sf3d_is_public_product', $ok, $product, $context);
    }

    /**
     * @param int[]  $ids     شناسه‌ها.
     * @param string $context any|catalog|search (برای isPublic).
     * @return array<int,array<string,mixed>>
     */
    private function hydrate(array $ids, string $context = 'any'): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if (!$ids) {
            return array();
        }

        // [F13] پست‌ها + ترم‌ها + متا با ۳ کوئری دسته‌ای (به‌جای چند کوئری برای هر محصول)
        $this->primePosts($ids, true, true);

        $products = array();
        foreach ($ids as $id) {
            $product = wc_get_product($id);
            // [F3] دفاع دوم: حتی اگر WP_Query چیزی رد کرده باشد، اینجا دوباره بررسی می‌شود
            if ($product instanceof WC_Product && $this->isPublic($product, $context)) {
                $products[] = $product;
            }
        }

        // [F13] variationها و تصاویر هم یک‌جا prime می‌شوند
        $this->primeProducts($products);

        $out = array();
        foreach ($products as $product) {
            $out[] = $this->serialize($product);
        }
        return $out;
    }

    /**
     * [F13] پر کردن کش آبجکت برای پست‌ها (یک کوئری دسته‌ای).
     * _prime_post_caches تابع داخلی وردپرس است ولی پایدار و پرکاربرد؛ در نبودش به update_meta_cache برمی‌گردیم.
     *
     * @param int[] $ids         شناسه‌ها.
     * @param bool  $with_terms  کش ترم‌ها.
     * @param bool  $with_meta   کش متا.
     */
    private function primePosts(array $ids, bool $with_terms, bool $with_meta): void
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if (!$ids) {
            return;
        }
        if (function_exists('_prime_post_caches')) {
            _prime_post_caches($ids, $with_terms, $with_meta);
            return;
        }
        if ($with_meta) {
            update_meta_cache('post', $ids);
        }
    }

    /**
     * [F13] قبل از serialize: کش variationها و پیوست‌ها (تصویر شاخص، گالری، تصویر variation) را prime می‌کند.
     * قبلاً برای ۶۰ محصول × ۱۰۰ variation تا ~۶۰۰۰ کوئری جدا ساخته می‌شد.
     *
     * @param WC_Product[] $products محصولات.
     */
    private function primeProducts(array $products): void
    {
        $children    = array();
        $attachments = array();

        foreach ($products as $product) {
            $attachments[] = (int) $product->get_image_id();
            foreach ($product->get_gallery_image_ids() as $gid) {
                $attachments[] = (int) $gid;
            }
            if ($product->is_type('variable')) {
                $limit = $this->maxVariations($product);
                foreach (array_slice($product->get_children(), 0, $limit) as $vid) {
                    $children[] = (int) $vid;
                }
            }
        }

        // variationها: پست + متا (ترم لازم نیست)
        $this->primePosts($children, false, true);

        // تصویر variationها از متای کش‌شده خوانده می‌شود (کوئری اضافه ندارد)
        foreach ($children as $vid) {
            $attachments[] = (int) get_post_meta($vid, '_thumbnail_id', true);
        }

        // پیوست‌ها: پست + متا (برای wp_get_attachment_image_url)
        $this->primePosts($attachments, false, true);
    }

    /**
     * @param WC_Product $product محصول.
     */
    private function maxVariations(WC_Product $product): int
    {
        return max(0, (int) apply_filters('sf3d_max_variations', 100, $product));
    }

    /**
     * [F13] wc_get_attribute_taxonomies() فقط یک‌بار در هر درخواست صدا زده می‌شود.
     *
     * @return array<int,object>
     */
    private function attributeTaxonomies(): array
    {
        if ($this->attributeTaxonomies === null) {
            $this->attributeTaxonomies = function_exists('wc_get_attribute_taxonomies')
                ? array_values((array) wc_get_attribute_taxonomies())
                : array();
        }
        return $this->attributeTaxonomies;
    }

    /**
     * @param int[] $ids شناسه‌ی ترم‌ها.
     * @return string[]
     */
    private function slugsFromIds(array $ids): array
    {
        $slugs = array();
        foreach ($ids as $id) {
            $term = get_term((int) $id, 'product_cat');
            if ($term && !is_wp_error($term)) {
                $slugs[] = (string) $term->slug;
            }
        }
        return $slugs;
    }

    /**
     * تبدیل WC_Product به آرایه‌ی JSON-safe.
     *
     * @return array<string,mixed>
     */
    private function serialize(WC_Product $product): array
    {
        $id       = $product->get_id();
        $variable = $product->is_type('variable');

        $image = $this->imageUrl((int) $product->get_image_id());
        $gallery = array();
        foreach ($product->get_gallery_image_ids() as $gid) {
            $url = wp_get_attachment_image_url((int) $gid, 'woocommerce_single');
            if (is_string($url) && $url !== '') {
                $gallery[] = $url;
            }
        }

        $variations           = array();
        $variation_attributes = array();
        $max_discount         = 0;
        $managed_total        = null;

        if ($variable) {
            $variation_attributes = $this->variationAttributes($product);
            $limit = $this->maxVariations($product);
            foreach (array_slice($product->get_children(), 0, $limit) as $vid) {
                $v = wc_get_product((int) $vid);
                if (!$v instanceof WC_Product_Variation || !$v->variation_is_visible()) {
                    continue;
                }
                $vprice = (float) wc_get_price_to_display($v);
                $vreg   = (float) wc_get_price_to_display($v, array('price' => $v->get_regular_price()));
                if ($vreg > 0 && $vprice < $vreg) {
                    $max_discount = max($max_discount, (int) round((1 - $vprice / $vreg) * 100));
                }
                $qty = $v->managing_stock() ? (int) $v->get_stock_quantity() : null;
                if ($qty !== null) {
                    $managed_total = (int) $managed_total + max(0, $qty);
                }
                $vimg        = (int) $v->get_image_id();
                $variations[] = array(
                    'id'             => (int) $vid,
                    'attributes'     => array_map('strval', (array) $v->get_variation_attributes()),
                    'in_stock'       => (bool) $v->is_in_stock(),
                    'price'          => $vprice,
                    'regular_price'  => $vreg,
                    'stock_quantity' => $qty,
                    'image'          => $vimg && $vimg !== (int) $product->get_image_id() ? $this->imageUrl($vimg) : '',
                );
            }
            $price     = (float) $product->get_variation_price('min', true);
            $price_max = (float) $product->get_variation_price('max', true);
            $regular   = (float) $product->get_variation_regular_price('min', true);
        } else {
            $price     = (float) wc_get_price_to_display($product);
            $price_max = $price;
            $regular   = (float) wc_get_price_to_display($product, array('price' => $product->get_regular_price()));
        }

        $on_sale  = (bool) $product->is_on_sale();
        $discount = $max_discount;
        if (!$variable && $on_sale && $regular > 0 && $price < $regular) {
            $discount = (int) round((1 - $price / $regular) * 100);
        }

        // تازه‌بودن: محصولات ۷ روز اخیر (قابل‌تغییر با فیلتر)
        $created  = $product->get_date_created();
        $new_days = (int) apply_filters('sf3d_new_days', 7, $product);
        $is_new   = $created ? $created->getTimestamp() >= (time() - $new_days * DAY_IN_SECONDS) : false;

        // موجودی
        $qty = $variable ? $managed_total : ($product->managing_stock() ? (int) $product->get_stock_quantity() : null);

        $primary = sanitize_hex_color((string) get_post_meta($id, 'primary_color_hex', true));

        $data = array(
            'id'                  => $id,
            'title'               => wp_specialchars_decode($product->get_name()),
            'slug'                => $product->get_slug(),
            'url'                 => get_permalink($id),
            'excerpt'             => wp_trim_words(wp_strip_all_tags($product->get_short_description()), 18),
            'type'                => $variable ? 'variable' : 'simple',
            'image'               => $image,
            'gallery'             => $gallery,
            'price'               => $price,
            'price_min'           => $price,
            'price_max'           => $price_max,
            'regular_price'       => $regular,
            'on_sale'             => $on_sale,
            'discount'            => max(0, $discount),
            'is_new'              => $is_new,
            'in_stock'            => (bool) $product->is_in_stock(),
            'stock_quantity'      => $qty,
            'low_stock_threshold' => (int) get_option('woocommerce_notify_low_stock_amount', 2),
            'categories'          => array_map('intval', $product->get_category_ids()),
            'attributes'          => $this->filterableAttributes($product, $variation_attributes),
            'variation_attributes' => $variation_attributes,
            'variations'          => $variations,
            'primary_color_hex'   => $primary ? $primary : '',
            'popularity'          => (int) $product->get_total_sales(),
            'date'                => $created ? $created->date('c') : '',
        );

        /**
         * فیلتر داده‌ی هر محصول قبل از JSON.
         *
         * @param array      $data    داده‌ی محصول.
         * @param WC_Product $product آبجکت محصول.
         */
        $data = EventRegistry::apply(EventRegistry::F_PRODUCT_DATA, $data, $product);
        EventRegistry::fire(EventRegistry::A_PRODUCT_SERIALIZED, $data, $product);
        return $data;
    }

    private function imageUrl(int $attachment_id): string
    {
        if ($attachment_id) {
            $url = wp_get_attachment_image_url($attachment_id, 'woocommerce_single');
            if (is_string($url) && $url !== '') {
                return $url;
            }
        }
        return (string) wc_placeholder_img_src('woocommerce_single');
    }

    /**
     * [F13] get_term_by با کش درون‌درخواستی.
     *
     * @return \WP_Term|false
     */
    private function termBySlug(string $slug, string $taxonomy)
    {
        $key = $taxonomy . '|' . $slug;
        if (!array_key_exists($key, $this->termCache)) {
            $this->termCache[$key] = get_term_by('slug', $slug, $taxonomy);
        }
        return $this->termCache[$key];
    }

    /**
     * ویژگی‌های انتخاب‌پذیر یک محصول متغیر (برای فرم Variation + Swatch).
     *
     * @return array<int,array<string,mixed>>
     */
    private function variationAttributes(WC_Product $product): array
    {
        $out = array();
        foreach ((array) $product->get_variation_attributes() as $name => $options) {
            $name    = (string) $name;
            $is_tax  = taxonomy_exists($name);
            $key     = $is_tax ? preg_replace('/^pa_/', '', $name) : sanitize_title($name);
            $type    = $this->isColorKey((string) $key) ? 'color' : 'select';
            $choices = array();
            foreach ((array) $options as $option) {
                $option = (string) $option;
                $label  = $option;
                $hex    = '';
                $thumb  = '';
                if ($is_tax) {
                    $term = $this->termBySlug($option, $name);
                    if ($term && !is_wp_error($term)) {
                        $label = wp_specialchars_decode((string) $term->name);
                        $hex   = $this->termHex($term);
                        $thumb = $this->termThumb($term);
                    }
                }
                if ($type === 'color' && $hex === '' && $thumb === '') {
                    $hex = $this->colorFromName($option) ?: $this->colorFromName($label);
                }
                $choices[] = array('value' => $option, 'label' => $label, 'hex' => $hex, 'thumb' => $thumb);
            }
            $out[] = array(
                'name'    => 'attribute_' . sanitize_title($name),
                'key'     => (string) $key,
                'label'   => wc_attribute_label($name, $product),
                'type'    => $type,
                'options' => $choices,
            );
        }
        return $out;
    }

    /**
     * ویژگی‌های مورد استفاده در فیلتر (key => slugs).
     *
     * @param array<int,array<string,mixed>> $variation_attributes ویژگی‌های Variation.
     * @return array<string,string[]>
     */
    private function filterableAttributes(WC_Product $product, array $variation_attributes): array
    {
        $out = array();
        foreach ($this->attributeTaxonomies() as $tax) {
            $slugs = wc_get_product_terms($product->get_id(), wc_attribute_taxonomy_name((string) $tax->attribute_name), array('fields' => 'slugs'));
            if (is_array($slugs) && $slugs) {
                $out[(string) $tax->attribute_name] = array_map('strval', $slugs);
            }
        }
        foreach ($variation_attributes as $attr) {
            $key = (string) $attr['key'];
            if (!isset($out[$key])) {
                $out[$key] = array_map(static function (array $o): string {
                    return (string) $o['value'];
                }, (array) $attr['options']);
            }
        }
        return $out;
    }

    private function isColorKey(string $key): bool
    {
        $key = strtolower($key);
        return strpos($key, 'color') !== false || strpos($key, 'colour') !== false || strpos($key, 'رنگ') !== false;
    }

    /**
     * @param \WP_Term $term ترم ویژگی.
     */
    private function termHex($term): string
    {
        foreach (self::HEX_META_KEYS as $meta) {
            $v = get_term_meta((int) $term->term_id, $meta, true);
            if (is_string($v) && $v !== '') {
                $hex = sanitize_hex_color($v[0] === '#' ? $v : '#' . $v);
                if ($hex) {
                    return $hex;
                }
            }
        }
        return $this->colorFromName((string) $term->slug) ?: $this->colorFromName((string) $term->name);
    }

    /**
     * @param \WP_Term $term ترم ویژگی.
     */
    private function termThumb($term): string
    {
        foreach (self::THUMB_META_KEYS as $meta) {
            $id = (int) get_term_meta((int) $term->term_id, $meta, true);
            if ($id) {
                $url = wp_get_attachment_image_url($id, 'thumbnail');
                if (is_string($url) && $url !== '') {
                    return $url;
                }
            }
        }
        return '';
    }

    private function colorFromName(string $name): string
    {
        $key = strtolower(trim($name));
        return self::COLOR_NAMES[$key] ?? '';
    }
}
