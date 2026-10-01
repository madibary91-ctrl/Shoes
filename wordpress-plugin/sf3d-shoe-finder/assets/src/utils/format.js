// بین‌المللی‌سازی: قیمت، درصد، تاریخ جلالی، جمع/مفرد

const cache = new Map();

function nf(locale, opts) {
  const key = locale + JSON.stringify(opts);
  if (!cache.has(key)) {
    try {
      cache.set(key, new Intl.NumberFormat(locale, opts));
    } catch (e) {
      cache.set(key, new Intl.NumberFormat('en', opts));
    }
  }
  return cache.get(key);
}

export function formatNumber(value, locale, opts = {}) {
  return nf(locale, opts).format(Number(value) || 0);
}

export function formatPercent(value, locale) {
  return nf(locale, { style: 'percent', maximumFractionDigits: 0 }).format((Number(value) || 0) / 100);
}

/**
 * قیمت با نماد و جایگاه ووکامرس
 * @param {number} amount
 * @param {Object} currency {symbol, position, decimals}
 * @param {string} locale
 */
export function formatPrice(amount, currency, locale) {
  const decimals = Number(currency.decimals) || 0;
  const n = formatNumber(amount, locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const s = currency.symbol || '';
  switch (currency.position) {
    case 'left': return s + n;
    case 'left_space': return `${s}\u00A0${n}`;
    case 'right': return n + s;
    default: return `${n}\u00A0${s}`;
  }
}

/** تاریخ با تقویم جلالی برای fa؛ در غیر این صورت تقویم پیش‌فرض locale */
export function formatDate(date, locale) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const loc = /^fa/i.test(locale) ? 'fa-IR-u-ca-persian' : locale;
  try {
    return new Intl.DateTimeFormat(loc, { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
  } catch (e) {
    return d.toISOString().slice(0, 10);
  }
}

/** انتخاب صورت جمع با Intl.PluralRules */
export function plural(count, forms, locale) {
  let cat = 'other';
  try {
    cat = new Intl.PluralRules(locale).select(count);
  } catch (e) { /* پیش‌فرض */ }
  return forms[cat] || forms.other || '';
}

/** جایگزینی {name} در رشته‌ها */
export function tpl(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}
