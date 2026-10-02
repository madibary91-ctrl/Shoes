// نقاش برچسب‌ها و نشان‌ها روی canvas دوبعدی؛ خروجی به‌صورت بافت روی کاشی‌ها رسم می‌شود.
// مزیت: بدون DOM اضافه (سبک) و هماهنگ با انیمیشن‌های سه‌بعدی.
import { formatPercent, formatPrice, formatNumber, tpl } from '../utils/format.js';

/**
 * E11: توکن‌های رنگ canvas.
 * اولویت: config.colors ← متغیر CSS (--sf3d-*) روی .sf3d-root ← مقدار پیش‌فرض زیر.
 * مقدارهای پیش‌فرض باید با sf3d.css یکی باشند.
 */
export const DEFAULT_COLORS = {
  sale: '#e11d48', // حراج / شمارنده
  new: '#16a34a', // جدید
  dot: '#38bdf8', // نقطه‌ی فعال
  oos: '#6b7280', // ناموجود
  gridDark: '#52525b', // خطوط پس‌زمینه در تم تاریک
  selected: '#2563eb', // انتخاب گروهی
};

export const COLOR_VARS = {
  sale: '--sf3d-sale',
  new: '--sf3d-new',
  dot: '--sf3d-dot',
  oos: '--sf3d-oos',
  gridDark: '--sf3d-grid-dark',
  selected: '--sf3d-selected',
};

/**
 * @param {Element|null} el عنصری که متغیرهای CSS روی آن (یا والدش) تعریف شده.
 * @param {Object} [overrides] مقادیر صریح config.colors (اولویت بالاتر).
 * @returns {Object} رنگ‌های نهایی (همیشه رشته‌ی معتبر).
 */
export function resolveColors(el, overrides) {
  let cs = null;
  try {
    cs = el && typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  } catch (e) {
    cs = null;
  }
  const out = {};
  Object.keys(DEFAULT_COLORS).forEach((k) => {
    let v = overrides && typeof overrides[k] === 'string' ? overrides[k].trim() : '';
    if (!v && cs) v = String(cs.getPropertyValue(COLOR_VARS[k]) || '').trim();
    out[k] = v || DEFAULT_COLORS[k];
  });
  return out;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.8, cy - s * 0.2, cx - s * 0.9, cy - s * 1.3, cx, cy - s * 0.45);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.3, cx + s * 1.8, cy - s * 0.2, cx, cy + s * 0.9);
  ctx.closePath();
}

export const BADGE_PX = 384;
export const HEART = { cx: 0.885, cy: 0.115, r: 0.075 }; // نسبی (سمت راست برای LTR)

export class LabelPainter {
  constructor(cfg) {
    this.cfg = cfg;
    this.fontFamily = 'system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif';
  }

  setFont(f) {
    if (f) this.fontFamily = f;
  }

  /** E11: رنگ‌ها را از cfg.colors (که Scene پر می‌کند) می‌خواند؛ بدون آن، یک‌بار از DOM/پیش‌فرض. */
  _colors() {
    const c = this.cfg && this.cfg.colors;
    if (c && typeof c === 'object') return { ...DEFAULT_COLORS, ...c };
    if (!this._fallbackColors) {
      const root = typeof document !== 'undefined' ? document.querySelector('.sf3d-root') : null;
      this._fallbackColors = resolveColors(root, null);
    }
    return this._fallbackColors;
  }

  /** برچسب عنوان + قیمت زیر کاشی */
  label(product, theme) {
    const { cfg } = this;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 150;
    const ctx = c.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = cfg.rtl ? 'rtl' : 'ltr';
    ctx.fillStyle = theme.text;
    ctx.font = `600 34px ${this.fontFamily}`;
    let title = product.title || '';
    while (ctx.measureText(title).width > 480 && title.length > 4) title = title.slice(0, -2);
    if (title !== product.title) title = title.trim() + '…';
    ctx.fillText(title, 256, 42);

    const priceStr = this.priceText(product);
    ctx.font = `700 30px ${this.fontFamily}`;
    ctx.fillStyle = theme.price;
    if (product.on_sale && product.regular_price) {
      const reg = formatPrice(product.regular_price, cfg.currency, cfg.locale);
      ctx.font = `400 24px ${this.fontFamily}`;
      const wReg = ctx.measureText(reg).width;
      ctx.font = `700 30px ${this.fontFamily}`;
      const wSale = ctx.measureText(priceStr).width;
      const total = wReg + wSale + 16;
      const start = 256 - total / 2;
      ctx.textAlign = 'left';
      ctx.fillText(priceStr, start + (cfg.rtl ? wReg + 16 : 0), 100);
      ctx.font = `400 24px ${this.fontFamily}`;
      ctx.fillStyle = theme.muted;
      const rx = start + (cfg.rtl ? 0 : wSale + 16);
      ctx.fillText(reg, rx, 100);
      ctx.fillRect(rx, 100, wReg, 2);
    } else {
      ctx.fillText(priceStr, 256, 100);
    }
    return c;
  }

  priceText(product) {
    const { cfg } = this;
    if (product.type === 'variable' && product.price_min !== undefined && product.price_max !== undefined && product.price_min !== product.price_max) {
      return `${formatPrice(product.price_min, cfg.currency, cfg.locale)} – ${formatPrice(product.price_max, cfg.currency, cfg.locale)}`;
    }
    return formatPrice(product.price || 0, cfg.currency, cfg.locale);
  }

  /** نشان‌ها (حراج/جدید/ناموجود) + قلب علاقه‌مندی + تیک انتخاب */
  badge(product, { wished, selected, badges = true, wishlist = true }, theme) {
    const { cfg } = this;
    const col = this._colors(); // E11
    const S = BADGE_PX;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d');
    const rtl = cfg.rtl;
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const s = cfg.strings;

    if (badges) {
      const pills = [];
      if (!product.in_stock) pills.push({ t: s.outOfStock, bg: col.oos, fg: '#fff' });
      if (product.on_sale && product.discount > 0) pills.push({ t: `−${formatPercent(product.discount, cfg.locale)}`, bg: col.sale, fg: '#fff' });
      if (product.is_new) pills.push({ t: s.new, bg: col.new, fg: '#fff' });
      let y = 14;
      ctx.font = `700 24px ${this.fontFamily}`;
      pills.forEach((p) => {
        const w = Math.ceil(ctx.measureText(p.t).width) + 28;
        const x = rtl ? S - 14 - w : 14;
        ctx.fillStyle = p.bg;
        roundRect(ctx, x, y, w, 38, 19);
        ctx.fill();
        ctx.fillStyle = p.fg;
        ctx.fillText(p.t, x + w / 2, y + 20);
        y += 46;
      });
    }

    if (wishlist) {
      const cx = (rtl ? 1 - HEART.cx : HEART.cx) * S;
      const cy = HEART.cy * S;
      ctx.fillStyle = theme.heartBg;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fill();
      heartPath(ctx, cx, cy + 1, 11);
      if (wished) {
        ctx.fillStyle = col.sale;
        ctx.fill();
      } else {
        ctx.strokeStyle = theme.heartStroke;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    if (selected) {
      const cx = S - 44;
      const cy = S - 44;
      ctx.fillStyle = col.selected;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy);
      ctx.lineTo(cx - 3, cy + 10);
      ctx.lineTo(cx + 13, cy - 10);
      ctx.stroke();
      ctx.strokeStyle = col.selected;
      ctx.lineWidth = 6;
      roundRect(ctx, 4, 4, S - 8, S - 8, 28);
      ctx.stroke();
    }
    return c;
  }

  /** آیا این محصول اصلاً به بافت نشان نیاز دارد؟ */
  static needsBadge(product, flags) {
    return !!(flags.wishlist || flags.selected || (flags.badges && (!product.in_stock || product.on_sale || product.is_new)));
  }
}

export { formatNumber, tpl };
