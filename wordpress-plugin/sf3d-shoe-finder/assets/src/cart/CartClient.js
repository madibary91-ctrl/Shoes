// کلاینت AJAX ووکامرس (?wc-ajax=…) با nonce و تلاش مجدد پس از تازه‌سازی nonce

export class CartClient {
  /** @param {{ajaxUrl:string, nonce:string}} config */
  constructor(config) {
    this.ajaxUrl = config.ajaxUrl;
    this.nonce = config.nonce;
  }

  url(endpoint, query = {}) {
    let u = this.ajaxUrl.includes('%%endpoint%%') ? this.ajaxUrl.replace('%%endpoint%%', endpoint) : `${this.ajaxUrl}${this.ajaxUrl.includes('?') ? '&' : '?'}wc-ajax=${endpoint}`;
    const qs = new URLSearchParams(query).toString();
    if (qs) u += (u.includes('?') ? '&' : '?') + qs;
    return u;
  }

  async _fetch(endpoint, { method = 'GET', body, query } = {}, retry = true) {
    const opts = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (method === 'POST') {
      const fd = new URLSearchParams();
      fd.set('nonce', this.nonce);
      Object.entries(body || {}).forEach(([k, v]) => {
        if (v && typeof v === 'object') Object.entries(v).forEach(([kk, vv]) => fd.set(`${k}[${kk}]`, vv));
        else if (v !== undefined && v !== null) fd.set(k, v);
      });
      opts.body = fd;
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    }
    const res = await fetch(this.url(endpoint, query), opts);
    let json = null;
    try {
      json = await res.json();
    } catch (e) { /* خالی */ }
    if (res.status === 403 && retry && method === 'POST') {
      // nonce منقضی شده (کش صفحه): تازه‌سازی و یک بار تلاش مجدد
      await this.refreshNonce();
      return this._fetch(endpoint, { method, body, query }, false);
    }
    if (!res.ok || !json || json.success === false) {
      const err = new Error((json && json.data && json.data.message) || `HTTP ${res.status}`);
      err.data = json && json.data;
      throw err;
    }
    return json.data !== undefined ? json.data : json;
  }

  async refreshNonce() {
    const data = await this._fetch('sf3d_nonce', {}, false);
    if (data && data.nonce) this.nonce = data.nonce;
    return this.nonce;
  }

  /** @returns {Promise<{cart_item_key:string, cart:Object}>} */
  addToCart({ productId, variationId = 0, quantity = 1, variation = {} }) {
    return this._fetch('sf3d_add_to_cart', {
      method: 'POST',
      body: { product_id: productId, variation_id: variationId, quantity, variation },
    });
  }

  getCart() {
    return this._fetch('sf3d_cart');
  }

  removeItem(key) {
    return this._fetch('sf3d_remove_from_cart', { method: 'POST', body: { cart_item_key: key } });
  }

  related(id) {
    return this._fetch('sf3d_related', { query: { id } });
  }

  product(id) {
    return this._fetch('sf3d_product', { query: { id } });
  }

  search(q) {
    return this._fetch('sf3d_search', { query: { q } });
  }

  syncWishlist(ids) {
    return this._fetch('sf3d_wishlist', { method: 'POST', body: { ids: ids.join(',') } });
  }
}
