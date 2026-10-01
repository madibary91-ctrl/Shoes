// محصولات مشابه: ۴ تامبنیل افقی، بارگذاری تنبل پس از باز شدن کارت (?wc-ajax=sf3d_related&id=)
import { h } from '../utils/dom.js';

const cache = new Map();

export class RelatedProducts {
  /** @param {import('../core/App.js').App} app @param {Object} product */
  constructor(app, product) {
    this.app = app;
    this.product = product;
    this.dead = false;
    const s = app.config.strings;
    this.list = h('div', { class: 'sf3d-related__list', role: 'list' });
    this.el = h('section', { class: 'sf3d-related', 'aria-label': s.related, hidden: true },
      h('h3', { class: 'sf3d-related__title' }, s.related), this.list);
    // lazy: بعد از رندر اولیه‌ی کارت
    const run = () => !this.dead && this.load();
    (window.requestIdleCallback || ((f) => setTimeout(f, 250)))(run);
  }

  async load() {
    const { app, product } = this;
    let items = cache.get(product.id);
    if (!items) {
      try {
        const res = await app.client.related(product.id);
        items = (res.products || []).slice(0, 4);
        app.mergeProducts(items);
      } catch (e) {
        items = [];
      }
      if (!items.length) {
        // جایگزین: همان دسته، بدون خود محصول
        const cats = new Set(product.categories || []);
        items = Array.from(app.catalog.values())
          .filter((p) => p.id !== product.id && (p.categories || []).some((c) => cats.has(c)))
          .slice(0, 4);
      }
      cache.set(product.id, items);
    }
    if (this.dead || !items.length) return;
    items.forEach((p) => {
      const b = h('button', { type: 'button', class: 'sf3d-related__item', role: 'listitem', title: p.title, 'aria-label': p.title },
        h('img', { src: p.image, alt: '', loading: 'lazy', draggable: 'false' }),
        h('span', { class: 'sf3d-related__name' }, p.title));
      b.addEventListener('click', () => app.focusProduct(p.id));
      this.list.appendChild(b);
    });
    this.el.hidden = false;
  }

  destroy() {
    this.dead = true;
  }
}
