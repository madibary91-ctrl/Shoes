# SF3D Shoe Finder

شبکه‌ی سه‌بعدی محصولات ووکامرس (WebGL) — الهام‌گرفته از [MatthewGreenberg/shoe-finder](https://github.com/MatthewGreenberg/shoe-finder) — به‌صورت **ویجت المنتور**، **بلوک گوتنبرگ** و **شورت‌کد**.

- PHP 7.4+ ، WordPress 5.8+ ، WooCommerce 6.0+
- باندل JS آماده در `assets/dist/` (بدون نیاز به Node برای نصب). حجم: ~۹۵KB (۳۱KB gzip).

## نصب
1. پوشه‌ی `sf3d-shoe-finder` را در `wp-content/plugins/` قرار دهید (یا ZIP را آپلود کنید) و فعال کنید.
2. (اختیاری) `composer install --no-dev -o` برای autoloader بهینه؛ بدون آن autoloader سبک داخلی کار می‌کند.
3. در المنتور: ویجت **SF3D Shoe Finder** (دسته‌ی SF3D). در گوتنبرگ: بلوک **SF3D Shoe Finder**. یا شورت‌کد:

```
[sf3d_shoe_finder limit="60" category="running,lifestyle" columns="8" height="100vh" theme="auto"]
```

> نام‌های `[sf3d]` و `[sf3d_grid]` به‌عنوان alias قدیمی حفظ شده‌اند.

برای رنگ پیش‌فرض هر محصول یک custom field با نام `primary_color_hex` (مثل `#dc2626`) تعریف کنید.
برای Swatch رنگ: term meta با کلید `color_hex` (یا `thumbnail_id` برای تصویر) روی ترم‌های ویژگی رنگ.

## قابلیت‌ها
Variation Switcher (Swatch رنگ + سایز) · نشان‌های حراج/جدید/ناموجود · گالری با فلش، زوم و اسپینر ۳۶۰ · کش Transient یک‌ساعته با پاک‌سازی خودکار · Nonce · Deep link `#product-ID` · Wishlist (localStorage + user_meta + کلید `W`) · فوریت موجودی · محصولات مشابه · فیلتر چندانتخابی سایز/رنگ (+ `#filter=size:42,color:red`) · Sort · جستجوی زنده · Recently Viewed · دراور سبد · Quick Actions · انتخاب چندگانه (Ctrl/Cmd+کلیک) · تم تاریک · مقایسه · اشتراک‌گذاری · دسترس‌پذیری WCAG 2.2 AA · کاهش حرکت.

## اندپوینت‌های AJAX (`?wc-ajax=`)
| endpoint | متد | nonce |
|---|---|---|
| `sf3d_add_to_cart` | POST | ✔ |
| `sf3d_remove_from_cart` | POST | ✔ |
| `sf3d_wishlist` | POST/GET | ✔ (POST) |
| `sf3d_cart` · `sf3d_related?id=` · `sf3d_search?q=` · `sf3d_product?id=` · `sf3d_nonce` | GET | — |

## هوک‌ها
**فیلترها:** `sf3d_query_args` · `sf3d_product_data` · `sf3d_payload` · `sf3d_config` · `sf3d_grid_defaults` · `sf3d_available_collections` · `sf3d_available_filters` · `sf3d_ajax_response` · `sf3d_cache_ttl` · `sf3d_cache_key` · `sf3d_new_days` · `sf3d_max_variations` · `sf3d_require_nonce`

**اکشن‌ها:** `sf3d_loaded` · `sf3d_before_render` · `sf3d_after_render` · `sf3d_before_add_to_cart` · `sf3d_after_add_to_cart` (با `cart_item_key`) · `sf3d_cache_flushed` · `sf3d_product_serialized`

```php
add_filter('sf3d_cache_ttl', fn($ttl) => 15 * MINUTE_IN_SECONDS);
add_filter('sf3d_product_data', function (array $d, WC_Product $p) { $d['brand'] = 'Nike'; return $d; }, 10, 2);
```

## معماری PHP (`src/`، PSR-4: `SF3D\Plugin\`)
`Plugin` (bootstrap + `registerServices()`) · `Contracts\{ProductRepository, CacheInterface, PayloadBuilder, RendererInterface, NonceProvider}` · `Data\{WooCommerceProductRepository, PayloadBuilder}` · `Cache\{TransientCache, NullCache}` · `Security\WpNonceProvider` · `Renderer\{Renderer, Shortcode}` · `Widget\{ShoeFinderWidget, ElementorIntegration, Block, ProductCountTag}` · `Ajax\AjaxController` · `Assets\Assets` · `Hooks\EventRegistry` · `Support\{Container, Settings}`.

سرویس‌ها را می‌توان از Container گرفت یا جایگزین کرد:
```php
add_action('sf3d_loaded', function (SF3D\Plugin\Plugin $plugin) {
    $plugin->container()->singleton(SF3D\Plugin\Contracts\CacheInterface::class, fn() => new SF3D\Plugin\Cache\NullCache());
});
```

## JavaScript (`assets/src/`، ESM + Vite)
```
npm install
npm run build     # assets/dist/sf3d.js (+map) و sf3d.min.js (terser)
npm run dev       # watch
npm test          # Vitest
npm run e2e       # Playwright (SF3D_URL=...)
```
**چرا Three.js نه؟** رندرر WebGL اختصاصی (~۱۰ فایل کوچک) همان جلوه‌ها را بدون ~۶۰۰KB وابستگی می‌دهد؛ پوشه‌ی `vendor/` در صورت نیاز آماده‌ی افزودن three است.

### Plugin API
```js
window.SF3D.use('my-plugin', {
  init(app) { console.log(app.store.get('collection')); },
  hooks: { 'tile:click': (tile) => {}, 'cart:added': ({ product, data }) => {} },
});
```
رویدادهای DOM: `sf3d:ready` `sf3d:focus` `sf3d:filter` `sf3d:added` `sf3d:removed` `sf3d:wishlist:toggle` `sf3d:error`.
State: `activeProduct, collection, filter, sort, cart, wishlist, hover, zoom, recent, selection, compare, theme`.

## کارایی و دسترس‌پذیری
Quadtree برای pick · IntersectionObserver (توقف رندر خارج از دید) · DPR تطبیقی (<۴۵fps کاهش DPR، <۳۰ کاهش کیفیت) · decode خارج از ترد اصلی با `createImageBitmap` · preload ۴ تصویر اول · placeholder رنگی (LQIP) · `<button>` واقعی + `role=grid` + فلش‌ها/Enter/Escape/Home/End · focus trap · `aria-live` · هدف لمسی ≥۴۸px · `prefers-contrast` و `prefers-reduced-motion` (CSS و JS).

## تست PHP
`composer install && composer test` (PHPUnit، بدون نیاز به WP) و `composer analyse` (PHPStan سطح ۶).
