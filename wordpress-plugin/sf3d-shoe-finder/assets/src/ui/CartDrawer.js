// دراور سبد خرید که از سمت راست باز می‌شود
import { h, icon } from '../utils/dom.js';
import { formatNumber } from '../utils/format.js';

export class CartDrawer {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    this.isOpen = false;
    const s = app.config.strings;
    this.backdrop = h('div', { class: 'sf3d-backdrop', hidden: true });
    this.list = h('ul', { class: 'sf3d-drawer__list' });
    this.subtotal = h('strong', { class: 'sf3d-drawer__sub' });
    this.closeBtn = h('button', { type: 'button', class: 'sf3d-iconbtn', 'aria-label': s.close }, icon('close', 20));
    this.checkout = h('a', { class: 'sf3d-btn sf3d-btn--primary', href: app.config.checkoutUrl || '#' }, s.checkout);
    this.continueBtn = h('button', { type: 'button', class: 'sf3d-btn sf3d-btn--ghost' }, s.continueShopping);
    this.empty = h('p', { class: 'sf3d-drawer__empty' }, s.cartEmpty);
    this.foot = h('div', { class: 'sf3d-drawer__foot' },
      h('div', { class: 'sf3d-drawer__total' }, h('span', null, s.subtotal), this.subtotal),
      this.checkout, this.continueBtn);
    this.el = h('aside', { class: 'sf3d-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': s.cart, 'aria-hidden': 'true' },
      h('div', { class: 'sf3d-drawer__head' }, h('h2', null, s.cart), this.closeBtn),
      this.empty, this.list, this.foot);
    this.el.inert = true;
    app.stage.append(this.backdrop, this.el);

    this.closeBtn.addEventListener('click', () => this.close());
    this.continueBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());
    this.unsub = app.store.subscribe('cart', (c) => this.render(c));
    this.render(app.store.get('cart'));
  }

  render(cart) {
    const { app } = this;
    const s = app.config.strings;
    this.list.textContent = '';
    const items = cart.items || [];
    this.empty.hidden = items.length > 0;
    this.foot.hidden = items.length === 0;
    this.subtotal.innerHTML = cart.subtotal_html || '';
    items.forEach((it) => {
      const rm = h('button', { type: 'button', class: 'sf3d-iconbtn sf3d-drawer__rm', 'aria-label': `${s.remove}: ${it.name}` }, icon('trash', 18));
      rm.addEventListener('click', async () => {
        rm.disabled = true;
        try {
          await app.removeFromCart(it);
        } catch (e) {
          rm.disabled = false;
        }
      });
      const li = h('li', { class: 'sf3d-drawer__item' },
        h('img', { src: it.image || '', alt: '', loading: 'lazy' }),
        h('div', { class: 'sf3d-drawer__info' },
          h('div', { class: 'sf3d-drawer__name' }, it.name),
          h('div', { class: 'sf3d-drawer__meta' }, `${formatNumber(it.quantity, app.config.locale)} × `, h('span', { html: '' })),
          it.attributes ? h('div', { class: 'sf3d-drawer__attrs' }, it.attributes) : null),
        rm);
      li.querySelector('.sf3d-drawer__meta span').innerHTML = it.price_html || '';
      this.list.appendChild(li);
    });
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.backdrop.hidden = false;
    requestAnimationFrame(() => {
      this.backdrop.classList.add('is-in');
      this.el.classList.add('is-in');
    });
    this.el.inert = false;
    this.el.setAttribute('aria-hidden', 'false');
    this.release = this.app.focusManager.trap(this.el, { onEscape: () => this.close(), initial: this.closeBtn });
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.backdrop.classList.remove('is-in');
    this.el.classList.remove('is-in');
    this.el.inert = true;
    this.el.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (!this.isOpen) this.backdrop.hidden = true; }, 300);
    this.release && this.release();
  }

  destroy() {
    this.unsub();
    this.backdrop.remove();
    this.el.remove();
  }
}
