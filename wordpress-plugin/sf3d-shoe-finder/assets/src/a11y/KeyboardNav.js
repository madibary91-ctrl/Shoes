// لایه‌ی دسترس‌پذیر: هر کاشی قابل‌مشاهده یک <button> واقعی داخل role=grid
import { h } from '../utils/dom.js';
import { formatPrice, tpl } from '../utils/format.js';

export class KeyboardNav {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    this.btns = new Map();
    this.sig = '';
    this.layoutDirty = true;
    this.pending = null;
    this.focusedId = null;
    this.tick = 0;
    const s = app.config.strings;
    this.skip = h('a', { class: 'sf3d-skip', href: '#' + app.uid + '-grid' }, s.skip);
    this.skip.addEventListener('click', (e) => {
      e.preventDefault();
      const first = this.layer.querySelector('button');
      first && first.focus();
    });
    this.layer = h('div', { class: 'sf3d-a11y-grid', role: 'grid', id: app.uid + '-grid', 'aria-label': s.gridLabel });
    app.root.prepend(this.skip);
    app.stage.appendChild(this.layer);

    this.layer.addEventListener('keydown', (e) => this.onKey(e));
    app.events.on('frame', () => this.sync());
    app.events.on('grid:layout', () => { this.layoutDirty = true; });
    app.store.subscribe('activeProduct', () => { this.layoutDirty = true; });
  }

  describe(t) {
    const p = t.product;
    const c = this.app.config;
    const bits = [p.title, formatPrice(p.price || 0, c.currency, c.locale)];
    if (p.on_sale && p.discount) bits.push(`${c.strings.sale} ${p.discount}%`);
    if (!p.in_stock) bits.push(c.strings.outOfStock);
    return bits.join('، ');
  }

  sync() {
    // هر ۲ فریم یک‌بار برای صرفه‌جویی
    if ((this.tick++ & 1) === 1) return;
    const { camera, grid } = this.app.scene;
    const sig = `${camera.x.toFixed(2)}|${camera.y.toFixed(2)}|${camera.zoom.toFixed(2)}|${grid.activeId}`;
    if (sig === this.sig && !this.layoutDirty && !this.pending) return;
    this.sig = sig;
    const list = grid.visibleTiles().slice(0, 80);
    const keep = new Set(list.map((t) => t.id));
    if (this.pending !== null) keep.add(this.pending);
    if (this.focusedId !== null) keep.add(this.focusedId);

    if (this.layoutDirty || keep.size !== this.btns.size || [...keep].some((id) => !this.btns.has(id))) {
      const hadFocus = this.layer.contains(document.activeElement);
      this.rebuild(list, keep, grid);
      this.layoutDirty = false;
      if (hadFocus && this.pending === null && this.btns.has(this.focusedId)) this.pending = this.focusedId;
    }
    this.btns.forEach((btn, id) => {
      const t = grid.getTile(id);
      if (!t) return;
      const r = t.screenRect(camera);
      const size = Math.max(48, r.size);
      btn.style.transform = `translate(${Math.round(r.x - size / 2)}px, ${Math.round(r.y - size / 2)}px)`;
      btn.style.width = btn.style.height = `${Math.round(size)}px`;
    });
    if (this.pending !== null && this.btns.has(this.pending)) {
      this.btns.get(this.pending).focus({ preventScroll: true });
      this.pending = null;
    }
  }

  rebuild(list, keep, grid) {
    const tiles = grid.list.filter((t) => keep.has(t.id));
    this.layer.textContent = '';
    this.btns.clear();
    const rows = new Map();
    tiles.forEach((t) => {
      if (!rows.has(t.row)) rows.set(t.row, []);
      rows.get(t.row).push(t);
    });
    const focusMode = grid.activeId !== null;
    [...rows.keys()].sort((a, b) => a - b).forEach((r) => {
      const row = h('div', { role: 'row', class: 'sf3d-a11y-row', 'aria-rowindex': r + 1 });
      rows.get(r).sort((a, b) => a.col - b.col).forEach((t) => {
        const btn = h('button', {
          type: 'button',
          class: 'sf3d-a11y-btn',
          tabindex: t.id === this.focusedId || (this.focusedId === null && t === tiles[0]) ? '0' : '-1',
          'aria-label': this.describe(t),
          'aria-pressed': focusMode ? String(grid.activeId === t.id) : null,
          dataset: { id: t.id, row: t.row, col: t.col },
        });
        btn.addEventListener('click', () => this.app.toggleFocus(t.id));
        btn.addEventListener('focus', () => {
          this.focusedId = t.id;
          grid.hoverId = t.id;
          this.app.scene.ensureInView(t);
          this.btns.forEach((b) => b.setAttribute('tabindex', b === btn ? '0' : '-1'));
        });
        btn.addEventListener('blur', () => {
          if (grid.hoverId === t.id) grid.hoverId = null;
        });
        this.btns.set(t.id, btn);
        row.appendChild(h('div', { role: 'gridcell', class: 'sf3d-a11y-cell' }, btn));
      });
      this.layer.appendChild(row);
    });
  }

  onKey(e) {
    const grid = this.app.scene.grid;
    const cur = grid.getTile(this.focusedId);
    if (!cur) return;
    const rtl = this.app.config.rtl;
    let dr = 0;
    let dc = 0;
    switch (e.key) {
      case 'ArrowRight': dc = rtl ? -1 : 1; break;
      case 'ArrowLeft': dc = rtl ? 1 : -1; break;
      case 'ArrowUp': dr = -1; break;
      case 'ArrowDown': dr = 1; break;
      case 'Home': return this.go(grid.list[0], e);
      case 'End': return this.go(grid.list[grid.list.length - 1], e);
      default: return undefined;
    }
    const target = grid.list.find((t) => t.row === cur.row + dr && t.col === cur.col + dc);
    return this.go(target, e);
  }

  go(tile, e) {
    e.preventDefault();
    if (!tile) return;
    this.pending = tile.id;
    this.app.scene.ensureInView(tile);
    this.layoutDirty = true;
  }

  announceFocus(tile) {
    this.app.sr.announce(tpl(this.app.config.strings.focused, { title: tile.product.title }));
  }

  /** بازگرداندن فوکوس به دکمه‌ی کاشی (پس از بستن کارت) */
  restoreFocus(id) {
    if (id === null || id === undefined) return;
    this.pending = id;
    this.focusedId = id;
    this.layoutDirty = true;
  }

  destroy() {
    this.layer.remove();
    this.skip.remove();
  }
}
