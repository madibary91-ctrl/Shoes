// کارت فوکوس: گالری، قیمت، فوریت موجودی، انتخاب Variation، افزودن به سبد، علاقه‌مندی، اشتراک، محصولات مشابه
import { h, icon } from '../utils/dom.js';
import { formatPrice, formatNumber, formatPercent, tpl } from '../utils/format.js';
import { inertOthers } from '../utils/inert.js';
import { Gallery } from './Gallery.js';
import { heartButton } from './Wishlist.js';
import { RelatedProducts } from './RelatedProducts.js';
import { VariationForm } from '../cart/VariationForm.js';

export class Card {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    this.current = null;
    this.release = null;
    this.releaseInert = null;
    this.parts = [];
    this.gallery = null;
    this.form = null;
    this.titleId = `${app.uid}-card-title`;
    this.el = h('aside', { class: `sf3d-card sf3d-card--${app.config.cardPosition}`, 'aria-hidden': 'true', inert: true });
    app.stage.appendChild(this.el);
    this.unsub = app.store.subscribe('activeProduct', (id) => this.render(id));
  }

  clearParts() {
    this.parts.forEach((p) => p.destroy && p.destroy());
    this.parts = [];
    this.gallery = null;
    this.form = null;
    // ترتیب مهم است: اول inert برداشته شود، بعد فوکوس به عنصر قبلی برگردد
    // (فوکوس روی عنصر inert بی‌صدا شکست می‌خورد)
    if (this.releaseInert) {
      this.releaseInert();
      this.releaseInert = null;
    }
    if (this.release) {
      this.release();
      this.release = null;
    }
  }

  /** حالت بسته: هیچ نشانه‌ی modal باقی نمی‌ماند و کارت از درخت دسترس‌پذیری خارج می‌شود */
  close() {
    const el = this.el;
    this.current = null;
    el.classList.remove('is-open');
    el.removeAttribute('aria-modal');
    el.removeAttribute('aria-labelledby');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
  }

  render(id) {
    const app = this.app;
    const prev = this.current;
    this.clearParts();
    if (prev) {
      const t = app.scene.grid.getTile(prev.id);
      t && t.setImage(prev.image);
    }
    if (id === null) {
      this.close();
      return;
    }
    const p = app.getProduct(id);
    if (!p) {
      // محصول پیدا نشد: کارت نیمه‌باز با محتوای قدیمی نماند
      this.close();
      return;
    }
    this.current = p;
    const c = app.config;
    const s = c.strings;
    this.el.textContent = '';
    this.el.removeAttribute('inert');
    this.el.removeAttribute('aria-hidden');
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-labelledby', this.titleId);
    this.el.removeAttribute('aria-label');

    const closeBtn = h('button', { type: 'button', class: 'sf3d-card__close', 'aria-label': s.close }, icon('close', 20));
    closeBtn.addEventListener('click', () => app.closeProduct());

    // نشان‌ها
    const badges = h('div', { class: 'sf3d-card__badges' });
    if (!p.in_stock) badges.appendChild(h('span', { class: 'sf3d-pill sf3d-pill--muted' }, s.outOfStock));
    if (p.on_sale && p.discount) badges.appendChild(h('span', { class: 'sf3d-pill sf3d-pill--sale' }, `${s.sale} ${formatPercent(p.discount, c.locale)}`));
    if (p.is_new) badges.appendChild(h('span', { class: 'sf3d-pill sf3d-pill--new' }, s.new));

    const title = h('h2', { class: 'sf3d-card__title', id: this.titleId }, p.title);
    this.priceEl = h('div', { class: 'sf3d-card__price' });
    this.stockEl = h('div', { class: 'sf3d-stock', role: 'status' });
    this.addBtn = h('button', { type: 'button', class: 'sf3d-btn sf3d-btn--primary sf3d-card__add' });
    this.addLabel = h('span', null);
    this.addBtn.append(icon('cart', 20), this.addLabel);

    const actions = h('div', { class: 'sf3d-card__actions' }, this.addBtn);
    if (c.features.wishlist) {
      const hb = heartButton(app, p.id, 'sf3d-heart--card');
      this.parts.push(hb);
      actions.appendChild(hb.el);
    }
    const shareBtn = h('button', { type: 'button', class: 'sf3d-iconbtn', 'aria-label': s.share, title: s.share }, icon('share', 20));
    shareBtn.addEventListener('click', () => app.share(p));
    actions.appendChild(shareBtn);

    this.state = { ready: p.type !== 'variable' && p.in_stock, variation: null, attributes: {}, complete: p.type !== 'variable' };

    // گالری
    let galleryEl = null;
    if (c.features.gallery) {
      const imgs = Array.from(new Set([p.image, ...(p.gallery || [])].filter(Boolean)));
      const gallery = new Gallery(app, imgs, (i, url) => {
        const t = app.scene.grid.getTile(p.id);
        t && t.setImage(url);
      });
      this.gallery = gallery;
      this.parts.push(gallery);
      galleryEl = gallery.el;
    }

    // Variation
    let formEl = null;
    if (p.type === 'variable' && (p.variation_attributes || []).length) {
      this.form = new VariationForm(p, s, (st) => {
        this.state = st;
        if (st.variation && st.variation.image && this.gallery) this.gallery.setImages(Array.from(new Set([st.variation.image, ...(p.gallery || [])])));
        this.refresh();
      });
      formEl = this.form.el;
    } else {
      this.form = null;
    }

    const body = h('div', { class: 'sf3d-card__body' },
      badges, title, this.priceEl, this.stockEl,
      p.excerpt ? h('p', { class: 'sf3d-card__excerpt' }, p.excerpt) : null,
      formEl, actions,
      h('a', { class: 'sf3d-card__link', href: p.url }, s.viewProduct));

    this.el.append(closeBtn, galleryEl, body);
    if (c.features.related) {
      const rel = new RelatedProducts(app, p);
      this.parts.push(rel);
      this.el.appendChild(rel.el);
    }

    this.addBtn.onclick = () => this.add();
    this.refresh();
    this.el.classList.add('is-open');

    // ۱) اول trap: عنصر فوکوس‌شده‌ی فعلی را برای بازگردانی ذخیره می‌کند
    this.release = app.focusManager.trap(this.el, { onEscape: () => app.closeProduct(), initial: closeBtn });

    // ۲) بعد inert: اگر عنصر فوکوس‌شده داخل بخش inert باشد مرورگر فوکوس را رها می‌کند
    // aria-modal فقط وقتی گذاشته می‌شود که بقیه‌ی صحنه واقعاً غیرفعال شده باشد
    // (کانواس برای درگ/کلیک روی کفش‌ها و live regionها عمداً فعال می‌مانند)
    // برای پنل غیرمودال: config.cardModal = false
    if (c.cardModal !== false) {
      this.el.setAttribute('aria-modal', 'true');
      this.releaseInert = inertOthers(app.stage, this.el);
    } else {
      this.el.removeAttribute('aria-modal');
    }
  }

  /** بروزرسانی قیمت، موجودی و دکمه بر اساس وضعیت فعلی */
  refresh() {
    const p = this.current;
    if (!p) return;
    const c = this.app.config;
    const s = c.strings;
    const v = this.state.variation;
    const fmt = (n) => formatPrice(n, c.currency, c.locale);

    // قیمت
    this.priceEl.textContent = '';
    const price = v ? v.price : p.price;
    const reg = v ? v.regular_price : p.regular_price;
    if (p.type === 'variable' && !v && p.price_min !== undefined && p.price_min !== p.price_max) {
      this.priceEl.append(`${fmt(p.price_min)} – ${fmt(p.price_max)}`);
    } else {
      this.priceEl.append(h('span', { class: 'sf3d-price__now' }, fmt(price || 0)));
      if (reg && reg > (price || 0)) this.priceEl.append(h('del', { class: 'sf3d-price__old' }, fmt(reg)));
    }

    // فوریت موجودی: <۵ قرمز، <۱۰ نارنجی، بیشتر سبز ملایم
    const inStock = v ? v.in_stock : p.in_stock;
    const qty = v && v.stock_quantity !== null && v.stock_quantity !== undefined ? v.stock_quantity : p.stock_quantity;
    this.stockEl.className = 'sf3d-stock';
    this.stockEl.textContent = '';
    if (!inStock || qty === 0) {
      this.stockEl.classList.add('is-out');
      this.stockEl.textContent = s.outOfStock;
    } else if (qty !== null && qty !== undefined) {
      const threshold = Math.max(10, p.low_stock_threshold || 0);
      if (qty < 5) this.stockEl.classList.add('is-critical', 'is-pulse');
      else if (qty < threshold) this.stockEl.classList.add('is-low', 'is-pulse');
      else this.stockEl.classList.add('is-ok');
      if (qty < threshold) this.stockEl.append(icon('bolt', 14), ' ', tpl(s.lowStock, { n: formatNumber(qty, c.locale) }));
      else this.stockEl.textContent = s.inStock;
    } else {
      this.stockEl.classList.add('is-ok');
      this.stockEl.textContent = s.inStock;
    }

    // دکمه
    const st = this.state;
    let label = s.addToCart;
    let disabled = false;
    if (!p.in_stock) {
      label = s.outOfStock;
      disabled = true;
    } else if (p.type === 'variable') {
      if (!st.complete) {
        label = s.selectOptions;
        disabled = true;
      } else if (!st.ready) {
        label = s.outOfStock;
        disabled = true;
      }
    }
    this.addBtn.disabled = disabled;
    this.addLabel.textContent = label;
    this.addBtn.classList.remove('is-loading', 'is-done');
  }

  async add() {
    const p = this.current;
    const st = this.state;
    if (!p || this.addBtn.disabled) return;
    const s = this.app.config.strings;
    this.addBtn.disabled = true;
    this.addBtn.classList.add('is-loading');
    this.addLabel.textContent = s.adding;
    try {
      await this.app.addToCart(p, { variationId: st.variation ? st.variation.id : 0, attributes: st.attributes });
      this.addBtn.classList.remove('is-loading');
      this.addBtn.classList.add('is-done');
      this.addLabel.textContent = s.added;
      setTimeout(() => this.current === p && this.refresh(), 1600);
    } catch (e) {
      this.addBtn.classList.remove('is-loading');
      this.refresh();
    }
  }

  // ⚠️ بخش انتهایی فایل اصلی (destroy) در خروجی ابزار من قطع شده بود و آن را ندیدم.
  // این نسخه بازسازی شده است؛ قبل از جایگزینی با destroy() فعلی خودتان مقایسه کنید.
  destroy() {
    this.unsub && this.unsub();
    this.clearParts();
    this.el.remove();
  }
}
