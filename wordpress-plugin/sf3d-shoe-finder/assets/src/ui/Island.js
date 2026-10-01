// Dynamic Island: نوار پایین (کلکسیون‌ها، علاقه‌مندی‌ها، اخیراً دیده‌شده، فیلتر)
import { h, icon } from '../utils/dom.js';
import { formatNumber } from '../utils/format.js';
import { Filters } from './Filters.js';
import { hasActiveFilters } from '../grid/FilterEngine.js';

export class Island {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    this.open = false;
    const c = app.config;
    const s = c.strings;

    this.tabs = h('div', { class: 'sf3d-island__tabs', role: 'tablist', 'aria-label': s.products });
    this.buttons = new Map();
    const add = (slug, label, extra) => {
      const b = h('button', { type: 'button', class: 'sf3d-tab', role: 'tab', 'aria-selected': 'false', dataset: { slug } }, extra, label);
      b.addEventListener('click', () => app.setCollection(slug));
      this.tabs.appendChild(b);
      this.buttons.set(slug, b);
      return b;
    };

    (app.payload.collections || []).forEach((col) => add(col.slug, col.name));
    if (!this.buttons.has('all')) {
      const b = add('all', s.all);
      this.tabs.prepend(b);
    }
    if (c.features.wishlist) {
      this.wCount = h('span', { class: 'sf3d-tab__count' }, '0');
      add('wishlist', s.wishlist, icon('heartFill', 16));
      this.buttons.get('wishlist').append(this.wCount);
    }
    if (c.features.recent) add('recent', s.recent, icon('clock', 16));

    this.filterBtn = h('button', { type: 'button', class: 'sf3d-tab sf3d-tab--filter', 'aria-expanded': 'false', 'aria-controls': app.uid + '-filters' }, icon('filter', 16), s.filters);
    this.filterDot = h('span', { class: 'sf3d-dot', hidden: true });
    this.filterBtn.append(this.filterDot);
    this.filterBtn.addEventListener('click', () => this.toggle());

    const hasFilterUi = (c.features.filters && (app.payload.filters || []).length) || c.features.sort;
    this.filters = hasFilterUi ? new Filters(app) : null;
    this.panel = h('div', { class: 'sf3d-island__panel', id: app.uid + '-filters', hidden: true }, this.filters ? this.filters.el : null);

    this.el = h('nav', { class: 'sf3d-island', 'aria-label': s.products }, this.panel,
      h('div', { class: 'sf3d-island__bar' }, this.tabs, hasFilterUi ? this.filterBtn : null));
    app.stage.appendChild(this.el);

    this.subs = [
      app.store.subscribe('collection', (slug) => this.markActive(slug)),
      app.store.subscribe('wishlist', (l) => {
        if (this.wCount) this.wCount.textContent = formatNumber(l.length, c.locale);
        this.buttons.get('wishlist')?.classList.toggle('has-items', l.length > 0);
      }),
      app.store.subscribe('filter', (f) => { this.filterDot.hidden = !hasActiveFilters(f.selected); }),
      app.store.subscribe('activeProduct', (id) => this.el.classList.toggle('is-dim', id !== null)),
    ];
    this.markActive(app.store.get('collection'));
    this.wCount && (this.wCount.textContent = formatNumber(app.store.get('wishlist').length, c.locale));
  }

  markActive(slug) {
    this.buttons.forEach((b, k) => {
      const on = k === slug;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    const b = this.buttons.get(slug);
    b && b.scrollIntoView && b.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  toggle(force) {
    this.open = force !== undefined ? force : !this.open;
    this.panel.hidden = !this.open;
    this.el.classList.toggle('is-open', this.open);
    this.filterBtn.setAttribute('aria-expanded', String(this.open));
  }

  destroy() {
    this.subs.forEach((u) => u());
    this.filters && this.filters.destroy();
    this.el.remove();
  }
}
