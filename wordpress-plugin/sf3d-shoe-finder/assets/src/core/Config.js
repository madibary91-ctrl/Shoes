// تنظیمات پیش‌فرض (هم‌راستا با gridConfig.js پروژه مرجع) و نرمال‌سازی

export const GRID_DEFAULTS = {
  gridCols: 8,
  itemSize: 2.5,
  gap: 0.4,
  dragSpeed: 2.2,
  dampFactor: 0.2,
  clickThreshold: 5,
  dragResistance: 0.25,
  zoomIn: 12,
  zoomOut: 31,
  zoomDamp: 0.25,
  fov: 40,
  focusScale: 1.5,
  dimScale: 0.5,
  dimOpacity: 0.15,
  curvatureStrength: 0.06,
  cullDistance: 14,
  mapWidth: 120,
  fogNear: 19,
  fogFar: 100,
  enterStartOpacity: 0,
  enterStartZ: -50,
  exitEndZ: 20,
  transitionZDamp: 0.25,
  enterOpacityDamp: 0.85,
  exitOpacityDamp: 0.15,
  enterStaggerDelay: 400,
  exitStaggerDelay: 300,
  cleanupTimeout: 700,
  exitSpreadY: 0.5,
  enterSpreadY: 1,
  transitionYDamp: 0.08,
  filterOpacityDamp: 0.06,
  filterScaleTarget: 0.5,
  labelZoomMax: 24,
  bgColor: '#e0e0e0',
  bgOpacity: 0.4,
  bgSpeed: 0.05,
  bgScale: 3.0,
  bgLineThickness: 0.03,
};

/**
 * [F11] بازه‌ی مجاز هر مقدار عددی: [حداقل، حداکثر، فقط‌صحیح؟]
 * کلیدهای بدون ورودی در این جدول فقط باید متناهی (finite) باشند.
 * مقادیر باید با Settings::GRID_LIMITS در PHP یکی باشند.
 */
export const GRID_LIMITS = {
  gridCols: [1, 24, true],
  itemSize: [0.5, 10],
  gap: [0, 5],
  dragSpeed: [0.1, 10],
  dampFactor: [0.01, 1],
  clickThreshold: [1, 50],
  dragResistance: [0, 1],
  zoomIn: [2, 80],
  zoomOut: [5, 160],
  zoomDamp: [0.01, 1],
  fov: [10, 100],
  focusScale: [1, 4],
  dimScale: [0.1, 1],
  dimOpacity: [0, 1],
  curvatureStrength: [0, 1],
  cullDistance: [1, 200],
  mapWidth: [10, 1000],
  fogNear: [0, 500],
  fogFar: [1, 1000],
  enterStaggerDelay: [0, 3000],
  exitStaggerDelay: [0, 3000],
  cleanupTimeout: [0, 5000],
  bgOpacity: [0, 1],
  bgSpeed: [0, 5],
  bgScale: [0.1, 20],
  bgLineThickness: [0, 1],
};

export const FEATURE_DEFAULTS = {
  wishlist: true,
  quickActions: true,
  badges: true,
  gallery: true,
  related: true,
  search: true,
  darkMode: true,
  filters: true,
  sort: true,
  bulk: true,
  recent: true,
  cartDrawer: true,
  minimap: true,
  hashSync: true,
  cardModal: true,
};

/** پیش‌تنظیم ظاهری پیش‌فرض (فاز ۲: سیستم طراحی) */
export const DEFAULT_PRESET = 'minimal';

/** اسلاگ مجاز پیش‌تنظیم: حروف کوچک، عدد، خط تیره و زیرخط */
const PRESET_RE = /^[a-z0-9_-]{1,32}$/;

/** رنگ hex معتبر (۳ تا ۸ رقم) برای bgColor */
const HEX_RE = /^#[0-9a-f]{3,8}$/i;

export const STRINGS = {
  all: 'همه',
  wishlist: 'علاقه‌مندی‌ها',
  recent: 'اخیراً دیده‌شده',
  filters: 'فیلترها',
  sort: 'مرتب‌سازی',
  reset: 'پاک‌کردن فیلترها',
  search: 'جستجوی کفش…',
  noResults: 'نتیجه‌ای پیدا نشد',
  addToCart: 'افزودن به سبد',
  selectOptions: 'گزینه‌ها را انتخاب کنید',
  outOfStock: 'ناموجود',
  sale: 'حراج',
  new: 'جدید',
  added: 'به سبد اضافه شد',
  adding: 'در حال افزودن…',
  error: 'خطایی رخ داد. دوباره تلاش کنید.',
  cart: 'سبد خرید',
  cartEmpty: 'سبد خرید شما خالی است',
  subtotal: 'جمع جزء',
  checkout: 'تسویه حساب',
  continueShopping: 'ادامه‌ی خرید',
  remove: 'حذف',
  close: 'بستن',
  related: 'محصولات مشابه',
  emptyWishlist: 'هنوز چیزی ذخیره نکردی',
  emptyRecent: 'هنوز محصولی ندیده‌ای',
  lowStock: 'فقط {n} عدد باقی مانده!',
  inStock: 'موجود در انبار',
  share: 'اشتراک‌گذاری',
  linkCopied: 'لینک کپی شد',
  quickView: 'مشاهده سریع',
  compare: 'مقایسه',
  compareTitle: 'مقایسه محصولات',
  selected: '{n} محصول انتخاب شد',
  bulkAdd: 'افزودن به سبد',
  clear: 'لغو انتخاب',
  skip: 'پرش به شبکه',
  gridLabel: 'شبکه محصولات',
  viewProduct: 'مشاهده محصول',
  prev: 'قبلی',
  next: 'بعدی',
  darkMode: 'حالت تاریک',
  lightMode: 'حالت روشن',
  sortDefault: 'پیش‌فرض',
  sortNew: 'جدیدترین',
  sortPriceAsc: 'ارزان‌ترین',
  sortPriceDesc: 'گران‌ترین',
  sortPopular: 'محبوب‌ترین',
  size: 'سایز',
  color: 'رنگ',
  choose: 'انتخاب…',
  spin360: 'برای چرخاندن بکشید',
  addedAnnounce: '{title} به سبد اضافه شد',
  wishlistAdded: '{title} به علاقه‌مندی‌ها اضافه شد',
  wishlistRemoved: '{title} از علاقه‌مندی‌ها حذف شد',
  focused: '{title} انتخاب شد',
  products: 'محصول',
  // ── [F14] کلیدهای جدید ──
  gallery: 'گالری تصاویر',
  // ── کلیدهای مورد نیاز fixهای بعدی (F5, F7, F9, F10, F17) ──
  networkError: 'اتصال برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.',
  resultsCount: '{n} محصول یافت شد',
  cartCount: 'سبد خرید، {n} کالا',
  compareOn: '{title} به مقایسه اضافه شد',
  compareOff: '{title} از مقایسه حذف شد',
  selectOn: '{title} برای افزودن گروهی انتخاب شد',
  selectOff: '{title} از انتخاب گروهی خارج شد',
  webglLost: 'نمایش سه‌بعدی قطع شد؛ در حال بازیابی…',
  webglRestored: 'نمایش سه‌بعدی دوباره برقرار شد',
};

const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);

/** [F11] مقدار را در بازه‌ی GRID_LIMITS نگه می‌دارد؛ کلید ناشناخته بدون تغییر برمی‌گردد */
function clampGrid(key, value) {
  const lim = GRID_LIMITS[key];
  if (!lim) return value;
  const [min, max, int] = lim;
  let v = Math.min(max, Math.max(min, value));
  if (int) v = Math.round(v);
  return v;
}

/** پیش‌تنظیم نامعتبر یا خالی به مقدار پیش‌فرض برمی‌گردد */
const normalizePreset = (v) => {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return PRESET_RE.test(s) ? s : DEFAULT_PRESET;
};

/**
 * ادغام تنظیمات خام (PHP/المنتور) با پیش‌فرض‌ها
 * @param {Object} raw
 * @returns {Object}
 */
export function normalizeConfig(raw = {}) {
  const grid = { ...GRID_DEFAULTS };
  Object.keys(GRID_DEFAULTS).forEach((k) => {
    const v = raw.grid && raw.grid[k];
    if (v === undefined || v === null || v === '') return;
    if (typeof GRID_DEFAULTS[k] === 'number') {
      // [F11] اول عدد معتبر، بعد clamp (gridCols=0 دیگر NaN/تقسیم بر صفر نمی‌دهد)
      grid[k] = clampGrid(k, num(v, GRID_DEFAULTS[k]));
    } else if (k === 'bgColor') {
      // [F11] رنگ نامعتبر → پیش‌فرض
      grid[k] = HEX_RE.test(String(v)) ? String(v) : GRID_DEFAULTS[k];
    } else {
      grid[k] = String(v);
    }
  });

  // [F11] روابط بین مقادیر: zoomOut باید از zoomIn بزرگ‌تر و fogFar از fogNear بزرگ‌تر باشد
  if (grid.zoomOut <= grid.zoomIn) grid.zoomOut = grid.zoomIn + 1;
  if (grid.fogFar <= grid.fogNear) grid.fogFar = grid.fogNear + 1;

  // [F2a] همه‌ی کلیدهای FEATURE_DEFAULTS (از جمله cardModal) از همین حلقه عبور می‌کنند
  // و Card.js باید از config.features.cardModal بخواند (نه config.cardModal)
  const features = { ...FEATURE_DEFAULTS };
  Object.keys(FEATURE_DEFAULTS).forEach((k) => {
    if (raw.features && k in raw.features) features[k] = !!raw.features[k] && raw.features[k] !== '0';
  });

  const locale = raw.locale || (typeof document !== 'undefined' && document.documentElement.lang) || 'fa-IR';
  return {
    grid,
    features,
    strings: { ...STRINGS, ...(raw.i18n || {}) },
    ajaxUrl: raw.ajaxUrl || '/?wc-ajax=%%endpoint%%',
    nonce: raw.nonce || '',
    locale,
    rtl: raw.rtl !== undefined ? !!raw.rtl : (typeof document !== 'undefined' && document.dir === 'rtl'),
    isLoggedIn: !!raw.isLoggedIn,
    currency: { symbol: '', position: 'right_space', decimals: 0, decimalSep: '.', thousandSep: ',', ...(raw.currency || {}) },
    wpLocale: raw.wpLocale || {},
    cartUrl: raw.cartUrl || '',
    checkoutUrl: raw.checkoutUrl || '',
    title: raw.title || '',
    height: raw.height || '',
    theme: raw.theme || 'auto',
    // [F2b] preset حالا از PHP (Renderer::config) می‌رسد
    preset: normalizePreset(raw.preset),
    startCollection: raw.startCollection || 'all',
    cardPosition: raw.cardPosition || 'end',
    wishlist: Array.isArray(raw.wishlist) ? raw.wishlist.map(Number) : [],
    debug: !!raw.debug,
  };
}
