<?php

declare(strict_types=1);

namespace SF3D\Plugin\Ajax;

use SF3D\Plugin\Contracts\NonceProvider;
use SF3D\Plugin\Contracts\ProductRepository;
use SF3D\Plugin\Hooks\EventRegistry;

/**
 * اندپوینت‌های wc-ajax:
 *  sf3d_add_to_cart (POST+nonce), sf3d_remove_from_cart (POST+nonce), sf3d_cart,
 *  sf3d_related, sf3d_search, sf3d_product, sf3d_wishlist, sf3d_nonce
 *
 * توجه: nonce در درخواست‌های POST اجباری است و پیش از هر تغییر بررسی می‌شود.
 */
final class AjaxController
{
    public const ACTIONS = array(
        'sf3d_add_to_cart'      => 'addToCart',
        'sf3d_remove_from_cart' => 'removeFromCart',
        'sf3d_cart'             => 'cart',
        'sf3d_related'          => 'related',
        'sf3d_search'           => 'search',
        'sf3d_product'          => 'product',
        'sf3d_wishlist'         => 'wishlist',
        'sf3d_nonce'            => 'nonce',
    );

    /** @var ProductRepository */
    private $products;

    /** @var NonceProvider */
    private $nonce;

    public function __construct(ProductRepository $products, NonceProvider $nonce)
    {
        $this->products = $products;
        $this->nonce    = $nonce;
    }

    public function register(): void
    {
        foreach (self::ACTIONS as $action => $method) {
            add_action('wc_ajax_' . $action, array($this, $method));
        }
    }

    /**
     * بررسی nonce؛ در صورت خطا پاسخ 403 و nonce تازه برمی‌گرداند.
     */
    private function guard(): void
    {
        // سازگاری عقب‌رو: سایت‌ها می‌توانند با این فیلتر موقتاً الزام را بردارند.
        if (!apply_filters('sf3d_require_nonce', true)) {
            return;
        }
        $value = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash((string) $_REQUEST['nonce'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        if (!$this->nonce->verify($value)) {
            wp_send_json_error(
                array(
                    'code'    => 'bad_nonce',
                    'message' => __('نشست شما منقضی شده است. دوباره تلاش کنید.', 'sf3d-shoe-finder'),
                    'nonce'   => $this->nonce->refresh(),
                ),
                403
            );
        }
    }

    private function loadCart(): void
    {
        if (function_exists('wc_load_cart') && (!function_exists('WC') || null === WC()->cart)) {
            wc_load_cart();
        }
    }

    /**
     * @param array<string,mixed> $response پاسخ.
     */
    private function respond(array $response, string $action): void
    {
        $response = (array) EventRegistry::apply(EventRegistry::F_AJAX_RESPONSE, $response, $action);
        wp_send_json_success($response);
    }

    public function nonce(): void
    {
        nocache_headers();
        wp_send_json_success(array('nonce' => $this->nonce->refresh()));
    }

    public function addToCart(): void
    {
        $this->guard();
        $this->loadCart();

        $product_id   = isset($_POST['product_id']) ? absint(wp_unslash($_POST['product_id'])) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Missing
        $variation_id = isset($_POST['variation_id']) ? absint(wp_unslash($_POST['variation_id'])) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Missing
        $quantity     = isset($_POST['quantity']) ? max(1, (int) wc_stock_amount(wp_unslash($_POST['quantity']))) : 1; // phpcs:ignore WordPress.Security.NonceVerification.Missing

        $variation = array();
        if (isset($_POST['variation']) && is_array($_POST['variation'])) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
            foreach (wp_unslash($_POST['variation']) as $key => $value) { // phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
                $variation[sanitize_key((string) $key)] = wc_clean((string) $value);
            }
        }

        $product = $product_id ? wc_get_product($product_id) : false;
        if (!$product || !$product->is_purchasable()) {
            wp_send_json_error(array('code' => 'not_purchasable', 'message' => __('این محصول قابل خرید نیست.', 'sf3d-shoe-finder')), 400);
        }

        EventRegistry::fire(EventRegistry::A_BEFORE_ADD_TO_CART, $product_id, $variation_id, $quantity, $variation);

        $key = WC()->cart->add_to_cart($product_id, $quantity, $variation_id, $variation);
        if (!$key) {
            $message = __('افزودن به سبد ممکن نشد.', 'sf3d-shoe-finder');
            $errors  = wc_get_notices('error');
            if ($errors) {
                $first   = reset($errors);
                $message = wp_strip_all_tags(is_array($first) ? (string) ($first['notice'] ?? $message) : (string) $first);
            }
            wc_clear_notices();
            wp_send_json_error(array('code' => 'add_failed', 'message' => $message), 400);
        }

        EventRegistry::fire(EventRegistry::A_AFTER_ADD_TO_CART, (string) $key, $product_id, $variation_id, $quantity);

        $this->respond(array('cart_item_key' => (string) $key, 'cart' => $this->snapshot()), 'add_to_cart');
    }

    public function removeFromCart(): void
    {
        $this->guard();
        $this->loadCart();
        $key = isset($_POST['cart_item_key']) ? sanitize_text_field(wp_unslash((string) $_POST['cart_item_key'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing
        if ($key === '' || !WC()->cart->remove_cart_item($key)) {
            wp_send_json_error(array('code' => 'remove_failed', 'message' => __('حذف ممکن نشد.', 'sf3d-shoe-finder')), 400);
        }
        $this->respond(array('cart' => $this->snapshot()), 'remove_from_cart');
    }

    public function cart(): void
    {
        nocache_headers();
        $this->loadCart();
        $this->respond(array('cart' => $this->snapshot()), 'cart');
    }

    public function related(): void
    {
        $id = isset($_GET['id']) ? absint(wp_unslash($_GET['id'])) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $this->respond(array('products' => $id ? $this->products->related($id, 4) : array()), 'related');
    }

    public function search(): void
    {
        $q = isset($_GET['q']) ? sanitize_text_field(wp_unslash((string) $_GET['q'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $this->respond(array('products' => $this->products->search($q, 5)), 'search');
    }

    public function product(): void
    {
        $id      = isset($_GET['id']) ? absint(wp_unslash($_GET['id'])) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $product = $id ? $this->products->find($id) : null;
        if (!$product) {
            wp_send_json_error(array('code' => 'not_found', 'message' => __('محصول پیدا نشد.', 'sf3d-shoe-finder')), 404);
        }
        $this->respond(array('product' => $product), 'product');
    }

    /**
     * علاقه‌مندی‌ها: برای کاربر لاگین‌شده در user_meta (sf3d_wishlist) ذخیره می‌شود.
     * اگر ids ارسال شود لیست جایگزین می‌شود، وگرنه فقط لیست فعلی برمی‌گردد.
     */
    public function wishlist(): void
    {
        nocache_headers();
        $user_id = get_current_user_id();
        $ids     = null;
        if (isset($_POST['ids'])) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
            $this->guard();
            $raw = sanitize_text_field(wp_unslash((string) $_POST['ids'])); // phpcs:ignore WordPress.Security.NonceVerification.Missing
            $ids = array_values(array_unique(array_filter(array_map('absint', $raw === '' ? array() : explode(',', $raw)))));
            $ids = array_slice($ids, 0, 500);
        }
        if (!$user_id) {
            $this->respond(array('ids' => $ids ?? array()), 'wishlist');
        }
        if ($ids !== null) {
            update_user_meta($user_id, 'sf3d_wishlist', $ids);
        } else {
            $stored = get_user_meta($user_id, 'sf3d_wishlist', true);
            $ids    = is_array($stored) ? array_values(array_map('intval', $stored)) : array();
        }
        $this->respond(array('ids' => $ids), 'wishlist');
    }

    /**
     * @return array<string,mixed>
     */
    private function snapshot(): array
    {
        $cart  = WC()->cart;
        $items = array();
        foreach ($cart->get_cart() as $key => $item) {
            $product = isset($item['data']) ? $item['data'] : null;
            if (!$product instanceof \WC_Product) {
                continue;
            }
            $image = wp_get_attachment_image_url((int) $product->get_image_id(), 'thumbnail');
            $items[] = array(
                'key'        => (string) $key,
                'product_id' => (int) $item['product_id'],
                'name'       => wp_strip_all_tags($product->get_name()),
                'quantity'   => (int) $item['quantity'],
                'price_html' => wp_kses_post($cart->get_product_price($product)),
                'image'      => is_string($image) && $image !== '' ? $image : (string) wc_placeholder_img_src('thumbnail'),
                'url'        => get_permalink((int) $item['product_id']),
                'attributes' => wp_strip_all_tags((string) wc_get_formatted_cart_item_data($item, true)),
            );
        }
        return array(
            'count'         => (int) $cart->get_cart_contents_count(),
            'subtotal_html' => wp_kses_post($cart->get_cart_subtotal()),
            'items'         => $items,
            'cart_url'      => wc_get_cart_url(),
            'checkout_url'  => wc_get_checkout_url(),
        );
    }
}
