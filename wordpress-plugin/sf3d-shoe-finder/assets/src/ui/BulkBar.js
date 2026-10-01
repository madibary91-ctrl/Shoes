// انتخاب چندگانه (Ctrl/Cmd + کلیک) و افزودن دسته‌جمعی به سبد
import { h } from '../utils/dom.js';
import { formatNumber, tpl } from '../utils/format.js';

export class BulkBar {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    const s = app.config.strings;
    this.text = h('span', { class: 'sf3d-bulk__text', role: 'status' });
    this.add = h('button', { type: 'button', class: 'sf3d-btn sf3d-btn--primary' }, s.bulkAdd);
    this.clear = h('button', { type: 'button', class: 'sf3d-btn sf3d-btn--ghost' }, s.clear);
    this.el = h('div', { class: 'sf3d-bulk', hidden: true }, this.text, this.add, this.clear);
    app.stage.appendChild(this.el);
    this.clear.addEventListener('click', () => app.store.set('selection', []));
    this.add.addEventListener('click', () => this.run());
    this.unsub = app.store.subscribe('selection', (ids) => {
      this.el.hidden = !ids.length;
      this.text.textContent = tpl(s.selected, { n: formatNumber(ids.length, app.config.locale) });
      app.scene.grid.setSelection(ids);
    });
  }

  async run() {
    const { app } = this;
    const ids = app.store.get('selection');
    this.add.disabled = true;
    let ok = 0;
    let skipped = 0;
    for (const id of ids) {
      const p = app.getProduct(id);
      if (!p || !p.in_stock || p.type === 'variable') {
        skipped++;
        continue;
      }
      try {
        await app.addToCart(p, { quiet: true });
        ok++;
      } catch (e) {
        skipped++;
      }
    }
    this.add.disabled = false;
    const s = app.config.strings;
    const n = formatNumber(ok, app.config.locale);
    app.toast.show(`${n} ${s.products} ${s.added}${skipped ? ` — ${formatNumber(skipped, app.config.locale)} ${s.selectOptions}` : ''}`, { type: ok ? 'success' : 'error' });
    app.sr.announce(`${n} ${s.products} ${s.added}`);
    if (ok) app.store.set('selection', []);
  }

  destroy() {
    this.unsub();
    this.el.remove();
  }
}
