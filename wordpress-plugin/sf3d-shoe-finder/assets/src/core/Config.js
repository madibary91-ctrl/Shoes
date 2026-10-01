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
};

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
};

const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);

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
    grid[k] = typeof GRID_DEFAULTS[k] === 'number' ? num(v, GRID_DEFAULTS[k]) : String(v);
  });

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
    startCollection: raw.startCollection || 'all',
    cardPosition: raw.cardPosition || 'end',
    wishlist: Array.isArray(raw.wishlist) ? raw.wishlist.map(Number) : [],
    debug: !!raw.debug,
  };
}
