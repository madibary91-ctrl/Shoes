// همگام‌سازی hash آدرس: #product-12&filter=size:42,color:red&sort=price-asc&collection=running
// نسخه‌ی فاز ۱: whitelist، decode امن، رد کلیدهای خطرناک، سقف طول/تعداد، فقط replaceState

export const HASH_LIMITS = Object.freeze({
  MAX_HASH_LENGTH: 2000,
  MAX_FILTER_KEYS: 12,
  MAX_VALUES_PER_KEY: 20,
  MAX_FILTER_PAIRS: 50,
  MAX_KEY_LENGTH: 32,
  MAX_VALUE_LENGTH: 64,
});

const KEY_RE = /^[\p{L}\p{N}_-]{1,32}$/u;
const VALUE_RE = /^[\p{L}\p{N}_.-]{1,64}$/u;
const SLUG_RE = /^[\p{L}\p{N}_-]{1,64}$/u;
const SORT_RE = /^[a-z0-9_-]{1,32}$/i;
const PRODUCT_RE = /^product-(\d{1,10})$/;
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const ALLOWED_TOP_KEYS = new Set(['filter', 'sort', 'collection']);

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isSafeKey = (k) => typeof k === 'string' && KEY_RE.test(k) && !BLOCKED_KEYS.has(k.toLowerCase());
const isSafeValue = (v) => typeof v === 'string' && VALUE_RE.test(v);

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return null;
  }
}

function currentHash() {
  return typeof location !== 'undefined' ? location.hash : '';
}

function parseFilter(val, allowed, target) {
  let pairs = 0;
  for (const pair of val.split(',')) {
    if (pairs >= HASH_LIMITS.MAX_FILTER_PAIRS) break;
    const idx = pair.indexOf(':');
    if (idx < 1) continue;
    const k = pair.slice(0, idx);
    const v = pair.slice(idx + 1);
    if (!isSafeKey(k) || !isSafeValue(v)) continue;
    if (allowed && !allowed.has(k)) continue;
    if (!hasOwn(target, k)) {
      if (Object.keys(target).length >= HASH_LIMITS.MAX_FILTER_KEYS) continue;
      target[k] = [];
    }
    const list = target[k];
    if (list.length >= HASH_LIMITS.MAX_VALUES_PER_KEY || list.includes(v)) continue;
    list.push(v);
    pairs++;
  }
}

/**
 * @param {string} [hash]
 * @param {{filterKeys?: Iterable<string>}} [options]
 * @returns {{product:number|null, filter:Object, sort:string, collection:string}}
 */
export function parseHash(hash = currentHash(), options = {}) {
  const out = { product: null, filter: {}, sort: '', collection: '' };
  const raw = String(hash || '').replace(/^#/, '');
  if (!raw || raw.length > HASH_LIMITS.MAX_HASH_LENGTH) return out;

  const allowed = options && options.filterKeys ? new Set(options.filterKeys) : null;
  const seen = new Set();

  for (const part of raw.split('&')) {
    const m = PRODUCT_RE.exec(part);
    if (m) {
      const id = Number(m[1]);
      if (out.product === null && Number.isSafeInteger(id) && id > 0) out.product = id;
      continue;
    }
    const eq = part.indexOf('=');
    if (eq < 1) continue;
    const key = part.slice(0, eq);
    if (!ALLOWED_TOP_KEYS.has(key) || seen.has(key)) continue;
    const val = safeDecode(part.slice(eq + 1));
    if (val === null) continue;
    seen.add(key);

    if (key === 'filter') parseFilter(val, allowed, out.filter);
    else if (key === 'sort') out.sort = SORT_RE.test(val) ? val : '';
    else if (key === 'collection') out.collection = SLUG_RE.test(val) ? val : '';
  }
  return out;
}

export function buildHash({ product, filter, sort, collection } = {}) {
  const parts = [];

  const id = Number(product);
  if (Number.isSafeInteger(id) && id > 0) parts.push(`product-${id}`);

  const pairs = [];
  const keys = new Set();
  Object.keys(filter || {}).forEach((k) => {
    if (!isSafeKey(k)) return;
    const vals = Array.isArray(filter[k]) ? filter[k] : [];
    const clean = [];
    vals.forEach((v) => {
      v = String(v);
      if (isSafeValue(v) && !clean.includes(v) && clean.length < HASH_LIMITS.MAX_VALUES_PER_KEY) clean.push(v);
    });
    if (!clean.length || keys.size >= HASH_LIMITS.MAX_FILTER_KEYS) return;
    keys.add(k);
    clean.forEach((v) => pairs.push(`${k}:${v}`));
  });
  const f = pairs.slice(0, HASH_LIMITS.MAX_FILTER_PAIRS).join(',');
  if (f) parts.push(`filter=${encodeURIComponent(f)}`);

  if (sort && sort !== 'default' && SORT_RE.test(sort)) parts.push(`sort=${encodeURIComponent(sort)}`);
  if (collection && collection !== 'all' && SLUG_RE.test(collection)) parts.push(`collection=${encodeURIComponent(collection)}`);

  return parts.length ? `#${parts.join('&')}` : '';
}

/**
 * @returns {boolean} true اگر آدرس واقعاً تغییر کرد
 */
export function writeHash(state) {
  if (typeof location === 'undefined' || typeof history === 'undefined' || typeof history.replaceState !== 'function') return false;
  const next = buildHash(state || {});
  if (location.hash === next) return false;
  try {
    history.replaceState(history.state, '', location.pathname + location.search + next);
    return true;
  } catch (e) {
    return false;
  }
}
