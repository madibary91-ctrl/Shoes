// فرم انتخاب Variation: دایره‌های رنگی (Swatch) برای رنگ + منوی کشویی برای سایز و سایر ویژگی‌ها
import { h } from '../utils/dom.js';
import { hexToRgb, isLight } from '../utils/color.js';

export class VariationForm {
  /**
   * @param {Object} product
   * @param {Object} strings
   * @param {(state:{ready:boolean, variation:Object|null, attributes:Object})=>void} onChange
   */
  constructor(product, strings, onChange) {
    this.product = product;
    this.s = strings;
    this.onChange = onChange;
    this.selected = {};
    this.el = h('div', { class: 'sf3d-variations' });
    this.controls = [];
    this.build();
    this.preselect();
    this.sync();
  }

  get attrs() {
    return this.product.variation_attributes || [];
  }

  /** وارییشن‌هایی که با انتخاب‌های فعلی (به‌جز attrName) سازگارند */
  compatible(attrName, value) {
    const sel = { ...this.selected, [attrName]: value };
    return (this.product.variations || []).some((v) => {
      if (!v.in_stock) return false;
      return Object.keys(sel).every((k) => {
        if (!sel[k]) return true;
        const vv = v.attributes[k];
        return vv === '' || vv === undefined || vv === sel[k];
      });
    });
  }

  build() {
    this.attrs.forEach((attr) => {
      const label = h('div', { class: 'sf3d-var__label', id: `sf3d-var-${this.product.id}-${attr.key}` }, attr.label, h('span', { class: 'sf3d-var__value' }));
      let control;
      if (attr.type === 'color') control = this.swatches(attr, label);
      else control = this.select(attr);
      this.el.appendChild(h('div', { class: `sf3d-var sf3d-var--${attr.type}` }, label, control));
    });
  }

  swatches(attr, label) {
    const wrap = h('div', { class: 'sf3d-swatches', role: 'radiogroup', 'aria-labelledby': label.id });
    const fallback = this.product.primary_color_hex;
    attr.options.forEach((opt) => {
      const hex = opt.hex || (attr.options.length === 1 ? fallback : '');
      const btn = h('button', { type: 'button', class: 'sf3d-swatch', role: 'radio', 'aria-checked': 'false', 'aria-label': opt.label, title: opt.label, dataset: { value: opt.value } });
      if (opt.thumb) {
        btn.style.backgroundImage = `url("${opt.thumb}")`;
        btn.classList.add('has-thumb');
      } else if (hexToRgb(hex)) {
        btn.style.background = hex;
        if (isLight(hex)) btn.classList.add('is-light');
      } else {
        btn.classList.add('is-text');
        btn.textContent = String(opt.label).slice(0, 3);
      }
      btn.addEventListener('click', () => this.pick(attr.name, this.selected[attr.name] === opt.value ? '' : opt.value));
      wrap.appendChild(btn);
    });
    this.controls.push({ attr, wrap, kind: 'swatch', label });
    return wrap;
  }

  select(attr) {
    const sel = h('select', { class: 'sf3d-select', 'aria-label': attr.label },
      h('option', { value: '' }, `${this.s.choose} ${attr.label}`),
      attr.options.map((o) => h('option', { value: o.value }, o.label)));
    sel.addEventListener('change', () => this.pick(attr.name, sel.value));
    this.controls.push({ attr, wrap: sel, kind: 'select' });
    return sel;
  }

  /** رنگ پیش‌فرض محصول (primary_color_hex) را اگر در گزینه‌ها بود انتخاب می‌کند */
  preselect() {
    const hex = (this.product.primary_color_hex || '').toLowerCase();
    if (!hex) return;
    const c = this.attrs.find((a) => a.type === 'color');
    const opt = c && c.options.find((o) => (o.hex || '').toLowerCase() === hex);
    if (opt && this.compatible(c.name, opt.value)) this.selected[c.name] = opt.value;
  }

  pick(name, value) {
    this.selected[name] = value;
    this.sync();
  }

  resolve() {
    const all = this.attrs.every((a) => this.selected[a.name]);
    if (!all) return null;
    return (this.product.variations || []).find((v) =>
      this.attrs.every((a) => {
        const vv = v.attributes[a.name];
        return vv === '' || vv === undefined || vv === this.selected[a.name];
      })) || null;
  }

  sync() {
    this.controls.forEach((c) => {
      if (c.kind === 'swatch') {
        c.wrap.querySelectorAll('.sf3d-swatch').forEach((b) => {
          const on = b.dataset.value === this.selected[c.attr.name];
          b.setAttribute('aria-checked', on ? 'true' : 'false');
          b.classList.toggle('is-selected', on);
          const ok = this.compatible(c.attr.name, b.dataset.value);
          b.classList.toggle('is-disabled', !ok);
          b.setAttribute('aria-disabled', ok ? 'false' : 'true');
        });
        const o = c.attr.options.find((x) => x.value === this.selected[c.attr.name]);
        c.label.querySelector('.sf3d-var__value').textContent = o ? ` : ${o.label}` : '';
      } else {
        c.wrap.value = this.selected[c.attr.name] || '';
        Array.from(c.wrap.options).forEach((opt) => {
          if (!opt.value) return;
          const ok = this.compatible(c.attr.name, opt.value);
          opt.disabled = !ok;
        });
      }
    });
    const variation = this.resolve();
    this.onChange({ ready: !!variation && variation.in_stock, variation, attributes: { ...this.selected }, complete: !!variation });
  }
}
