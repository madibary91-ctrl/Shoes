// شیدرهای سبک WebGL1؛ همه خروجی‌ها premultiplied alpha هستند

export const QUAD_VS = `
attribute vec2 aPos;
uniform vec3 uCam;
uniform vec2 uFocal;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform float uZ;
varying vec2 vUv;
varying float vDepth;
void main() {
  vUv = vec2(aPos.x + 0.5, 0.5 - aPos.y);
  vec3 w = vec3(uCenter + aPos * uSize, uZ);
  vec3 v = w - uCam;
  vDepth = -v.z;
  gl_Position = vec4(v.x * uFocal.x, v.y * uFocal.y, 0.0, max(-v.z, 0.001));
}`;

export const QUAD_FS = `
precision mediump float;
uniform sampler2D uTex;
uniform float uOpacity;
uniform float uActive;
uniform float uTime;
uniform float uLoaded;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uTint;
varying vec2 vUv;
varying float vDepth;
void main() {
  vec4 c;
  if (uLoaded > 0.5) {
    c = texture2D(uTex, vUv);
  } else {
    // جای‌نگهدار (LQIP): لکه‌ی نرم با رنگ اصلی محصول تا تصویر اصلی برسد
    vec2 p = (vUv - 0.5) * vec2(1.0, 1.7);
    float a = (1.0 - smoothstep(0.28, 0.44, length(p))) * 0.5;
    c = vec4(uTint * a, a);
  }
  // درخشش عبوری روی کفشِ فوکوس‌شده
  float s = vUv.x - vUv.y * 0.35;
  float sweep = 1.0 - smoothstep(0.0, 0.12, abs(s - (fract(uTime * 0.4) * 1.8 - 0.4)));
  c.rgb += c.a * sweep * 0.3 * uActive;
  float fog = 1.0 - smoothstep(uFogNear, uFogFar, vDepth);
  gl_FragColor = c * (uOpacity * fog);
}`;

export const BG_VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos + 0.5;
  gl_Position = vec4(aPos * 2.0, 0.0, 1.0);
}`;

export const BG_FS = `
precision mediump float;
uniform vec2 uOffset;
uniform vec2 uRes;
uniform float uScale;
uniform float uThick;
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * uScale + uOffset;
  vec2 g = abs(fract(p) - 0.5);
  float line = max(smoothstep(0.5 - uThick, 0.5, g.x), smoothstep(0.5 - uThick, 0.5, g.y));
  float vign = 1.0 - smoothstep(0.15, 1.15, length(vUv - 0.5) * 1.5);
  float a = line * uOpacity * vign;
  gl_FragColor = vec4(uColor * a, a);
}`;
