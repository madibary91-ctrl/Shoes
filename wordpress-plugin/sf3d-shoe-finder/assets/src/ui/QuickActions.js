// Quick Actions: ❤ Wishlist / 👁 Quick View / ⚖ Compare / 📤 Share
// دسکتاپ: روی hover ؛ موبایل: با long-press
import { h, icon, isCoarsePointer, safeStorage } from '../utils/dom.js';
import { formatPrice } from '../utils/format.js';

const CMP_KEY = 'sf3d:compare';

export class QuickActions {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    this.id = null;
    this.hideTimer = 0;
    this.storage = safeStorage();
    const s = app.config.strings;
    const mk = (ic, label, fn) => {
      const b = h('button', { type: 'button', class: 'sf3d-qa__btn', 'aria-label': label, title: label }, icon(ic, 18));
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      return b;
    };
    this.heart = mk('heart', s.wishlist, () => this.id !== null && app.toggleWishlist(this.id));
    this.view = mk('eye', s.quickView, () => this.id !== null && app.focusProduct(this.id));
    this.cmp = mk('compare', s.compare, () => this.id !== null && this.toggleCompare(this.id));
    this.share = mk('share', s.share, () => { const p = app.getProduct(this.id); p && app.share(p); });
    this.el = h('div', { class: 'sf3d-qa', role: 'toolbar', 'aria-label': s.quickView, hidden: true }, this.heart, this.view, this.cmp, this.share);
    app.stage.appendChild(this.el);

    try {
      app.store.set('compare', JSON.parse(this.storage.getItem(CMP_KEY) || '[]'));
    } catch (e) { /* خالی */ }

    this.el.addEventListener('pointerenter', () => clearTimeout(this.hideTimer));
    this.el.addEventListener('pointerleave', () => this.scheduleHide());
    this.subs = [
      app.store.subscribe('hover', (id) => {
        if (isCoarsePointer()) return;
        if (id !== null) this.showFor(id);
        else this.scheduleHide();
      }),
      app.store.subscribe('activeProduct', (id) => { if (id !== null) this.hide(); }),
      app.store.subscribe('wishlist', () => this.sync()),
    ];
    this.offLong = app.events.on('tile:longpress', (tile) => this.showFor(tile.id, true));
    this.offFrame = app.events.on('frame', () => this.place());
    this.onDoc = (e) => { if (!this.el.contains(e.target) && this.sticky) this.hide(); };
    document.addEventListener('pointerdown', this.onDoc);
  }

  showFor(id, sticky = false) {
    if (this.app.store.get('activeProduct') !== null) return;
    clearTimeout(this.hideTimer);
    this.id = id;
    this.sticky = sticky;
    this.el.hidden = false;
    this.sync();
    this.place();
  }

  scheduleHide() {
    clearTimeout(this.hideTimer);
    if (this.sticky) return;
    this.hideTimer = setTimeout(() => this.hide(), 260);
  }

  hide() {
    this.el.hidden = true;
    this.id = null;
    this.sticky = false;
  }

  sync() {
    if (this.id === null) return;
    const on = this.app.store.get('wishlist').includes(this.id);
    this.heart.classList.toggle('is-on', on);
    this.heart.setAttribute('aria-pressed', String(on));
    const inCmp = (this.app.store.get('compare') || []).includes(this.id);
    this.cmp.classList.toggle('is-on', inCmp);
    this.cmp.setAttribute('aria-pressed', String(inCmp));
  }

  place() {
    if (this.el.hidden || this.id === null) return;
    const t = this.app.scene.grid.getTile(this.id);
    if (!t) return;
    const r = t.screenRect(this.app.scene.camera);
    this.el.style.transform = `translate(${Math.round(r.x)}px, ${Math.round(r.top - 8)}px) translate(-50%, -100%)`;
  }

  toggleCompare(id) {
    const cur = this.app.store.get('compare') || [];
    let next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    if (next.length > 3) next = next.slice(-3);
    this.app.store.set('compare', next);
    this.storage.setItem(CMP_KEY, JSON.stringify(next));
    this.sync();
    if (next.length >= 2 && !cur.includes(id)) this.openCompare(next);
  }

  openCompare(ids) {
    const { app } = this;
    const c = app.config;
    const s = c.strings;
    const products = ids.map((i) => app.getProduct(i)).filter(Boolean);
    const rows = [
      [s.size, (p) => ((p.attributes && p.attributes.size) || []).join('، ') || '—'],
      [s.color, (p) => ((p.attributes && p.attributes.color) || []).join('، ') || '—'],
      ['', (p) => (p.in_stock ? s.inStock : s.outOfStock)],
    ];
    const close = h('button', { type: 'button', class: 'sf3d-iconbtn', 'aria-label': s.close }, icon('close', 20));
    const table = h('table', { class: 'sf3d-compare__table' },
      h('thead', null, h('tr', null, h('th'), products.map((p) => h('th', null, h('img', { src: p.image, alt: '' }), h('div', null, p.title))))),
      h('tbody', null,
        h('tr', null, h('th', null, ''), products.map((p) => h('td', null, formatPrice(p.price || 0, c.currency, c.locale)))),
        rows.map(([label, fn]) => h('tr', null, h('th', null, label), products.map((p) => h('td', null, fn(p)))))));
    const modal = h('div', { class: 'sf3d-compare', role: 'dialog', 'aria-modal': 'true', 'aria-label': s.compareTitle },
      h('div', { class: 'sf3d-compare__head' }, h('h2', null, s.compareTitle), close), table);
    const back = h('div', { class: 'sf3d-backdrop is-in' });
    app.stage.append(back, modal);
    const release = app.focusManager.trap(modal, { onEscape: () => end(), initial: close });
    const end = () => { release(); modal.remove(); back.remove(); };
    close.addEventListener('click', end);
    back.addEventListener('click', end);
  }

  destroy() {
    this.subs.forEach((u) => u());
    this.offLong();
    this.offFrame();
    document.removeEventListener('pointerdown', this.onDoc);
    this.el.remove();
  }
}
