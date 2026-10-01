// حالت خالی (علاقه‌مندی/اخیراً دیده‌شده/نتیجه‌ی فیلتر خالی)
import { h, icon } from '../utils/dom.js';

export class EmptyState {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    this.msg = h('p', { class: 'sf3d-empty__msg' });
    this.reset = h('button', { type: 'button', class: 'sf3d-btn sf3d-btn--ghost' }, app.config.strings.reset);
    this.ico = h('div', { class: 'sf3d-empty__icon' });
    this.el = h('div', { class: 'sf3d-empty', hidden: true, role: 'status' }, this.ico, this.msg, this.reset);
    app.stage.appendChild(this.el);
    this.reset.addEventListener('click', () => { app.setFilter({}); app.setCollection('all'); });
    this.off = app.events.on('grid:layout', ({ count, total }) => this.update(count, total));
  }

  update(count, total) {
    const { app } = this;
    const s = app.config.strings;
    const col = app.store.get('collection');
    this.el.hidden = count > 0;
    if (count > 0) return;
    this.ico.textContent = '';
    if (total === 0 && col === 'wishlist') {
      this.ico.appendChild(icon('heart', 40));
      this.msg.textContent = s.emptyWishlist;
      this.reset.hidden = true;
    } else if (total === 0 && col === 'recent') {
      this.ico.appendChild(icon('clock', 40));
      this.msg.textContent = s.emptyRecent;
      this.reset.hidden = true;
    } else {
      this.ico.appendChild(icon('search', 40));
      this.msg.textContent = s.noResults;
      this.reset.hidden = false;
    }
  }

  destroy() {
    this.off();
    this.el.remove();
  }
}
