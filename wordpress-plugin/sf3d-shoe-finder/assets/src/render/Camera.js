// دوربین پرسپکتیو + کنترل درگ/زوم (معادل Rig.jsx)
import { damp, clamp } from '../utils/damp.js';

export class Camera {
  constructor(cfg) {
    this.cfg = cfg;
    this.x = 0;
    this.y = 0;
    this.zoom = cfg.zoomOut;
    this.tx = 0;
    this.ty = 0;
    this.tz = cfg.zoomOut;
    this.width = 1;
    this.height = 1;
    this.bounds = { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    this.vx = 0;
    this.vy = 0;
    this.dragging = false;
    this.tanHalf = Math.tan((cfg.fov * Math.PI) / 360);
  }

  resize(w, h) {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
  }

  get aspect() {
    return this.width / this.height;
  }

  focal() {
    return [1 / (this.tanHalf * this.aspect), 1 / this.tanHalf];
  }

  /** واحد دنیا به ازای هر پیکسل در عمق مشخص (فاصله از دوربین) */
  unitsPerPixel(depth = this.zoom) {
    return (2 * depth * this.tanHalf) / this.height;
  }

  setBounds(b) {
    this.bounds = b;
  }

  setTarget(x, y, zoom) {
    this.tx = x;
    this.ty = y;
    if (zoom !== undefined) this.tz = zoom;
    this.vx = this.vy = 0;
  }

  /** درگ با مقاومت خارج از محدوده */
  panByPixels(dx, dy) {
    const upp = this.unitsPerPixel(this.tz) * (this.cfg.dragSpeed / 2.2);
    const b = this.bounds;
    const r = this.cfg.dragResistance;
    let nx = this.tx - dx * upp;
    let ny = this.ty + dy * upp;
    if (nx < b.minX || nx > b.maxX) nx = this.tx - dx * upp * r;
    if (ny < b.minY || ny > b.maxY) ny = this.ty + dy * upp * r;
    this.vx = (nx - this.tx) * 0.6 + this.vx * 0.4;
    this.vy = (ny - this.ty) * 0.6 + this.vy * 0.4;
    this.tx = nx;
    this.ty = ny;
  }

  /** پایان درگ: اینرسی کوچک + برگرداندن به محدوده */
  release() {
    const b = this.bounds;
    this.tx = clamp(this.tx + this.vx * 6, b.minX, b.maxX);
    this.ty = clamp(this.ty + this.vy * 6, b.minY, b.maxY);
    this.vx = this.vy = 0;
  }

  zoomBy(factor, min, max) {
    this.tz = clamp(this.tz * factor, min, max);
  }

  /** @returns {boolean} آیا هنوز در حال حرکت است */
  update(dt) {
    const c = this.cfg;
    const px = this.x;
    const py = this.y;
    const pz = this.zoom;
    this.x = damp(this.x, this.tx, c.dampFactor, dt);
    this.y = damp(this.y, this.ty, c.dampFactor, dt);
    this.zoom = damp(this.zoom, this.tz, c.zoomDamp, dt);
    return px !== this.x || py !== this.y || pz !== this.zoom;
  }

  /** تصویر یک نقطه‌ی دنیا روی صفحه (پیکسل نسبت به canvas) + مقیاس px/unit */
  project(wx, wy, wz = 0) {
    const d = this.zoom - wz;
    const s = this.height / (2 * d * this.tanHalf);
    return { x: this.width / 2 + (wx - this.x) * s, y: this.height / 2 - (wy - this.y) * s, scale: s, depth: d };
  }

  /** برعکس project در عمق wz */
  unproject(px, py, wz = 0) {
    const d = this.zoom - wz;
    const upp = (2 * d * this.tanHalf) / this.height;
    return { x: this.x + (px - this.width / 2) * upp, y: this.y - (py - this.height / 2) * upp };
  }
}
