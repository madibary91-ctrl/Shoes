// اپلیکیشن: سیم‌کشی Store، Events، Scene و کامپوننت‌های UI
import { Store } from './Store.js';
import { Events } from './Events.js';
import { Container } from './Container.js';
import { normalizeConfig } from './Config.js';
import { Scene } from '../render/Scene.js';
import { CartClient } from '../cart/CartClient.js';
import { Header } from '../ui/Header.js';
import { Island } from '../ui/Island.js';
import { Card } from '../ui/Card.js';
import { Toast } from '../ui/Toast.js';
import { MiniMap } from '../ui/MiniMap.js';
import { CartDrawer } from '../ui/CartDrawer.js';
import { QuickActions } from '../ui/QuickActions.js';
import { BulkBar } from '../ui/BulkBar.js';
import { EmptyState } from '../ui/EmptyState.js';
import { WishlistManager } from '../ui/Wishlist.js';
import { FocusManager } from '../a11y/FocusManager.js';
import { ScreenReader } from '../a11y/ScreenReader.js';
import { KeyboardNav } from '../a11y/KeyboardNav.js';
import { h, safeStorage, prefersReducedMotion } from '../utils/dom.js';
import { setReducedMotion } from '../utils/damp.js';
import { parseHash, writeHash } from '../utils/hash.js';
import { tpl } from '../utils/format.js';

let uidCounter = 0;
const RECENT_KEY = 'sf3d:recent';
const THEME_KEY = 'sf3d:theme';

export class App {
  /**
   * @param {HTMLElement} root
   * @param {{config:Object, payload:Object}} boot
   */
  constructor(root, boot) {
    this.root = root;
    this.boot = boot;
    this.uid = `sf3d-${++uidCounter}`;
    this.destroyers = [];
    this.ready = false;
  }

  /** @param {Map<string,Object>} plugins */
  init(plugins = new Map()) {
    const { root, boot } = this;
    this.config = normalizeConfig(boot.config || {});
    this.payload = { products: [], collections: [], filters: [], ...(boot.payload || {}) };
    const c = this.config;
    this.storage = safeStorage();

    this.events = new Events(root);
    this.store = new Store({
      activeProduct: null,
      collection: 'all',
      filter: { selected: {} },
      sort: 'default',
      cart: { count: 0, subtotal_html: '', items: [] },
      wishlist: [],
      hover: null,
      zoom: c.grid.zoomOut,
      recent: this.readRecent(),
      selection: [],
      compare: [],
      theme: 'light',
    });
    this.client = new CartClient(c);
    this.focusManager = new FocusManager();
    this.catalog = new Map(this.payload.products.map((p) => [p.id, p]));

    this.container = new Container();
    this.container.instance('app', this).instance('store', this.store).instance('events', this.events).instance('config', c).instance('client', this.client);

    // اسکلت DOM
    root.textContent = '';
    root.classList.add('sf3d-root');
    root.dir = c.rtl ? 'rtl' : 'ltr';
    if (c.height) root.style.setProperty('--sf3d-height', c.height);
    this.stage = h('div', { class: 'sf3d-stage' });
    root.appendChild(this.stage);

    // دسترس‌پذیری: کاهش حرکت
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    setReducedMotion(prefersReducedMotion());
    root.classList.toggle('is-reduced-motion', prefersReducedMotion());
    if (mq && mq.addEventListener) {
      const onMq = () => {
        setReducedMotion(mq.matches);
        root.classList.toggle('is-reduced-motion', mq.matches);
      };
      mq.addEventListener('change', onMq);
      this.destroyers.push(() => mq.removeEventListener('change', onMq));
    }

    this.sr = new ScreenReader(root);
    this.toast = new Toast(this.stage);

    this.scene = new Scene({
      container: this.stage,
      config: c,
      store: this.store,
      events: this.events,
      resolveCollection: (slug) => this.resolveCollection(slug),
      actions: {
        toggleFocus: (id) => this.toggleFocus(id),
        toggleWishlist: (id) => this.toggleWishlist(id),
        toggleSelect: (id) => this.toggleSelect(id),
        background: () => {
          if (this.store.get('activeProduct') !== null) this.closeProduct();
          this.island && this.island.toggle(false);
        },
      },
    });
    if (!this.scene.mount()) {
      this.stage.appendChild(h('p', { class: 'sf3d-nogl' }, 'WebGL در این مرورگر پشتیبانی نمی‌شود.'));
      this.events.emit('error', new Error('webgl unsupported'));
      return this;
    }
    this.scene.grid.setProducts(this.payload.products);

    this.wishlist = new WishlistManager(this);
    this.container.instance('wishlist', this.wishlist);

    // مؤلفه‌های UI
    this.header = new Header(this);
    this.island = new Island(this);
    this.card = new Card(this);
    this.drawer = new CartDrawer(this);
    this.empty = new EmptyState(this);
    if (c.features.minimap) this.minimap = new MiniMap(this);
    if (c.features.quickActions) this.quick = new QuickActions(this);
    if (c.features.bulk) this.bulk = new BulkBar(this);
    this.kbd = new KeyboardNav(this);
    this.destroyers.push(() => [this.header, this.island, this.card, this.drawer, this.empty, this.minimap, this.quick, this.bulk, this.kbd].forEach((x) => x && x.destroy && x.destroy()));

    this.bindState();
    this.initTheme();

    // وضعیت اولیه از hash و تنظیمات
    const hs = c.features.hashSync ? parseHash() : { product: null, filter: {}, sort: '', collection: '' };
    this.scene.setDark(this.store.get('theme') === 'dark');
    const startCol = hs.collection || c.startCollection || 'all';
    this.store.set('filter', { selected: hs.filter });
    if (hs.sort) this.store.set('sort', hs.sort);
    this.store.set('collection', this.hasCollection(startCol) ? startCol : 'all');
    this.scene.grid.setWishlist(this.store.get('wishlist'));
    this.scene.grid.collection = this.store.get('collection');
    this.scene.grid.refresh({ reset: true });
    this.scene.start();

    this.bindGlobal();
    this.refreshCart();
    this.ready = true;
    this.events.emit('ready', this);
    if (hs.product) this.focusProduct(hs.product);

    plugins.forEach((plugin, name) => this.usePlugin(name, plugin));
    return this;
  }

  // ---------- پلاگین‌ها ----------
  usePlugin(name, plugin) {
    this.pluginsUsed = this.pluginsUsed || new Set();
    if (this.pluginsUsed.has(name)) return;
    this.pluginsUsed.add(name);
    if (plugin.hooks) Object.entries(plugin.hooks).forEach(([ev, fn]) => this.destroyers.push(this.events.on(ev, fn)));
    if (typeof plugin.init === 'function') {
      try {
        plugin.init(this);
      } catch (e) {
        this.events.emit('error', e);
      }
    }
  }

  // ---------- کلکسیون‌ها ----------
  hasCollection(slug) {
    return ['all', 'wishlist', 'recent'].includes(slug) || (this.payload.collections || []).some((x) => x.slug === slug);
  }

  /** @returns {Set<number>|null} null = همه */
  resolveCollection(slug) {
    if (slug === 'all') return null;
    if (slug === 'wishlist') return new Set(this.store.get('wishlist'));
    if (slug === 'recent') return new Set(this.store.get('recent'));
    const col = (this.payload.collections || []).find((x) => x.slug === slug);
    if (!col) return null;
    return new Set(Array.from(this.catalog.values()).filter((p) => (p.categories || []).includes(col.id)).map((p) => p.id));
  }

  // ---------- Store ----------
  bindState() {
    const { store, events } = this;
    const grid = () => this.scene.grid;
    const hashWrite = () => {
      if (!this.config.features.hashSync || !this.ready) return;
      writeHash({ product: store.get('activeProduct'), filter: store.get('filter').selected, sort: store.get('sort'), collection: store.get('collection') });
    };
    this.destroyers.push(
      store.subscribe('wishlist', (ids) => {
        grid().setWishlist(ids);
        if (store.get('collection') === 'wishlist') grid().refresh();
      }),
      store.subscribe('recent', () => {
        if (store.get('collection') === 'recent') grid().refresh();
      }),
      store.subscribe('filter', (f) => {
        grid().refresh();
        events.emit('filter', f.selected);
        hashWrite();
      }),
      store.subscribe('sort', () => {
        grid().refresh();
        hashWrite();
      }),
      store.subscribe('collection', (slug) => {
        if (store.get('activeProduct') !== null) store.set('activeProduct', null);
        grid().setCollection(slug, true);
        if (!this.ready) return;
        this.scene.camera.setTarget(0, 0, this.config.grid.zoomOut);
        events.emit('collection', slug);
        hashWrite();
      }),
      store.subscribe('activeProduct', (id) => {
        const prev = this.lastActive;
        this.lastActive = id;
        events.emit('focus', id !== null ? this.getProduct(id) : null);
        hashWrite();
        if (id !== null) {
          this.pushRecent(id);
          const p = this.getProduct(id);
          const t = grid().getTile(id);
          p && this.sr.announce(tpl(this.config.strings.focused, { title: p.title }));
          t && (t.labelVersion = -1);
        } else if (prev !== undefined && prev !== null) {
          this.kbd && this.kbd.restoreFocus(prev);
        }
      }),
      store.subscribe('theme', (t) => {
        this.root.dataset.theme = t;
        this.scene.setDark(t === 'dark');
      }),
      store.subscribe('hover', () => {}),
    );
  }

  bindGlobal() {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable);
      if (e.key === 'Escape' && !typing && this.store.get('activeProduct') !== null && !this.drawer.isOpen) {
        this.closeProduct();
      } else if ((e.key === 'w' || e.key === 'W') && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && this.config.features.wishlist) {
        const id = this.store.get('activeProduct') ?? this.store.get('hover') ?? this.kbd.focusedId;
        if (id !== null && id !== undefined) this.toggleWishlist(id);
      }
    };
    this.root.addEventListener('keydown', onKey);
    const onHash = () => {
      if (!this.config.features.hashSync) return;
      const hs = parseHash();
      const cur = this.store.get('activeProduct');
      if (hs.product && hs.product !== cur) this.focusProduct(hs.product);
      else if (!hs.product && cur !== null) this.store.set('activeProduct', null);
    };
    window.addEventListener('hashchange', onHash);
    this.destroyers.push(() => {
      this.root.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
    });
  }

  // ---------- تم ----------
  initTheme() {
    const pref = this.storage.getItem(THEME_KEY);
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    const auto = () => (mq && mq.matches ? 'dark' : 'light');
    const initial = pref || (this.config.theme === 'auto' ? auto() : this.config.theme);
    this.store.set('theme', initial === 'dark' ? 'dark' : 'light');
    this.root.dataset.theme = this.store.get('theme');
    if (mq && mq.addEventListener) {
      const onChange = () => { if (!this.storage.getItem(THEME_KEY) && this.config.theme === 'auto') this.store.set('theme', auto()); };
      mq.addEventListener('change', onChange);
      this.destroyers.push(() => mq.removeEventListener('change', onChange));
    }
  }

  toggleTheme() {
    const next = this.store.get('theme') === 'dark' ? 'light' : 'dark';
    this.storage.setItem(THEME_KEY, next);
    this.store.set('theme', next);
  }

  // ---------- محصولات ----------
  getProduct(id) {
    return this.catalog.get(id) || null;
  }

  mergeProducts(list) {
    (list || []).forEach((p) => {
      if (!p || this.catalog.has(p.id)) return;
      this.catalog.set(p.id, p);
      this.scene.grid.addProduct(p);
    });
  }

  async ensureProduct(id) {
    let p = this.getProduct(id);
    if (p) return p;
    try {
      const res = await this.client.product(id);
      if (res && res.product) {
        this.mergeProducts([res.product]);
        p = this.getProduct(id);
      }
    } catch (e) { /* محصول پیدا نشد */ }
    return p;
  }

  toggleFocus(id) {
    if (this.store.get('activeProduct') === id) this.closeProduct();
    else this.focusProduct(id);
  }

  async focusProduct(id) {
    const p = await this.ensureProduct(id);
    if (!p) return;
    const grid = this.scene.grid;
    let tile = grid.getTile(id);
    if (!tile) return;
    if (!tile.gridVisible || !tile.matches) {
      // اگر در کلکسیون/فیلتر فعلی نیست، به همه برگرد
      this.store.set('activeProduct', null);
      if (!this.store.get('filter') || Object.keys(this.store.get('filter').selected).length) this.store.set('filter', { selected: {} });
      if (this.store.get('collection') !== 'all') this.store.set('collection', 'all');
      else grid.refresh();
      tile = grid.getTile(id);
    }
    this.store.set('activeProduct', id);
  }

  closeProduct() {
    this.store.set('activeProduct', null);
  }

  setCollection(slug) {
    if (this.store.get('collection') === slug) {
      this.scene.camera.setTarget(0, 0, this.config.grid.zoomOut);
      return;
    }
    this.store.set('collection', slug);
  }

  setFilter(selected) {
    this.store.set('filter', { selected });
  }

  setSort(key) {
    this.store.set('sort', key);
  }

  toggleWishlist(id) {
    return this.wishlist.toggle(id);
  }

  toggleSelect(id) {
    const cur = this.store.get('selection');
    this.store.set('selection', cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  readRecent() {
    try {
      return (JSON.parse(safeStorage().getItem(RECENT_KEY) || '[]') || []).map(Number).slice(0, 8);
    } catch (e) {
      return [];
    }
  }

  pushRecent(id) {
    if (!this.config.features.recent) return;
    const next = [id, ...this.store.get('recent').filter((x) => x !== id)].slice(0, 8);
    this.store.set('recent', next);
    this.storage.setItem(RECENT_KEY, JSON.stringify(next));
  }

  // ---------- سبد خرید ----------
  normalizeCart(cart) {
    return { count: 0, subtotal_html: '', items: [], ...(cart || {}) };
  }

  async refreshCart() {
    try {
      const data = await this.client.getCart();
      this.store.set('cart', this.normalizeCart(data.cart || data));
    } catch (e) { /* بی‌صدا */ }
  }

  /**
   * @param {Object} product
   * @param {{variationId?:number, attributes?:Object, quantity?:number, quiet?:boolean}} opts
   */
  async addToCart(product, opts = {}) {
    const s = this.config.strings;
    try {
      const res = await this.client.addToCart({
        productId: product.id,
        variationId: opts.variationId || 0,
        quantity: opts.quantity || 1,
        variation: opts.attributes || {},
      });
      this.store.set('cart', this.normalizeCart(res.cart));
      this.events.emit('cart:added', { product, data: res });
      const msg = tpl(s.addedAnnounce, { title: product.title });
      this.sr.announce(msg);
      if (!opts.quiet) {
        this.toast.show(msg, {
          type: 'success',
          action: this.config.features.cartDrawer ? { label: s.cart, onClick: () => this.drawer.open() } : null,
        });
      }
      return res;
    } catch (e) {
      this.events.emit('error', e);
      const msg = (e && e.message && !/^HTTP/.test(e.message) ? e.message : s.error);
      this.sr.announce(msg);
      this.toast.show(msg, { type: 'error' });
      throw e;
    }
  }

  async removeFromCart(item) {
    const res = await this.client.removeItem(item.key);
    this.store.set('cart', this.normalizeCart(res.cart));
    this.events.emit('cart:removed', { item, data: res });
    return res;
  }

  // ---------- اشتراک‌گذاری ----------
  async share(product) {
    const s = this.config.strings;
    const url = `${location.origin}${location.pathname}${location.search}#product-${product.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      this.toast.show(s.linkCopied, { type: 'success' });
      this.sr.announce(s.linkCopied);
    } catch (e) {
      // کاربر لغو کرد یا کلیپ‌بورد در دسترس نیست
      if (e && e.name !== 'AbortError') this.toast.show(url, { type: 'info', duration: 6000 });
    }
  }

  destroy() {
    this.destroyers.forEach((d) => { try { d(); } catch (e) { /* ignore */ } });
    this.destroyers = [];
    this.wishlist && this.wishlist.destroy();
    this.scene && this.scene.destroy();
    this.root.classList.remove('sf3d-root');
  }
}
