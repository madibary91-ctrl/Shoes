// کانتینر ساده تزریق وابستگی

export class Container {
  constructor() {
    this.factories = new Map();
    this.instances = new Map();
  }

  bind(id, factory) {
    this.factories.set(id, { factory, shared: false });
    return this;
  }

  singleton(id, factory) {
    this.factories.set(id, { factory, shared: true });
    return this;
  }

  instance(id, value) {
    this.instances.set(id, value);
    return this;
  }

  has(id) {
    return this.instances.has(id) || this.factories.has(id);
  }

  make(id) {
    if (this.instances.has(id)) return this.instances.get(id);
    const entry = this.factories.get(id);
    if (!entry) throw new Error(`[SF3D] service not found: ${id}`);
    const value = entry.factory(this);
    if (entry.shared) this.instances.set(id, value);
    return value;
  }
}
