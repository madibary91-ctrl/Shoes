// گالری تصاویر حالت فوکوس: فلش‌ها، تامبنیل، سوایپ، زوم (دابل‌کلیک/پینچ) و اسپینر ۳۶۰ برای گالری‌های بزرگ
import { h, icon } from '../utils/dom.js';
import { clamp } from '../utils/damp.js';
import { formatNumber } from '../utils/format.js';

export class Gallery {
  /**
   * @param {import('../core/App.js').App} app
   * @param {string[]} images
   * @param {(index:number, url:string)=>void} onChange
   */
  constructor(app, images, onChange) {
    this.app = app;
    this.images = images.length ? images : [''];
    this.onChange = onChange;
    this.index = 0;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.is360 = this.images.length > 8;
    this.pointers = new Map();
    const s = app.config.strings;
    const rtl = app.config.rtl;

    this.img = h('img', { class: 'sf3d-gallery__img', alt: '', draggable: 'false', decoding: 'async' });
    this.counter = h('span', { class: 'sf3d-gallery__count', 'aria-hidden': 'true' });
    this.prev = h('button', { type: 'button', class: 'sf3d-gallery__nav sf3d-gallery__nav--prev', 'aria-label': s.prev }, icon(rtl ? 'chevR' : 'chevL', 20));
    this.next = h('button', { type: 'button', class: 'sf3d-gallery__nav sf3d-gallery__nav--next', 'aria-label': s.next }, icon(rtl ? 'chevL' : 'chevR', 20));
    this.stage = h('div', { class: 'sf3d-gallery__stage', tabindex: '0', role: 'group', 'aria-roledescription': 'carousel', 'aria-label': s.gallery || 'Gallery' }, this.img, this.counter);
    this.thumbsEl = h('div', { class: 'sf3d-gallery__thumbs' });
    this.el = h('div', { class: `sf3d-gallery${this.is360 ? ' is-360' : ''}` },
      h('div', { class: 'sf3d-gallery__row' }, this.prev, this.stage, this.next),
      this.is360 ? h('div', { class: 'sf3d-gallery__hint' }, s.spin360) : this.thumbsEl);

    if (this.images.length < 2) this.el.classList.add('is-single');
    if (!this.is360) this.buildThumbs();

    this.prev.addEventListener('click', () => this.go(this.index - 1));
    this.next.addEventListener('click', () => this.go(this.index + 1));
    this.stage.addEventListener('keydown', (e) => {
      const dir = rtl ? -1 : 1;
      if (e.key === 'ArrowRight') { this.go(this.index + dir); e.preventDefault(); e.stopPropagation(); }
      if (e.key === 'ArrowLeft') { this.go(this.index - dir); e.preventDefault(); e.stopPropagation(); }
    });
    this.stage.addEventListener('dblclick', (e) => this.toggleZoom(e));
    this.stage.addEventListener('pointerdown', (e) => this.down(e));
    this.stage.addEventListener('pointermove', (e) => this.move(e));
    this.stage.addEventListener('pointerup', (e) => this.up(e));
    this.stage.addEventListener('pointercancel', (e) => this.up(e));
    this.show(0, false);
  }

  buildThumbs() {
    this.thumbs = this.images.map((url, i) => {
      const b = h('button', { type: 'button', class: 'sf3d-thumb', 'aria-label': `${i + 1} / ${this.images.length}` }, h('img', { src: url, alt: '', loading: 'lazy', draggable: 'false' }));
      b.addEventListener('click', () => this.go(i));
      this.thumbsEl.appendChild(b);
      return b;
    });
  }

  go(i) {
    const n = this.images.length;
    this.show(((i % n) + n) % n, true);
  }

  show(i, notify) {
    this.index = i;
    this.img.src = this.images[i];
    this.counter.textContent = `${formatNumber(i + 1, this.app.config.locale)} / ${formatNumber(this.images.length, this.app.config.locale)}`;
    this.resetZoom();
    if (this.thumbs) {
      this.thumbs.forEach((b, k) => {
        b.classList.toggle('is-active', k === i);
        b.setAttribute('aria-current', k === i ? 'true' : 'false');
      });
    }
    if (notify) this.onChange(i, this.images[i]);
  }

  setImages(list) {
    if (!list.length) return;
    this.images = list;
    this.show(0, false);
  }

  // --- زوم ---
  applyZoom() {
    this.img.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    this.stage.classList.toggle('is-zoomed', this.zoom > 1);
  }

  resetZoom() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.applyZoom();
  }

  toggleZoom(e) {
    if (this.zoom > 1) return this.resetZoom();
    const r = this.stage.getBoundingClientRect();
    this.zoom = 2.4;
    this.pan = { x: -(e.clientX - r.left - r.width / 2) * 1.4, y: -(e.clientY - r.top - r.height / 2) * 1.4 };
    this.clampPan();
    this.applyZoom();
    return undefined;
  }

  clampPan() {
    const r = this.stage.getBoundingClientRect();
    const mx = (r.width * (this.zoom - 1)) / 2;
    const my = (r.height * (this.zoom - 1)) / 2;
    this.pan.x = clamp(this.pan.x, -mx, mx);
    this.pan.y = clamp(this.pan.y, -my, my);
  }

  // --- ورودی اشاره‌گر: سوایپ، اسپین ۳۶۰، پن، پینچ ---
  down(e) {
    this.stage.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.startX = e.clientX;
    this.acc = 0;
    this.swiped = false;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      this.pinchZoom = this.zoom;
    }
  }

  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoom = clamp(this.pinchZoom * (d / this.pinch), 1, 4);
      this.clampPan();
      this.applyZoom();
      return;
    }
    if (this.zoom > 1) {
      this.pan.x += dx;
      this.pan.y += dy;
      this.clampPan();
      this.applyZoom();
      return;
    }
    if (this.is360) {
      this.acc += dx;
      const step = 22;
      while (Math.abs(this.acc) >= step) {
        this.go(this.index + (this.acc > 0 ? -1 : 1));
        this.acc -= Math.sign(this.acc) * step;
      }
    }
  }

  up(e) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0 && !this.is360 && this.zoom === 1) {
      const dx = e.clientX - this.startX;
      if (Math.abs(dx) > 40 && !this.swiped) {
        this.swiped = true;
        const dir = this.app.config.rtl ? -1 : 1;
        this.go(this.index + (dx < 0 ? dir : -dir));
      }
    }
  }
}
