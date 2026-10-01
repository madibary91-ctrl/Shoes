// جداسازی پس‌زمینه‌ی دیالوگ: فرزندان مستقیم scope را inert می‌کند و در release دقیقاً برمی‌گرداند.
// - اگر مرورگر inert بومی نداشته باشد، aria-hidden به‌عنوان fallback گذاشته می‌شود.
// - عناصر زیر عمداً دست‌نخورده می‌مانند: canvas (درگ/کلیک روی کفش‌ها)، live regionها (اعلان‌های screen reader و toast)،
//   دیالوگ‌های دیگر (مثلاً دراور سبد) و هر عنصر با data-sf3d-keep.
// - عناصری که از قبل inert بودند (مثل دراور بسته) لمس نمی‌شوند و در release هم تغییر نمی‌کنند.

const KEEP = 'canvas,[aria-live],[role="status"],[role="alert"],[role="log"],[role="dialog"],[aria-modal="true"],[data-sf3d-keep]';

export function supportsInert() {
  return typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;
}

/**
 * @param {HTMLElement} scope  والد عناصری که باید غیرفعال شوند (مثلاً app.stage)
 * @param {HTMLElement} dialog عنصر دیالوگ که فعال می‌ماند
 * @param {string} [keepSelector]
 * @returns {() => void} آزادسازی (چندبار صدا زدنش بی‌خطر است)
 */
export function inertOthers(scope, dialog, keepSelector = KEEP) {
  if (!scope || !dialog) return () => {};
  const native = supportsInert();
  const touched = [];

  Array.from(scope.children).forEach((el) => {
    if (el === dialog || el.contains(dialog)) return;
    if (el.hasAttribute('inert')) return;
    if (el.matches(keepSelector) || el.querySelector('canvas,[data-sf3d-keep]')) return;
    const prevHidden = el.getAttribute('aria-hidden');
    el.setAttribute('inert', '');
    if (!native) el.setAttribute('aria-hidden', 'true');
    touched.push({ el, prevHidden });
  });

  let released = false;
  return () => {
    if (released) return;
    released = true;
    touched.forEach(({ el, prevHidden }) => {
      el.removeAttribute('inert');
      if (native) return;
      if (prevHidden === null) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', prevHidden);
    });
    touched.length = 0;
  };
}
