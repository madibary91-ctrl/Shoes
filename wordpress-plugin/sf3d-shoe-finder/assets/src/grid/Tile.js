// کاشی تکی (معادل ShoeTile.jsx): انیمیشن‌های ورود/خروج، فوکوس، هاور، فیلتر
import { damp } from '../utils/damp.js';
import { hexToRgb } from '../utils/color.js';
import { HEART, LabelPainter } from './Badges.js';

export class Tile {
  /**
   * @param {Object} product
   * @param {number} index
   * @param {{cfg:Object, app:Object, textures:Object, painter:LabelPainter}} env
   */
  constructor(product, index, env) {
    this.product = product;
    this.id = product.id;
    this.index = index;
    this.env = env;
    this.base = { x: 0, y: 0 };
    this.pos = { x: 0, y: 0 };
    this.row = 0;
    this.col = 0;
    this.normY = 0;
    this.gridVisible = false;
    this.matches = true;
    this.phase = 'hidden';
    this.startAt = 0;
    this.opacity = 0;
    this.scale = 1;
    this.focusZ = 0;
    this.curveZ = 0;
    this.transZ = 0;
    this.transY = 0;
    this.filterOpacity = 1;
    this.filterScale = 1;
    this.activeAmt = 0;
    this.labelAlpha = 0;
    this.wasDimmed = false;
    this.culled = false;
    this.entry = null;
    this.imageUrl = product.image;
    this.tint = hexToRgb(product.primary_color_hex) || [0.62, 0.62, 0.66];
    this.labelEntry = null;
    this.labelVersion = -1;
    this.badgeEntry = null;
    this.badgeKey = '';
    this.wished = false;
    this.selected = false;
  }

  get image() {
    if (!this.entry) this.entry = this.env.textures.get(this.imageUrl);
    return this.entry;
  }

  /** تغییر تصویر کاشی (همگام با گالری) */
  setImage(url) {
    this.imageUrl = url || this.product.image;
    this.entry = this.env.textures.get(this.imageUrl);
  }

  /** نمایش با ورود (stagger) */
  show(delaySec, now) {
    if (this.phase === 'hidden') {
      this.transZ = this.env.cfg.enterStartZ;
      this.transY = this.normY * this.env.cfg.enterSpreadY;
      this.opacity = this.env.cfg.enterStartOpacity;
      this.pos.x = this.base.x;
      this.pos.y = this.base.y;
      this.filterOpacity = this.matches ? 1 : 0;
    }
    this.gridVisible = true;
    this.phase = 'entering';
    this.startAt = now + delaySec;
  }

  hide(delaySec, now) {
    if (this.phase === 'hidden') return;
    this.gridVisible = false;
    this.phase = 'exiting';
    this.startAt = now + delaySec;
  }

  get pickable() {
    return this.gridVisible && this.matches && this.opacity > 0.25 && !this.culled;
  }

  /** وضعیت برای جلوگیری از محاسبه‌ی بیهوده */
  get sleeping() {
    return this.phase === 'hidden';
  }

  update(dt, now, ctx) {
    if (this.phase === 'hidden') return false;
    const cfg = this.env.cfg;
    const cam = ctx.cam;

    // فیلتر: موقعیت و شفافیت
    this.pos.x = damp(this.pos.x, this.base.x, 0.2, dt);
    this.pos.y = damp(this.pos.y, this.base.y, 0.2, dt);
    this.filterOpacity = damp(this.filterOpacity, this.matches ? 1 : 0, cfg.filterOpacityDamp, dt);
    this.filterScale = damp(this.filterScale, this.matches ? 1 : cfg.filterScaleTarget, cfg.filterOpacityDamp, dt);

    const go = now >= this.startAt;
    let tOp;
    let tZ;
    let tY;
    if (this.gridVisible) {
      tOp = go ? 1 : cfg.enterStartOpacity;
      tZ = go ? 0 : cfg.enterStartZ;
      tY = go ? 0 : this.normY * cfg.enterSpreadY;
    } else if (go) {
      tOp = 0;
      tZ = cfg.exitEndZ;
      tY = this.normY * cfg.exitSpreadY;
    } else {
      tOp = 1;
      tZ = 0;
      tY = 0;
    }

    const dx = this.pos.x - cam.x;
    const dy = this.pos.y - cam.y;
    const cull = cfg.cullDistance * (cam.zoom / 8) * ctx.cullScale;
    this.culled = Math.abs(dx) > cull || Math.abs(dy) > cull;
    if (this.culled && !this.gridVisible) {
      this.opacity = 0;
      this.phase = 'hidden';
      return false;
    }

    // خمیدگی سه‌بعدی نسبت به مرکز دید
    const tCurve = -(dx * dx + dy * dy) * cfg.curvatureStrength * 0.1;

    // وضعیت تعامل
    const focusMode = ctx.activeId !== null;
    const isActive = ctx.activeId === this.id;
    const hovered = ctx.hoverId === this.id && !ctx.dragging;
    let iScale = 1;
    let iOpacity = 1;
    let tFocusZ = 0;
    if (focusMode) {
      if (isActive) {
        iScale = cfg.focusScale;
        tFocusZ = 2;
      } else {
        iScale = cfg.dimScale;
        iOpacity = cfg.dimOpacity;
        tFocusZ = -0.5;
        this.wasDimmed = true;
      }
    } else if (hovered) {
      iScale = 1.05;
      tFocusZ = 0.5;
    }

    const finalOpacity = iOpacity * this.filterOpacity;
    this.scale = damp(this.scale, iScale * this.filterScale, 0.15, dt);
    this.focusZ = damp(this.focusZ, tFocusZ, 0.2, dt);
    this.curveZ = damp(this.curveZ, tCurve, 0.2, dt);
    this.transZ = damp(this.transZ, tZ, cfg.transitionZDamp, dt);
    this.transY = damp(this.transY, tY, cfg.transitionYDamp, dt);
    this.activeAmt = damp(this.activeAmt, isActive ? 1 : 0, isActive ? 0.6 : 0.15, dt);

    // شفافیت نهایی: ضرب ورود/خروج × تعامل × فیلتر
    const target = finalOpacity * tOp;
    let od;
    if (!this.matches || this.filterOpacity < 0.99) od = cfg.filterOpacityDamp;
    else if (focusMode || this.wasDimmed) od = 0.15;
    else if (this.gridVisible) od = cfg.enterOpacityDamp;
    else od = cfg.exitOpacityDamp;
    this.opacity = damp(this.opacity, target, od, dt);
    if (!focusMode && this.opacity > 0.95) this.wasDimmed = false;

    // برچسب: در فوکوس فقط برای کاشی فعال، در حالت عادی وقتی به اندازه کافی نزدیک هستیم
    let tLabel = 0;
    if (this.gridVisible && this.matches) tLabel = focusMode ? (isActive ? 1 : 0) : cam.zoom < cfg.labelZoomMax ? 1 : 0;
    this.labelAlpha = damp(this.labelAlpha, tLabel, 0.2, dt);

    if (!this.gridVisible && go && this.opacity < 0.004) {
      this.opacity = 0;
      this.phase = 'hidden';
    } else if (this.gridVisible && go && this.phase === 'entering' && this.opacity > 0.98) {
      this.phase = 'visible';
    }
    return true;
  }

  /** ابعاد تصویر داخل جعبه‌ی کاشی با حفظ نسبت */
  dims() {
    const max = this.env.cfg.itemSize * 0.9;
    const e = this.entry;
    const a = e && e.ready ? e.aspect : 1;
    return a > 1 ? { w: max, h: max / a } : { w: max * a, h: max };
  }

  ensureTextures(version, theme, flags) {
    const painter = this.env.painter;
    if (this.labelVersion !== version) {
      this.labelEntry = this.env.textures.fromCanvas('label:' + this.id, painter.label(this.product, theme));
      this.badgeKey = '';
      this.labelVersion = version;
    }
    const key = `${this.wished ? 1 : 0}${this.selected ? 1 : 0}${this.product.in_stock ? 1 : 0}`;
    if (key !== this.badgeKey) {
      this.badgeKey = key;
      const f = { wished: this.wished, selected: this.selected, badges: flags.badges, wishlist: flags.wishlist };
      this.badgeEntry = LabelPainter.needsBadge(this.product, { ...f }) ? this.env.textures.fromCanvas('badge:' + this.id, painter.badge(this.product, f, theme)) : null;
    }
  }

  draw(r, version, theme, flags) {
    if (this.opacity < 0.004 || this.culled || this.phase === 'hidden') return;
    this.ensureTextures(version, theme, flags);
    const cfg = this.env.cfg;
    const s = this.scale;
    const z = this.curveZ + this.focusZ + this.transZ;
    const cx = this.pos.x;
    const cy = this.pos.y + this.transY;
    const d = this.dims();
    r.drawQuad({ entry: this.image, cx, cy, z, w: d.w * s, h: d.h * s, opacity: this.opacity, active: this.activeAmt, tint: this.tint });
    if (this.badgeEntry) {
      r.drawQuad({ entry: this.badgeEntry, cx, cy, z, w: cfg.itemSize * s, h: cfg.itemSize * s, opacity: this.opacity });
    }
    const la = this.labelAlpha * this.opacity;
    if (la > 0.01 && this.labelEntry) {
      const lw = cfg.itemSize * 1.15 * s;
      r.drawQuad({ entry: this.labelEntry, cx, cy: cy - (cfg.itemSize / 2 + 0.3) * s, z, w: lw, h: (lw * 150) / 512, opacity: la });
    }
  }

  /**
   * تست برخورد با نقطه‌ی صفحه
   * @returns {{part:'body'|'heart'}|null}
   */
  hit(px, py, cam) {
    const z = this.curveZ + this.focusZ + this.transZ;
    const p = cam.unproject(px, py, z);
    const size = this.env.cfg.itemSize * this.scale;
    const dx = p.x - this.pos.x;
    const dy = p.y - (this.pos.y + this.transY);
    const half = size / 2;
    if (Math.abs(dx) > half || Math.abs(dy) > half) return null;
    const u = dx / size;
    const v = dy / size;
    const rtl = this.env.app.rtl;
    const hu = (rtl ? -1 : 1) * (HEART.cx - 0.5);
    const hv = 0.5 - HEART.cy;
    if (Math.hypot(u - hu, v - hv) <= HEART.r * 1.5) return { part: 'heart' };
    return { part: 'body' };
  }

  /** مستطیل صفحه‌ای کاشی (برای دسترس‌پذیری و Quick Actions) */
  screenRect(cam) {
    const z = this.curveZ + this.focusZ + this.transZ;
    const c = cam.project(this.pos.x, this.pos.y + this.transY, z);
    const size = this.env.cfg.itemSize * this.scale * c.scale;
    return { x: c.x, y: c.y, size, left: c.x - size / 2, top: c.y - size / 2 };
  }
}
