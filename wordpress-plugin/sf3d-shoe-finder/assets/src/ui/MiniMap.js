// مینی‌مپ: نقطه‌ی هر کاشی و مستطیل نمای فعلی؛ کلیک/درگ برای ناوبری
import { h } from '../utils/dom.js';

export class MiniMap {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    this.w = app.config.grid.mapWidth;
    this.canvas = h('canvas', { class: 'sf3d-minimap__canvas', 'aria-hidden': 'true' });
    this.el = h('div', { class: 'sf3d-minimap', 'aria-hidden': 'true' }, this.canvas);
    app.stage.appendChild(this.el);
    this.sig = '';
    this.dragging = false;
    this.off = app.events.on('frame', () => this.draw());
    this.canvas.addEventListener('pointerdown', (e) => { this.dragging = true; this.canvas.setPointerCapture(e.pointerId); this.nav(e); });
    this.canvas.addEventListener('pointermove', (e) => this.dragging && this.nav(e));
    this.canvas.addEventListener('pointerup', () => { this.dragging = false; });
    app.events.on('grid:layout', () => { this.sig = ''; });
  }

  frame() {
    const { scene } = this.app;
    const b = scene.camera.bounds;
    const pad = scene.grid.cfg.itemSize;
    return { minX: b.minX - pad, maxX: b.maxX + pad, minY: b.minY - pad, maxY: b.maxY + pad };
  }

  nav(e) {
    const f = this.frame();
    const r = this.canvas.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    const v = (e.clientY - r.top) / r.height;
    const x = f.minX + u * (f.maxX - f.minX);
    const y = f.maxY - v * (f.maxY - f.minY);
    this.app.scene.panTo(x, y);
  }

  draw() {
    const { scene } = this.app;
    const cam = scene.camera;
    const sig = `${cam.x.toFixed(1)}|${cam.y.toFixed(1)}|${cam.zoom.toFixed(1)}|${cam.width}|${scene.grid.list.length}|${scene.dark}`;
    if (sig === this.sig) return;
    this.sig = sig;
    const f = this.frame();
    const fw = f.maxX - f.minX || 1;
    const fh = f.maxY - f.minY || 1;
    const W = this.w;
    const H = Math.max(40, Math.min(160, Math.round((W * fh) / fw)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas.width !== W * dpr || this.canvas.height !== H * dpr) {
      this.canvas.width = W * dpr;
      this.canvas.height = H * dpr;
      this.canvas.style.width = W + 'px';
      this.canvas.style.height = H + 'px';
    }
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const dot = this.app.config.grid.mapDotSize || 2;
    const dark = scene.dark;
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
    scene.grid.list.forEach((t) => {
      const x = ((t.base.x - f.minX) / fw) * W;
      const y = ((f.maxY - t.base.y) / fh) * H;
      ctx.fillRect(x - dot, y - dot, dot * 2, dot * 2);
    });
    // مستطیل نمای فعلی
    const vh = 2 * cam.zoom * cam.tanHalf;
    const vw = vh * cam.aspect;
    const rx = ((cam.x - vw / 2 - f.minX) / fw) * W;
    const ry = ((f.maxY - (cam.y + vh / 2)) / fh) * H;
    ctx.strokeStyle = dark ? '#fafafa' : '#111';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(Math.max(0.75, rx), Math.max(0.75, ry), Math.min(W - 1.5, (vw / fw) * W), Math.min(H - 1.5, (vh / fh) * H));
  }

  destroy() {
    this.off();
    this.el.remove();
  }
}
