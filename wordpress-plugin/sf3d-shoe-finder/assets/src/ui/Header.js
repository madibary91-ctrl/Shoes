// هدر: عنوان، جستجوی زنده (Autocomplete با debounce ۳۰۰ms)، تغییر تم، دکمه‌ی سبد
import { h, icon, debounce } from '../utils/dom.js';
import { formatPrice, formatNumber } from '../utils/format.js';

export class Header {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    const c = app.config;
    const s = c.strings;
    this.items = [];
    this.active = -1;
    this.token = 0;

    this.input = h('input', {
      type: 'search', class: 'sf3d-search__input', placeholder: s.search, autocomplete: 'off',
      role: 'combobox', 'aria-expanded': 'false', 'aria-controls': app.uid + '-sugg', 'aria-autocomplete': 'list', 'aria-label': s.search,
    });
    this.list = h('ul', { class: 'sf3d-search__list', id: app.uid + '-sugg', role: 'listbox', hidden: true });
    this.search = h('div', { class: 'sf3d-search' }, icon('search', 18), this.input, this.list);

    this.themeBtn = h('button', { type: 'button', class: 'sf3d-iconbtn', 'aria-label': s.darkMode, title: s.darkMode });
    this.cartBadge = h('span', { class: 'sf3d-badge', 'aria-hidden': 'true' }, '0');
    this.cartBtn = h('button', { type: 'button', class: 'sf3d-iconbtn sf3d-cartbtn', 'aria-label': s.cart, title: s.cart }, icon('cart', 22), this.cartBadge);

    const actions = h('div', { class: 'sf3d-header__actions' });
    if (c.features.darkMode) actions.appendChild(this.themeBtn);
    if (c.features.cartDrawer) actions.appendChild(this.cartBtn);

    this.el = h('header', { class: 'sf3d-header' },
      h('div', { class: 'sf3d-brand' }, c.title || ''),
      c.features.search ? this.search : h('span'),
      actions);
    app.stage.appendChild(this.el);

    const run = debounce((q) => this.query(q), 300);
    this.input.addEventListener('input', () => {
      const q = this.input.value.trim();
      if (q.length < 2) return this.close();
      run(q);
      return undefined;
    });
    this.input.addEventListener('keydown', (e) => this.onKey(e));
    this.input.addEventListener('blur', () => setTimeout(() => this.close(), 150));
    this.themeBtn.addEventListener('click', () => app.toggleTheme());
    this.cartBtn.addEventListener('click', () => app.drawer.open());

    this.subs = [
      app.store.subscribe('theme', (t) => this.renderTheme(t)),
      app.store.subscribe('cart', (cart) => {
        this.cartBadge.textContent = formatNumber(cart.count || 0, c.locale);
        this.cartBadge.classList.toggle('is-empty', !cart.count);
      }),
    ];
    this.renderTheme(app.store.get('theme'));
    this.cartBadge.classList.add('is-empty');
  }

  renderTheme(t) {
    const s = this.app.config.strings;
    this.themeBtn.textContent = '';
    this.themeBtn.appendChild(icon(t === 'dark' ? 'sun' : 'moon', 20));
    const label = t === 'dark' ? s.lightMode : s.darkMode;
    this.themeBtn.setAttribute('aria-label', label);
    this.themeBtn.setAttribute('title', label);
  }

  async query(q) {
    const my = ++this.token;
    let results = [];
    try {
      const res = await this.app.client.search(q);
      results = res.products || [];
      this.app.mergeProducts(results);
    } catch (e) {
      // جایگزین: جستجوی محلی روی محصولات بارگذاری‌شده
      const needle = q.toLowerCase();
      results = Array.from(this.app.catalog.values()).filter((p) => p.title.toLowerCase().includes(needle));
    }
    if (my !== this.token) return; // پاسخ کهنه
    this.items = results.slice(0, 5);
    this.renderList();
  }

  renderList() {
    const { app } = this;
    const c = app.config;
    this.list.textContent = '';
    this.active = -1;
    if (!this.items.length) {
      this.list.appendChild(h('li', { class: 'sf3d-search__empty', role: 'option', 'aria-disabled': 'true' }, c.strings.noResults));
    }
    this.items.forEach((p, i) => {
      const li = h('li', { class: 'sf3d-search__item', role: 'option', id: `${app.uid}-opt-${i}`, 'aria-selected': 'false' },
        h('img', { src: p.image, alt: '', loading: 'lazy' }),
        h('span', { class: 'sf3d-search__name' }, p.title),
        h('span', { class: 'sf3d-search__price' }, formatPrice(p.price || 0, c.currency, c.locale)));
      li.addEventListener('mousedown', (e) => { e.preventDefault(); this.choose(i); });
      this.list.appendChild(li);
    });
    this.list.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
  }

  onKey(e) {
    if (e.key === 'Escape') { this.close(); return; }
    if (this.list.hidden || !this.items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = this.items.length;
      this.active = (this.active + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      Array.from(this.list.children).forEach((li, i) => li.setAttribute('aria-selected', String(i === this.active)));
      this.input.setAttribute('aria-activedescendant', `${this.app.uid}-opt-${this.active}`);
    } else if (e.key === 'Enter' && this.active >= 0) {
      e.preventDefault();
      this.choose(this.active);
    }
  }

  choose(i) {
    const p = this.items[i];
    if (!p) return;
    this.close();
    this.input.value = '';
    this.app.focusProduct(p.id);
  }

  close() {
    this.list.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
  }

  destroy() {
    this.subs.forEach((u) => u());
    this.el.remove();
  }
}
