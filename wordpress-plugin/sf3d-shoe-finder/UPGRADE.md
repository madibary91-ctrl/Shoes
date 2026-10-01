# راهنمای ارتقا به 2.0

## تضمین سازگاری عقب‌رو
- شورت‌کدهای `[sf3d_shoe_finder]` `[sf3d]` `[sf3d_grid]` حفظ شده‌اند.
- endpoint قدیمی `?wc-ajax=sf3d_add_to_cart` همان نام را دارد.
- کلاس‌های `SF3D_Renderer`، `SF3D_Data`، `SF3D_Plugin` با همان امضا باقی‌اند و فقط `_deprecated_function` ثبت می‌کنند (در `WP_DEBUG_LOG` دیده می‌شود).

## تغییرات رفتاری (نیازمند توجه)
1. **Nonce اجباری** برای `sf3d_add_to_cart`. اگر قالب/اسکریپت سفارشی قدیمی بدون nonce درخواست می‌فرستد، موقتاً:
   ```php
   add_filter('sf3d_require_nonce', '__return_false');
   ```
   و سپس فیلد `nonce` را از `SF3D.apps[0].client.nonce` یا `config.nonce` اضافه کنید.
2. **کش payload**: خروجی یک ساعت کش می‌شود. تغییر محصول/موجودی/دسته خودکار پاک می‌کند. برای غیرفعال‌سازی:
   ```php
   add_filter('sf3d_cache_ttl', '__return_zero');
   ```
3. **JS**: فایل جدید `assets/dist/sf3d.min.js` (UMD، سراسری `window.SF3D`). اگر اسکریپت سفارشی به متغیرهای سراسری قدیمی وابسته بود، از `SF3D.use()` و رویدادهای `sf3d:*` استفاده کنید.

## نگاشت کلاس‌ها
| قدیمی | جدید |
|---|---|
| `SF3D_Renderer::render($atts)` | `Renderer\Renderer::render(Settings::normalize($atts))` |
| `SF3D_Data::build_payload($args)` | `Data\PayloadBuilder::build($args)` |
| `SF3D_Plugin::wc_ajax_url($ep)` | `WC_AJAX::get_endpoint($ep)` |

## آزمون سریع پس از ارتقا
1. صفحه‌ی دارای شورت‌کد را باز کنید؛ شبکه باید بالا بیاید.
2. یک محصول متغیر را فوکوس کنید، گزینه انتخاب و «افزودن به سبد» را بزنید.
3. محصولی را ویرایش و ذخیره کنید؛ صفحه را رفرش کنید و تغییر را ببینید (کش پاک شده است).
