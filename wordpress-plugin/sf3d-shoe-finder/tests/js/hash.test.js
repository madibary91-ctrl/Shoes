// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseHash, buildHash, writeHash, HASH_LIMITS } from '../../assets/src/utils/hash.js';

const EMPTY = { product: null, filter: {}, sort: '', collection: '' };
const enc = encodeURIComponent;

beforeEach(() => {
  history.replaceState(null, '', '/shop?x=1');
});

describe('parseHash: حالت عادی', () => {
  it('hash خالی یا نامعتبر مقدار پیش‌فرض می‌دهد', () => {
    expect(parseHash('')).toEqual(EMPTY);
    expect(parseHash('#')).toEqual(EMPTY);
    expect(parseHash(null)).toEqual(EMPTY);
    expect(parseHash(undefined)).toEqual(EMPTY);
  });

  it('همه‌ی بخش‌ها را می‌خواند', () => {
    const h = '#product-12&filter=' + enc('size:42,size:43,color:red') + '&sort=price-asc&collection=running';
    expect(parseHash(h)).toEqual({
      product: 12,
      filter: { size: ['42', '43'], color: ['red'] },
      sort: 'price-asc',
      collection: 'running',
    });
  });

  it('اسلاگ یونیکد (فارسی) را می‌پذیرد', () => {
    expect(parseHash('#collection=' + enc('کفش-ورزشی')).collection).toBe('کفش-ورزشی');
  });

  it('مقدارهای تکراری را حذف می‌کند', () => {
    expect(parseHash('#filter=' + enc('size:42,size:42')).filter.size).toEqual(['42']);
  });
});

describe('parseHash: ورودی خراب (decode امن)', () => {
  it('#filter=size%E0%A4 خطا نمی‌دهد و فیلتر خالی می‌ماند', () => {
    expect(() => parseHash('#filter=size%E0%A4')).not.toThrow();
    expect(parseHash('#filter=size%E0%A4')).toEqual(EMPTY);
  });

  it('بخش خراب فقط خودش نادیده گرفته می‌شود و بقیه سالم می‌مانند', () => {
    const out = parseHash('#filter=%E0%A4%A&sort=newest&product-3');
    expect(out.filter).toEqual({});
    expect(out.sort).toBe('newest');
  });

  it('% تنها و رشته‌های ناقص خطا نمی‌دهند', () => {
    ['#sort=%', '#collection=%E0', '#filter=%', '#filter=%ZZ', '#sort=%E0%A4%A'].forEach((h) => {
      expect(() => parseHash(h)).not.toThrow();
    });
  });

  it('بخش‌های بدون = یا با کلید خالی نادیده گرفته می‌شوند', () => {
    expect(parseHash('#&&=x&=&foo')).toEqual(EMPTY);
  });
});

describe('parseHash: pollution (کلیدهای خطرناک)', () => {
  it('#filter=__proto__:x رد می‌شود و Object.prototype آلوده نمی‌شود', () => {
    const out = parseHash('#filter=__proto__:x');
    expect(out.filter).toEqual({});
    expect(Object.keys(out.filter)).toEqual([]);
    expect({}.x).toBeUndefined();
    expect(Object.getPrototypeOf(out.filter)).toBe(Object.prototype);
  });

  it('__proto__ و constructor و prototype رد می‌شوند، ولی کلید سالم می‌ماند', () => {
    const out = parseHash('#filter=' + enc('__proto__:polluted,constructor:x,prototype:y,ok:1'));
    expect(Object.keys(out.filter)).toEqual(['ok']);
    expect(out.filter.ok).toEqual(['1']);
    expect({}.polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(out.filter, 'constructor')).toBe(false);
  });

  it('نسخه‌ی حروف بزرگ و کوچک مخلوط هم رد می‌شود', () => {
    expect(parseHash('#filter=' + enc('__PROTO__:a,Constructor:b,PROTOTYPE:c')).filter).toEqual({});
  });

  it('کلیدهایی مثل toString و hasOwnProperty خطا نمی‌دهند', () => {
    expect(() => parseHash('#filter=' + enc('toString:1,hasOwnProperty:2,valueOf:3'))).not.toThrow();
    expect({}.toString).toBeTypeOf('function');
  });

  it('کلید سطح بالای __proto__ هم نادیده گرفته می‌شود', () => {
    expect(parseHash('#__proto__=x&constructor=y')).toEqual(EMPTY);
    expect({}.x).toBeUndefined();
  });
});

describe('parseHash: whitelist', () => {
  it('کلیدهای ناشناس سطح بالا را نادیده می‌گیرد', () => {
    expect(parseHash('#evil=1&foo=bar&sort=newest&onload=alert(1)')).toEqual({ ...EMPTY, sort: 'newest' });
  });

  it('هر کلید سطح بالا فقط یک بار پذیرفته می‌شود (اولی برنده است)', () => {
    expect(parseHash('#sort=a&sort=b').sort).toBe('a');
    expect(parseHash('#collection=x&collection=y').collection).toBe('x');
  });

  it('sort و collection با کاراکتر نامعتبر رد می‌شوند', () => {
    expect(parseHash('#sort=' + enc('<script>')).sort).toBe('');
    expect(parseHash('#collection=' + enc('a b/c')).collection).toBe('');
  });

  it('کلید یا مقدار فیلتر با کاراکتر نامعتبر رد می‌شود', () => {
    expect(parseHash('#filter=' + enc('size:<b>,color:red')).filter).toEqual({ color: ['red'] });
    expect(parseHash('#filter=' + enc('bad key:1,ok:2')).filter).toEqual({ ok: ['2'] });
  });

  it('با گزینه‌ی filterKeys فقط کلیدهای مجاز می‌مانند', () => {
    const h = '#filter=' + enc('size:42,color:red,brand:x');
    expect(parseHash(h, { filterKeys: ['size', 'brand'] }).filter).toEqual({ size: ['42'], brand: ['x'] });
    expect(parseHash(h, { filterKeys: [] }).filter).toEqual({});
  });

  it('شناسه‌ی محصول نامعتبر یا خیلی بزرگ رد می‌شود', () => {
    expect(parseHash('#product-abc').product).toBeNull();
    expect(parseHash('#product-0').product).toBeNull();
    expect(parseHash('#product--5').product).toBeNull();
    expect(parseHash('#product-99999999999999999999').product).toBeNull();
    expect(parseHash('#product-5').product).toBe(5);
  });

  it('اولین product معتبر برنده است', () => {
    expect(parseHash('#product-5&product-6').product).toBe(5);
  });
});

describe('parseHash: سقف‌ها', () => {
  it('MAX_HASH_LENGTH: کل hash بلندتر از سقف نادیده گرفته می‌شود', () => {
    expect(parseHash('#product-5').product).toBe(5);
    const long = '#product-5&sort=' + 'a'.repeat(HASH_LIMITS.MAX_HASH_LENGTH);
    expect(parseHash(long)).toEqual(EMPTY);
  });

  it('MAX_FILTER_KEYS: تعداد کلیدهای فیلتر محدود است', () => {
    const f = Array.from({ length: 40 }, (_, i) => `k${i}:v`).join(',');
    const out = parseHash('#filter=' + enc(f));
    expect(Object.keys(out.filter)).toHaveLength(HASH_LIMITS.MAX_FILTER_KEYS);
  });

  it('MAX_VALUES_PER_KEY: تعداد مقدار برای هر کلید محدود است', () => {
    const f = Array.from({ length: 60 }, (_, i) => `size:${i + 1}`).join(',');
    const out = parseHash('#filter=' + enc(f));
    expect(out.filter.size).toHaveLength(HASH_LIMITS.MAX_VALUES_PER_KEY);
    expect(out.filter.size[0]).toBe('1');
  });

  it('MAX_FILTER_PAIRS: مجموع جفت‌ها دقیقاً به سقف می‌رسد', () => {
    const f = ['a', 'b', 'c'].flatMap((k) => Array.from({ length: 20 }, (_, v) => `${k}:${v}`)).join(',');
    expect('#filter=' + enc(f)).toHaveLength(Math.min('#filter='.length + enc(f).length, 1999));
    const out = parseHash('#filter=' + enc(f));
    const total = Object.values(out.filter).reduce((n, a) => n + a.length, 0);
    expect(total).toBe(HASH_LIMITS.MAX_FILTER_PAIRS);
  });

  it('MAX_KEY_LENGTH و MAX_VALUE_LENGTH: کلید و مقدار بلند رد می‌شوند', () => {
    const longKey = 'k'.repeat(HASH_LIMITS.MAX_KEY_LENGTH + 1);
    const longVal = 'v'.repeat(HASH_LIMITS.MAX_VALUE_LENGTH + 1);
    const out = parseHash('#filter=' + enc(`${longKey}:v,ok:${longVal},good:1`));
    expect(out.filter).toEqual({ good: ['1'] });
  });

  it('کلید و مقدار دقیقاً در حد سقف پذیرفته می‌شوند', () => {
    const k = 'k'.repeat(HASH_LIMITS.MAX_KEY_LENGTH);
    const v = 'v'.repeat(HASH_LIMITS.MAX_VALUE_LENGTH);
    expect(parseHash('#filter=' + enc(`${k}:${v}`)).filter).toEqual({ [k]: [v] });
  });
});

describe('buildHash', () => {
  it('وضعیت پیش‌فرض hash خالی می‌دهد', () => {
    expect(buildHash({})).toBe('');
    expect(buildHash()).toBe('');
    expect(buildHash({ product: null, filter: {}, sort: 'default', collection: 'all' })).toBe('');
  });

  it('ورودی نامعتبر را حذف می‌کند (از جمله __proto__ واقعی)', () => {
    const filter = JSON.parse('{"__proto__":["a"],"constructor":["x"],"size":["42","<b>"],"bad key":["1"]}');
    const h = buildHash({ product: 'abc', filter, sort: '<x>', collection: 'a b' });
    expect(h).toBe('#filter=' + enc('size:42'));
    expect(parseHash(h)).toEqual({ ...EMPTY, filter: { size: ['42'] } });
  });

  it('مقدارهای غیر آرایه خطا نمی‌دهند', () => {
    expect(() => buildHash({ filter: { size: 'not-array', color: null } })).not.toThrow();
    expect(buildHash({ filter: { size: 'not-array', color: null } })).toBe('');
  });

  it('سقف‌ها در خروجی هم اعمال می‌شود', () => {
    const filter = {};
    for (let k = 0; k < 20; k++) filter[`k${k}`] = Array.from({ length: 30 }, (_, v) => String(v));
    const out = parseHash(buildHash({ filter }));
    expect(Object.keys(out.filter).length).toBeLessThanOrEqual(HASH_LIMITS.MAX_FILTER_KEYS);
    const total = Object.values(out.filter).reduce((n, a) => n + a.length, 0);
    expect(total).toBeLessThanOrEqual(HASH_LIMITS.MAX_FILTER_PAIRS);
  });
});

describe('round-trip: parseHash(buildHash(x)) == x', () => {
  const cases = {
    'وضعیت کامل': { product: 7, filter: { size: ['42', '43'], color: ['red'] }, sort: 'price-asc', collection: 'running' },
    'فقط product': { product: 123, filter: {}, sort: '', collection: '' },
    'فقط فیلتر': { product: null, filter: { brand: ['nike', 'adidas'] }, sort: '', collection: '' },
    'فقط sort': { product: null, filter: {}, sort: 'newest', collection: '' },
    'collection فارسی': { product: null, filter: {}, sort: '', collection: 'کفش-ورزشی' },
    'مقدار فیلتر فارسی': { product: null, filter: { رنگ: ['قرمز', 'آبی'] }, sort: '', collection: '' },
    'مقدار اعشاری': { product: null, filter: { size: ['42.5'] }, sort: '', collection: '' },
    'وضعیت خالی': { ...EMPTY },
  };

  Object.entries(cases).forEach(([name, state]) => {
    it(name, () => {
      expect(parseHash(buildHash(state))).toEqual(state);
    });
  });

  it('buildHash(parseHash(h)) برای hash معتبر ثابت می‌ماند (idempotent)', () => {
    const h = buildHash(cases['وضعیت کامل']);
    expect(buildHash(parseHash(h))).toBe(h);
  });
});

describe('writeHash: فقط replaceState', () => {
  let replaceSpy;
  let pushSpy;

  beforeEach(() => {
    replaceSpy = vi.spyOn(history, 'replaceState');
    pushSpy = vi.spyOn(history, 'pushState');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('از replaceState استفاده می‌کند و مسیر و query را حفظ می‌کند', () => {
    expect(writeHash({ product: 9, sort: 'newest' })).toBe(true);
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).not.toHaveBeenCalled();
    expect(location.pathname).toBe('/shop');
    expect(location.search).toBe('?x=1');
    expect(location.hash).toBe('#product-9&sort=newest');
  });

  it('طول history زیاد نمی‌شود', () => {
    const before = history.length;
    writeHash({ product: 1 });
    writeHash({ product: 2 });
    writeHash({ product: 3 });
    expect(history.length).toBe(before);
  });

  it('رویداد hashchange ایجاد نمی‌کند', async () => {
    const onHash = vi.fn();
    window.addEventListener('hashchange', onHash);
    writeHash({ product: 3 });
    await new Promise((r) => setTimeout(r, 10));
    window.removeEventListener('hashchange', onHash);
    expect(onHash).not.toHaveBeenCalled();
  });

  it('اگر hash تغییری نکرده باشد replaceState صدا زده نمی‌شود', () => {
    writeHash({ product: 4 });
    replaceSpy.mockClear();
    expect(writeHash({ product: 4 })).toBe(false);
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('وضعیت خالی hash را پاک می‌کند', () => {
    writeHash({ product: 4 });
    writeHash({});
    expect(location.hash).toBe('');
    expect(location.pathname + location.search).toBe('/shop?x=1');
  });

  it('خطای replaceState را قورت می‌دهد', () => {
    replaceSpy.mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => writeHash({ product: 5 })).not.toThrow();
    expect(writeHash({ product: 5 })).toBe(false);
  });

  it('ورودی undefined خطا نمی‌دهد', () => {
    expect(() => writeHash()).not.toThrow();
  });

  it('در سورس هیچ pushState یا انتساب location.hash/assign/replace وجود ندارد', () => {
    const src = readFileSync(resolve(process.cwd(), 'assets/src/utils/hash.js'), 'utf8');
    expect(src).not.toMatch(/pushState\s*\(/);
    expect(src).not.toMatch(/location\.hash\s*=(?!=)/);
    expect(src).not.toMatch(/location\.(assign|replace)\s*\(/);
    expect(src).toMatch(/replaceState\s*\(/);
  });
});
