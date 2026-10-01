// @vitest-environment jsdom
// تست دود: کل برنامه را با WebGL/Canvas ساختگی بالا می‌آورد و سناریوهای اصلی را اجرا می‌کند
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { buildBoot, SEED_PRODUCTS } from '../../../../src/lib/demo-data.ts';
import { mount } from '../../assets/src/index.js';

function makeGl() {
  let n = 100;
  const consts = {};
  const gl = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop !== 'string') return undefined;
      if (/^[A-Z][A-Z0-9_]+$/.test(prop)) return (consts[prop] ??= n++);
      return (...args) => {
        if (prop === 'getShaderParameter') return true;
        if (prop === 'getProgramParameter') return args[1] === gl.ACTIVE_UNIFORMS ? 0 : true;
        if (prop === 'getExtension') return null;
        if (prop.startsWith('create')) return {};
        return undefined;
      };
    },
  });
  return gl;
}

function make2d() {
  return new Proxy({}, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'measureText') return (s) => ({ width: String(s).length * 8 });
      return () => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}

let boot;
beforeAll(() => {
  const gl = makeGl();
  HTMLCanvasElement.prototype.getContext = function (type) { return type === 'webgl' || type === 'experimental-webgl' ? gl : make2d(); };
  Element.prototype.getBoundingClientRect = () => ({ width: 1280, height: 800, left: 0, top: 0, right: 1280, bottom: 800, x: 0, y: 0 });
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.IntersectionObserver = class { observe() {} disconnect() {} };
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = () => 1;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  globalThis.createImageBitmap = undefined;
  globalThis.Image = class { decode() { return new Promise(() => {}); } };
  Element.prototype.scrollIntoView = () => {};
  const cartItems = [];
  globalThis.fetch = vi.fn(async (url, opts) => {
    const u = String(url);
    const json = (data) => ({ ok: true, status: 200, json: async () => ({ success: true, data }) });
    if (u.includes('sf3d_add_to_cart')) {
      cartItems.push({ key: String(cartItems.length + 1), product_id: 1, name: 'x', quantity: 1, price_html: '1', image: '' });
      return json({ cart_item_key: '1', cart: { count: cartItems.length, subtotal_html: '10', items: cartItems } });
    }
    if (u.includes('sf3d_related')) return json({ products: SEED_PRODUCTS.slice(1, 5) });
    if (u.includes('sf3d_search')) return json({ products: SEED_PRODUCTS.slice(0, 2) });
    if (u.includes('sf3d_cart')) return json({ cart: { count: 0, subtotal_html: '', items: [] } });
    return json({});
  });
  boot = buildBoot(SEED_PRODUCTS, 'nonce123');
});

function setup() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const app = mount(root, JSON.parse(JSON.stringify(boot)));
  const scene = app.scene;
  for (let i = 1; i <= 30; i++) scene.frame(i * 16);
  return { app, root, scene };
}

describe('SF3D smoke', () => {
  it('بالا می‌آید و کاشی‌ها را می‌سازد', () => {
    const { app, root } = setup();
    expect(app.ready).toBe(true);
    expect(root.querySelector('.sf3d-island')).toBeTruthy();
    expect(app.scene.grid.list.length).toBe(SEED_PRODUCTS.length);
    expect(root.querySelectorAll('.sf3d-tab').length).toBeGreaterThan(3);
  });

  it('فوکوس، Variation، افزودن به سبد و Escape', async () => {
    const { app, root, scene } = setup();
    await app.focusProduct(101);
    for (let i = 31; i < 60; i++) scene.frame(i * 16);
    const card = root.querySelector('.sf3d-card');
    expect(card.classList.contains('is-open')).toBe(true);
    const add = root.querySelector('.sf3d-card__add');
    expect(add.disabled).toBe(true); // هنوز Variation کامل نیست
    const sel = root.querySelector('.sf3d-select');
    sel.value = '42';
    sel.dispatchEvent(new Event('change'));
    const sw = root.querySelector('.sf3d-swatch:not(.is-disabled)');
    sw.click();
    expect(root.querySelector('.sf3d-card__add').disabled).toBe(false);
    root.querySelector('.sf3d-card__add').click();
    await new Promise((r) => setTimeout(r, 20));
    expect(app.store.get('cart').count).toBe(1);
    expect(location.hash).toContain('product-101');
    app.closeProduct();
    expect(location.hash).not.toContain('product-101');
  });

  it('علاقه‌مندی، فیلتر و کلکسیون', async () => {
    const { app } = setup();
    app.toggleWishlist(102);
    expect(app.store.get('wishlist')).toContain(102);
    app.setCollection('wishlist');
    expect(app.scene.grid.list.length).toBe(1);
    app.setCollection('all');
    app.setFilter({ size: ['42'] });
    const n = app.scene.grid.list.length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(SEED_PRODUCTS.length);
    app.setFilter({});
    app.setSort('price-asc');
    expect(app.scene.grid.list[0].product.price).toBeLessThanOrEqual(app.scene.grid.list[1].product.price);
  });

  it('pickAt با کوآدتری کاشی را پیدا می‌کند', () => {
    const { app, scene } = setup();
    for (let i = 0; i < 200; i++) scene.frame(2000 + i * 16);
    const t = app.scene.grid.list[0];
    const r = t.screenRect(scene.camera);
    const hit = app.scene.grid.pickAt(r.x, r.y);
    expect(hit && hit.tile.id).toBe(t.id);
  });
});
