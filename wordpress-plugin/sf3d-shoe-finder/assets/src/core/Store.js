// فروشگاه مرکزی State با اطلاع‌رسانی فقط هنگام تغییر واقعی

function shallowEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k] === b[k]);
}

export class Store {
  /** @param {Object} initial */
  constructor(initial = {}) {
    this.state = { ...initial };
    this.listeners = new Map();
  }

  get(key) {
    return this.state[key];
  }

  /** @returns {boolean} آیا مقدار تغییر کرد */
  set(key, value) {
    const old = this.state[key];
    if (shallowEqual(old, value)) return false;
    this.state[key] = value;
    this._notify(key, value, old);
    return true;
  }

  update(partial) {
    Object.keys(partial).forEach((k) => this.set(k, partial[k]));
  }

  /**
   * فقط به کلید مشخص گوش می‌دهد. '*' برای همه.
   * @returns {() => void} تابع لغو اشتراک
   */
  subscribe(key, fn) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(fn);
    return () => this.listeners.get(key)?.delete(fn);
  }

  _notify(key, value, old) {
    [key, '*'].forEach((k) => {
      this.listeners.get(k)?.forEach((fn) => {
        try {
          fn(value, old, key);
        } catch (e) {
          // یک شنونده خراب نباید بقیه را از کار بیندازد
          if (typeof console !== 'undefined') console.error('[SF3D] store listener error', e);
        }
      });
    });
  }
}
