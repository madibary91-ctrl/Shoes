// سیستم علاقه‌مندی: localStorage (کلید sf3d:wishlist) + همگام‌سازی بین تب‌ها + user_meta برای کاربران لاگین
import { h, icon, safeStorage, debounce } from '../utils/dom.js';
import { tpl } from '../utils/format.js';

const KEY = 'sf3d:wishlist';

export class WishlistManager {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    this.storage = safeStorage();
    const local = this.read();
    const server = app.config.wishlist || [];
    const merged = Array.from(new Set([...server, ...local]));
    app.store.set('wishlist', merged);
    this.write(merged);

    // sync بین تب‌ها
    this._onStorage = (e) => {
      if (e.key === KEY) app.store.set('wishlist', this.read());
    };
    window.addEventListener('storage', this._onStorage);

    this.pushServer = debounce(() => this.sync(), 600);
    if (app.config.isLoggedIn) this.sync();
  }

  read() {
    try {
      const arr = JSON.parse(this.storage.getItem(KEY) || '[]');
      return Array.isArray(arr) ? arr.map(Number).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }

  write(ids) {
    this.storage.setItem(KEY, JSON.stringify(ids));
  }

  has(id) {
    return this.app.store.get('wishlist').includes(id);
  }

  toggle(id) {
    const list = this.app.store.get('wishlist');
    const active = !list.includes(id);
    const next = active ? [...list, id] : list.filter((x) => x !== id);
    this.app.store.set('wishlist', next);
    this.write(next);
    const product = this.app.getProduct(id);
    const s = this.app.config.strings;
    const title = product ? product.title : '';
    this.app.events.emit('wishlist:toggle', { id, active, product });
    this.app.sr.announce(tpl(active ? s.wishlistAdded : s.wishlistRemoved, { title }));
    if (this.app.config.isLoggedIn) this.pushServer();
    return active;
  }

  async sync() {
    try {
      const res = await this.app.client.syncWishlist(this.app.store.get('wishlist'));
      if (res && Array.isArray(res.ids)) {
        const ids = res.ids.map(Number);
        this.app.store.set('wishlist', ids);
        this.write(ids);
      }
    } catch (e) {
      // خطای شبکه: داده‌ی محلی معتبر می‌ماند
    }
  }

  destroy() {
    window.removeEventListener('storage', this._onStorage);
  }
}

/** دکمه‌ی قلب با انیمیشن pop ؛ به store گوش می‌دهد */
export function heartButton(app, id, extraClass = '') {
  const s = app.config.strings;
  const btn = h('button', { type: 'button', class: `sf3d-heart ${extraClass}`, 'aria-pressed': 'false', 'aria-label': s.wishlist, title: s.wishlist });
  const off = icon('heart', 22);
  const on = icon('heartFill', 22);
  btn.append(off, on);
  const apply = (list) => {
    const active = list.includes(id);
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('is-on', active);
  };
  apply(app.store.get('wishlist'));
  const unsub = app.store.subscribe('wishlist', apply);
  btn.addEventListener('click', () => {
    app.toggleWishlist(id);
    btn.classList.remove('pop');
    void btn.offsetWidth;
    btn.classList.add('pop');
  });
  return { el: btn, destroy: unsub };
}
