import { describe, it, expect, beforeEach } from 'vitest';
import { damp, setReducedMotion, clamp } from '../../assets/src/utils/damp.js';
import { hexToRgb, isLight, contrastText } from '../../assets/src/utils/color.js';
import { Store } from '../../assets/src/core/Store.js';
import { Events } from '../../assets/src/core/Events.js';
import { Container } from '../../assets/src/core/Container.js';
import { computeLayout } from '../../assets/src/grid/Layout.js';
import { Quadtree } from '../../assets/src/grid/Quadtree.js';
import { matchesFilters, sortList, countOptions } from '../../assets/src/grid/FilterEngine.js';
import { formatPrice, tpl, plural } from '../../assets/src/utils/format.js';
import { buildHash } from '../../assets/src/utils/hash.js';
import { normalizeConfig, GRID_DEFAULTS } from '../../assets/src/core/Config.js';

describe('damp', () => {
  beforeEach(() => setReducedMotion(false));
  it('به هدف نزدیک می‌شود و از آن عبور نمی‌کند', () => {
    let v = 0;
    for (let i = 0; i < 300; i++) v = damp(v, 10, 0.2, 1 / 60);
    expect(v).toBeCloseTo(10, 3);
    expect(v).toBeLessThanOrEqual(10);
  });
  it('در حالت کاهش حرکت فوراً به هدف می‌رسد', () => {
    setReducedMotion(true);
    expect(damp(0, 5, 0.5, 0.016)).toBe(5);
  });
  it('clamp', () => expect(clamp(5, 0, 3)).toBe(3));
});

describe('color', () => {
  it('hexToRgb', () => {
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToRgb('#fff')).toEqual([1, 1, 1]);
    expect(hexToRgb('nope')).toBeNull();
  });
  it('contrast', () => {
    expect(isLight('#ffffff')).toBe(true);
    expect(contrastText('#000000')).toBe('#ffffff');
  });
});

describe('Store', () => {
  it('فقط هنگام تغییر واقعی اطلاع می‌دهد', () => {
    const s = new Store({ a: 1, list: [1] });
    let n = 0;
    s.subscribe('a', () => n++);
    s.set('a', 1);
    s.set('a', 2);
    expect(n).toBe(1);
    expect(s.set('list', [1])).toBe(false);
    expect(s.set('list', [1, 2])).toBe(true);
  });
  it('unsubscribe', () => {
    const s = new Store({ a: 1 });
    let n = 0;
    const off = s.subscribe('a', () => n++);
    off();
    s.set('a', 3);
    expect(n).toBe(0);
  });
});

describe('Events & Container', () => {
  it('on/emit/off/once', () => {
    const e = new Events();
    const seen = [];
    const off = e.on('x', (p) => seen.push(p));
    e.once('x', (p) => seen.push('once' + p));
    e.emit('x', 1);
    off();
    e.emit('x', 2);
    expect(seen).toEqual([1, 'once1']);
  });
  it('container singleton', () => {
    const c = new Container();
    c.singleton('a', () => ({}));
    c.bind('b', () => ({}));
    expect(c.make('a')).toBe(c.make('a'));
    expect(c.make('b')).not.toBe(c.make('b'));
    expect(() => c.make('zzz')).toThrow();
  });
});

describe('Layout & Quadtree', () => {
  it('چیدمان مرکزی', () => {
    const l = computeLayout(10, { gridCols: 4, itemSize: 2, gap: 1 });
    expect(l.cols).toBe(4);
    expect(l.rows).toBe(3);
    const sumX = l.positions.slice(0, 4).reduce((a, p) => a + p.x, 0);
    expect(Math.abs(sumX)).toBeLessThan(1e-9);
  });
  it('RTL محور x را برعکس می‌کند', () => {
    const a = computeLayout(4, { gridCols: 4, itemSize: 2, gap: 1 }, false);
    const b = computeLayout(4, { gridCols: 4, itemSize: 2, gap: 1 }, true);
    expect(a.positions[0].x).toBe(-b.positions[0].x);
  });
  it('quadtree همان نتیجه‌ی جستجوی خطی را می‌دهد', () => {
    const items = [];
    for (let i = 0; i < 200; i++) items.push({ x: (i % 20) * 3, y: Math.floor(i / 20) * 3, i });
    const qt = Quadtree.fromItems(items);
    const found = qt.query(30, 12, 4).map((x) => x.i).sort((a, b) => a - b);
    const linear = items.filter((p) => Math.abs(p.x - 30) <= 4 && Math.abs(p.y - 12) <= 4).map((x) => x.i).sort((a, b) => a - b);
    expect(found).toEqual(linear);
  });
});

describe('FilterEngine', () => {
  const p1 = { id: 1, price: 30, date: '2025-01-02', popularity: 1, attributes: { size: ['42', '43'], color: ['red'] } };
  const p2 = { id: 2, price: 10, date: '2025-02-01', popularity: 9, attributes: { size: ['41'], color: ['blue'] } };
  it('OR داخل ویژگی و AND بین ویژگی‌ها', () => {
    expect(matchesFilters(p1, { size: ['41', '42'] })).toBe(true);
    expect(matchesFilters(p1, { size: ['41'] })).toBe(false);
    expect(matchesFilters(p1, { size: ['42'], color: ['blue'] })).toBe(false);
    expect(matchesFilters(p1, {})).toBe(true);
  });
  it('sort و count', () => {
    expect(sortList([p1, p2], 'price-asc').map((p) => p.id)).toEqual([2, 1]);
    expect(sortList([p1, p2], 'popular').map((p) => p.id)).toEqual([2, 1]);
    expect(countOptions([p1, p2], 'size', '42')).toBe(1);
  });
});

describe('format / hash / config', () => {
  it('formatPrice و tpl', () => {
    expect(formatPrice(1000, { symbol: '$', position: 'left', decimals: 0 }, 'en')).toBe('$1,000');
    expect(tpl('فقط {n} عدد', { n: 3 })).toBe('فقط 3 عدد');
    expect(plural(1, { one: 'a', other: 'b' }, 'en')).toBe('a');
  });
  it('buildHash', () => {
    expect(buildHash({ product: 12, filter: { size: ['42'], color: ['red'] }, sort: 'default', collection: 'all' })).toBe('#product-12&filter=size%3A42%2Ccolor%3Ared');
    expect(buildHash({})).toBe('');
  });
  it('normalizeConfig مقادیر خالی را نادیده می‌گیرد', () => {
    const c = normalizeConfig({ grid: { gridCols: '5', itemSize: '' }, features: { wishlist: false } });
    expect(c.grid.gridCols).toBe(5);
    expect(c.grid.itemSize).toBe(GRID_DEFAULTS.itemSize);
    expect(c.features.wishlist).toBe(false);
    expect(c.features.gallery).toBe(true);
  });
});
