# Changelog

## 2.0.0
### افزوده
- معماری PSR-4 با Container، Contractها، Repository/Cache/Nonce قابل‌جایگزینی.
- ویجت المنتور کامل + بلوک گوتنبرگ + Dynamic Tag (`{{sf3d:product_count}}`).
- باندل ESM با Vite (UMD)، Store مرکزی، Event bus، Plugin API (`SF3D.use`).
- Variation Switcher + Color Swatch، نشان‌ها، گالری (زوم/۳۶۰)، Wishlist، فیلتر چندانتخابی، Sort، Search، Recently Viewed، Cart Drawer، Quick Actions، Bulk Add، تم تاریک، Compare، Share.
- کش Transient یک‌ساعته با پاک‌سازی روی `save_post_product` و هوک‌های موجودی/دسته.
- Nonce روی درخواست‌های تغییردهنده (با refresh خودکار).
- Deep link `#product-ID` و `#filter=…`.
- دسترس‌پذیری WCAG 2.2 AA، کاهش حرکت، کنتراست بالا.
- فیلترها/اکشن‌های جدید (فهرست در README).

### منسوخ‌شده (Deprecated — همچنان کار می‌کند)
- `SF3D_Renderer::render()` ← `SF3D\Plugin\Renderer\Renderer::render()`
- `SF3D_Data::build_payload()` ← `SF3D\Plugin\Data\PayloadBuilder::build()`
- `SF3D_Plugin::wc_ajax_url()` ← `WC_AJAX::get_endpoint()`
