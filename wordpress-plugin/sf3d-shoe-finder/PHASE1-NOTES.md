# SF3D Shoe Finder — یادداشت‌های فاز ۱ (تثبیت)

> این فایل فقط برای توسعه‌دهنده‌هاست و داخل ZIP انتشار نمی‌رود
> (در `.github/workflows/sf3d.yml` از بسته‌بندی مستثنا شده است).

- نسخه‌ی پلاگین: `2.0.0`
- پوشه‌ی پلاگین: `wordpress-plugin/sf3d-shoe-finder/`
- JS: ماژول‌های Vanilla ESM (بدون React و Three.js) — Build با Vite به `assets/dist/`
- PHP: PSR-4 با namespace ‏`SF3D\Plugin\`
- تست: PHPUnit + Vitest + Playwright

---

## ۱. چک‌لیست کارهای فاز ۱

### انجام شده (commit شده)

- [x] `assets/src/ui/Card.js` — `aria-modal`، `inert` و `aria-labelledby`
- [x] `assets/src/utils/inert.js` + `tests/js/inert.test.js`
- [x] `assets/src/utils/hash.js` — whitelist، `try/catch` برای decode، سقف طول و تعداد
- [x] `tests/js/hash.test.js`
- [x] `assets/src/ui/Toast.js` — `data-sf3d-keep`
- [x] `assets/src/utils/dom.js` — ۱۸ آیکون SVG با عددهای تمیز، `ICON_NAMES`، محافظت `icon()` در برابر نام‌های ارثی (`constructor`, `toString`)
- [x] `assets/src/core/Config.js` — `cardModal` در `FEATURE_DEFAULTS`، `preset` (پیش‌فرض `minimal`) در `normalizeConfig`
- [x] `vite.config.js` و `vitest.config.js` — با `css.postcss` درون‌خطی
- [x] `.gitignore`
- [x] `.github/workflows/sf3d.yml` (در ریشه‌ی ریپو) — تست، build، commit خودکار `dist`، ساخت ZIP در تگ `v*`

### مانده

- [ ] `tests/js/dom.test.js` — نوشته شده، **هنوز commit و اجرا نشده**
      (`npx vitest run tests/js/dom.test.js`)
- [ ] بازسازی `assets/dist/` — CI بعد از push روی `main` خودکار انجام می‌دهد
- [ ] تست‌های `Config.js` (`tests/js/config.test.js`) — هنوز نوشته نشده
- [ ] اعمال پچ اختیاری `App.js` (بخش ۳)
- [ ] رسیدگی به «موارد باز» (بخش ۴)

### معیار پایان فاز ۱

1. `npm test` سبز باشد (همه‌ی فایل‌های `tests/js/*.test.js`).
2. `npm run build` بدون خطا تمام شود.
3. Workflow ‏`SF3D CI` روی `main` سبز باشد و `assets/dist/` به‌روز commit شده باشد.
4. در بخش ۴ مورد «بحرانی» باز نمانده باشد.

---

## ۲. دستورات نصب و Build

همه‌ی دستورها از داخل `wordpress-plugin/sf3d-shoe-finder/` اجرا می‌شوند.

### JavaScript

```bash
# نصب دقیق وابستگی‌ها (همان کاری که CI می‌کند؛ نیازمند package-lock.json)
npm ci

# اجرای همه‌ی تست‌های Vitest
npm test

# اجرای فقط یک فایل تست
npx vitest run tests/js/dom.test.js

# Build توسعه + محصول (خروجی در assets/dist/)
npm run build

# Build توسعه با watch
npm run dev

# بررسی کد و قالب‌بندی
npm run lint
npm run format

# تست‌های E2E (بار اول مرورگرها را نصب کنید)
npx playwright install --with-deps chromium
npm run e2e
