// اعلان‌های کوچک (Toast)؛ اعلان صوتی توسط ScreenReader جداگانه انجام می‌شود
import { h, icon } from '../utils/dom.js';

export class Toast {
  constructor(root) {
    // [F1] data-sf3d-keep: وقتی کارت مودال باز است inertOthers() بقیه‌ی فرزندان stage را inert می‌کند.
    // بدون این صفت، دکمه‌ی اکشن توست (مثلاً «سبد») غیرقابل کلیک می‌شد.
    // h() مقدار '' را به‌صورت data-sf3d-keep="" روی عنصر می‌گذارد (بررسی‌شده در utils/dom.js)
    this.box = h('div', { class: 'sf3d-toasts', 'aria-hidden': 'true', 'data-sf3d-keep': '' });
    root.appendChild(this.box);
  }

  /**
   * @param {string} message
   * @param {{type?:'success'|'error'|'info', action?:{label:string, onClick:Function}, duration?:number}} opts
   */
  show(message, opts = {}) {
    const { type = 'info', action, duration = 3200 } = opts;
    const el = h('div', { class: `sf3d-toast sf3d-toast--${type}` },
      type === 'success' ? icon('check', 18) : null,
      h('span', null, message));
    if (action) {
      const b = h('button', { type: 'button', class: 'sf3d-toast__action', tabindex: '-1' }, action.label);
      b.addEventListener('click', () => { action.onClick(); el.remove(); });
      el.appendChild(b);
    }
    this.box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => {
      el.classList.remove('is-in');
      setTimeout(() => el.remove(), 300);
    }, duration);
    while (this.box.children.length > 3) this.box.firstChild.remove();
  }
}
