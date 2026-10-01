// موتور فیلتر و مرتب‌سازی؛ انتخاب چندگانه: داخل هر ویژگی OR، بین ویژگی‌ها AND

/** مقادیر محصول برای یک کلید فیلتر */
export function valuesFor(product, key) {
  if (key === 'category') return (product.categories || []).map(String);
  const v = product.attributes && product.attributes[key];
  return Array.isArray(v) ? v.map(String) : [];
}

/**
 * @param {Object} product
 * @param {Object<string,string[]>} selected
 * @returns {boolean}
 */
export function matchesFilters(product, selected) {
  for (const key of Object.keys(selected || {})) {
    const wanted = selected[key];
    if (!wanted || !wanted.length) continue;
    const have = valuesFor(product, key);
    if (!wanted.some((w) => have.includes(String(w)))) return false;
  }
  return true;
}

export function hasActiveFilters(selected) {
  return Object.values(selected || {}).some((v) => v && v.length);
}

const SORTERS = {
  default: null,
  new: (a, b) => String(b.date || '').localeCompare(String(a.date || '')),
  'price-asc': (a, b) => (a.price || 0) - (b.price || 0),
  'price-desc': (a, b) => (b.price || 0) - (a.price || 0),
  popular: (a, b) => (b.popularity || 0) - (a.popularity || 0),
};

export const SORT_KEYS = Object.keys(SORTERS);

/** مرتب‌سازی پایدار روی آرایه‌ی محصولات/کاشی‌ها */
export function sortList(list, key, getProduct = (x) => x) {
  const fn = SORTERS[key];
  if (!fn) return list.slice();
  return list
    .map((item, i) => ({ item, i }))
    .sort((a, b) => fn(getProduct(a.item), getProduct(b.item)) || a.i - b.i)
    .map((x) => x.item);
}

/** شمارش گزینه‌ها در مجموعه‌ی محصولات (برای «Nike (۱۲)») */
export function countOptions(products, key, value) {
  return products.reduce((n, p) => n + (valuesFor(p, key).includes(String(value)) ? 1 : 0), 0);
}
