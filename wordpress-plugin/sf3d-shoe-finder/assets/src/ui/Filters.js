// پنل فیلتر/مرتب‌سازی: چیپ‌های چندانتخابی، شمارنده‌ی «Nike (۱۲)»، دکمه‌ی ریست
import { h } from '../utils/dom.js';
import { formatNumber } from '../utils/format.js';
import { matchesFilters, countOptions, hasActiveFilters } from '../grid/FilterEngine.js';

export class Filters {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    this.el = h('div', { class: 'sf3d-filters', role: 'group', 'aria-label': app.config.strings.filters });
    this.subs = [
      app.store.subscribe('filter', () => this.render()),
      app.store.subscribe('sort', () => this.render()),
      app.store.subscribe('collection', () => this.render()),
    ];
    this.render();
  }

  collectionProducts() {
    const grid = this.app.scene.grid;
    const set = this.app.resolveCollection(this.app.store.get('collection'));
    return Array.from(this.app.catalog.values()).filter((p) => !set || set.has(p.id)).filter((p) => grid.getTile(p.id));
  }

  toggle(key, value) {
    const f = this.app.store.get('filter');
    const cur = f.selected[key] || [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    const selected = { ...f.selected, [key]: next };
    if (!next.length) delete selected[key];
    this.app.setFilter(selected);
  }

  render() {
    const { app } = this;
    const c = app.config;
    const s = c.strings;
    const f = app.store.get('filter');
    const sort = app.store.get('sort');
    const products = this.collectionProducts();
    this.el.textContent = '';

    if (c.features.sort) {
      const opts = [['default', s.sortDefault], ['new', s.sortNew], ['price-asc', s.sortPriceAsc], ['price-desc', s.sortPriceDesc], ['popular', s.sortPopular]];
      const row = h('div', { class: 'sf3d-filters__row', role: 'radiogroup', 'aria-label': s.sort },
        h('span', { class: 'sf3d-filters__label' }, s.sort));
      opts.forEach(([k, label]) => {
        const b = h('button', { type: 'button', class: `sf3d-chip${sort === k ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(sort === k) }, label);
        b.addEventListener('click', () => app.setSort(k));
        row.appendChild(b);
      });
      this.el.appendChild(row);
    }

    if (c.features.filters) {
      (app.payload.filters || []).forEach((group) => {
        const sel = f.selected[group.key] || [];
        const others = { ...f.selected };
        delete others[group.key];
        const pool = products.filter((p) => matchesFilters(p, others));
        const row = h('div', { class: 'sf3d-filters__row', role: 'group', 'aria-label': group.label },
          h('span', { class: 'sf3d-filters__label' }, group.label));
        group.options.forEach((o) => {
          const n = countOptions(pool, group.key, o.value);
          const on = sel.includes(o.value);
          if (!n && !on) return;
          const b = h('button', { type: 'button', class: `sf3d-chip${on ? ' is-on' : ''}`, 'aria-pressed': String(on) },
            group.type === 'color' && o.hex ? h('span', { class: 'sf3d-chip__dot', style: { background: o.hex } }) : null,
            `${o.label} `, h('span', { class: 'sf3d-chip__count' }, `(${formatNumber(n, c.locale)})`));
          b.addEventListener('click', () => this.toggle(group.key, o.value));
          row.appendChild(b);
        });
        if (row.children.length > 1) this.el.appendChild(row);
      });
    }

    if (hasActiveFilters(f.selected) || sort !== 'default') {
      const reset = h('button', { type: 'button', class: 'sf3d-chip sf3d-chip--reset' }, s.reset);
      reset.addEventListener('click', () => { app.setFilter({}); app.setSort('default'); });
      this.el.appendChild(reset);
    }
  }

  destroy() {
    this.subs.forEach((u) => u());
    this.el.remove();
  }
}
