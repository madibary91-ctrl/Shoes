// تله‌ی فوکوس برای کارت/دراور و بازگرداندن فوکوس به عنصر قبلی

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export class FocusManager {
  constructor() {
    this.stack = [];
  }

  /**
   * @param {HTMLElement} container
   * @param {{onEscape?:Function, initial?:HTMLElement}} opts
   * @returns {() => void} آزادسازی
   */
  trap(container, opts = {}) {
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape' && opts.onEscape) {
        e.stopPropagation();
        opts.onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener('keydown', onKey);
    const target = opts.initial || container.querySelector(FOCUSABLE) || container;
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
    setTimeout(() => target.focus({ preventScroll: true }), 30);
    const release = () => {
      container.removeEventListener('keydown', onKey);
      if (previous && previous.focus && document.contains(previous)) previous.focus({ preventScroll: true });
    };
    this.stack.push(release);
    return () => {
      this.stack = this.stack.filter((r) => r !== release);
      release();
    };
  }
}
