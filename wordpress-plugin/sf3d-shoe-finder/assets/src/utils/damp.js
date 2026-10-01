// میرایی نمایی (damping) برای انیمیشن‌های نرم؛ مشابه maath.easing.damp
let reduced = false;

/** فعال/غیرفعال کردن حالت کاهش حرکت (prefers-reduced-motion) */
export function setReducedMotion(value) {
  reduced = !!value;
}

export function isReducedMotion() {
  return reduced;
}

/**
 * @param {number} current مقدار فعلی
 * @param {number} target مقدار هدف
 * @param {number} smoothTime زمان نرم‌شدن (ثانیه)
 * @param {number} dt دلتای فریم (ثانیه)
 * @returns {number}
 */
export function damp(current, target, smoothTime, dt) {
  if (reduced || smoothTime <= 0) return target;
  const k = 1 - Math.exp(-(2 / smoothTime) * dt);
  const next = current + (target - current) * k;
  return Math.abs(target - next) < 1e-4 ? target : next;
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
