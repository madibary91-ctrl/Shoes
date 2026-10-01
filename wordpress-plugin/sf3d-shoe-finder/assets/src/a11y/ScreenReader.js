// ناحیه‌ی aria-live برای اعلان تغییرات (سبد خرید، علاقه‌مندی، فوکوس)
import { h } from '../utils/dom.js';

export class ScreenReader {
  constructor(root) {
    this.region = h('div', {
      class: 'sf3d-sr-only',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
    });
    root.appendChild(this.region);
    this.timer = 0;
  }

  announce(message) {
    clearTimeout(this.timer);
    this.region.textContent = '';
    // تأخیر کوتاه تا مرورگر تغییر را حتماً اعلان کند
    this.timer = setTimeout(() => {
      this.region.textContent = message;
    }, 60);
  }
}
