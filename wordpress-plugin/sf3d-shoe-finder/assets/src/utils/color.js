// ابزارهای رنگ

/** تبدیل hex به [r,g,b] در بازه 0..1 ؛ در صورت نامعتبر بودن null */
export function hexToRgb(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** آیا رنگ روشن است؟ */
export function isLight(hex) {
  const c = hexToRgb(hex);
  if (!c) return true;
  return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] > 0.6;
}

/** رنگ متن خوانا روی پس‌زمینه */
export function contrastText(hex) {
  return isLight(hex) ? '#111111' : '#ffffff';
}

/** ترکیب دو رنگ hex */
export function mix(a, b, t) {
  const ca = hexToRgb(a) || [0, 0, 0];
  const cb = hexToRgb(b) || [0, 0, 0];
  return ca.map((v, i) => v + (cb[i] - v) * t);
}

export function rgba(hex, alpha) {
  const c = hexToRgb(hex) || [0, 0, 0];
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${alpha})`;
}
