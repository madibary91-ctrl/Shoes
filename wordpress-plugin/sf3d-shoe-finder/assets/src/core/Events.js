// باس رویداد (pub/sub) + بازتاب رویدادهای عمومی روی DOM به صورت sf3d:*

const PUBLIC_MAP = {
  ready: 'sf3d:ready',
  focus: 'sf3d:focus',
  filter: 'sf3d:filter',
  'cart:added': 'sf3d:added',
  'cart:removed': 'sf3d:removed',
  'wishlist:toggle': 'sf3d:wishlist:toggle',
  error: 'sf3d:error',
};

export class Events {
  /** @param {HTMLElement|null} domTarget */
  constructor(domTarget = null) {
    this.map = new Map();
    this.domTarget = domTarget;
  }

  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, new Set());
    this.map.get(name).add(fn);
    return () => this.off(name, fn);
  }

  once(name, fn) {
    const off = this.on(name, (p) => {
      off();
      fn(p);
    });
    return off;
  }

  off(name, fn) {
    this.map.get(name)?.delete(fn);
  }

  emit(name, payload) {
    [name, '*'].forEach((n) => {
      this.map.get(n)?.forEach((fn) => {
        try {
          n === '*' ? fn(name, payload) : fn(payload);
        } catch (e) {
          if (typeof console !== 'undefined') console.error('[SF3D] event error', name, e);
        }
      });
    });
    const domName = PUBLIC_MAP[name];
    if (domName && this.domTarget) {
      this.domTarget.dispatchEvent(new CustomEvent(domName, { detail: payload, bubbles: true }));
    }
  }
}
