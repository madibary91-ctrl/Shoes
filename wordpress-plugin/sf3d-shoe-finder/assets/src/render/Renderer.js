// رندرر WebGL: برنامه‌های شیدر، رسم quad، DPR تطبیقی (Adaptive Quality)
import { QUAD_VS, QUAD_FS, BG_VS, BG_FS } from './Shaders.js';
import { hexToRgb } from '../utils/color.js';

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('[SF3D] shader: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('[SF3D] link: ' + gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    u[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{onQuality?:(q:number)=>void}} opts
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    const attrs = { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' };
    this.gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
    this.supported = !!this.gl;
    if (!this.supported) return;
    const gl = this.gl;
    this.quad = program(gl, QUAD_VS, QUAD_FS);
    this.bg = program(gl, BG_VS, BG_FS);
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    this.maxDpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = this.maxDpr;
    this.quality = 2; // 2 = کامل، 1 = DPR کاهش‌یافته، 0 = حداقل
    this.onQuality = opts.onQuality || (() => {});
    this.width = 0;
    this.height = 0;
    this._acc = 0;
    this._frames = 0;
    this._elapsed = 0;
    this._lastTex = null;
  }

  resize(w, h) {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    const c = this.canvas;
    c.width = Math.round(this.width * this.dpr);
    c.height = Math.round(this.height * this.dpr);
    c.style.width = this.width + 'px';
    c.style.height = this.height + 'px';
  }

  /** پایش FPS؛ اگر <45 → کاهش DPR ؛ اگر <30 → کیفیت حداقل */
  trackFrame(dt) {
    if (dt > 0.25) return; // تب پس‌زمینه
    this._elapsed += dt;
    if (this._elapsed < 2) return; // گرم‌شدن
    this._acc += dt;
    this._frames++;
    if (this._frames < 90) return;
    const fps = this._frames / this._acc;
    this._acc = 0;
    this._frames = 0;
    if (fps < 45 && this.dpr > 1) {
      this.dpr = Math.max(1, this.dpr - 0.5);
      this.quality = Math.min(this.quality, 1);
      this.resize(this.width, this.height);
      this.onQuality(this.quality);
    } else if (fps < 30 && this.quality > 0) {
      this.quality = 0;
      this.dpr = Math.max(0.75, this.dpr - 0.25);
      this.resize(this.width, this.height);
      this.onQuality(0);
    }
  }

  begin() {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  drawBackground({ color, opacity, scale, thick, offsetX, offsetY }) {
    if (this.quality === 0) return;
    const gl = this.gl;
    const { p, u } = this.bg;
    gl.useProgram(p);
    const c = hexToRgb(color) || [0.8, 0.8, 0.8];
    gl.uniform2f(u.uOffset, offsetX, offsetY);
    gl.uniform2f(u.uRes, this.width, this.height);
    gl.uniform1f(u.uScale, scale);
    gl.uniform1f(u.uThick, thick);
    gl.uniform1f(u.uOpacity, opacity);
    gl.uniform3f(u.uColor, c[0], c[1], c[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** آماده‌سازی یونیفورم‌های مشترک تایل‌ها */
  beginTiles({ camX, camY, camZ, focalX, focalY, fogNear, fogFar, time }) {
    const gl = this.gl;
    const { p, u } = this.quad;
    gl.useProgram(p);
    gl.uniform3f(u.uCam, camX, camY, camZ);
    gl.uniform2f(u.uFocal, focalX, focalY);
    gl.uniform1f(u.uFogNear, fogNear);
    gl.uniform1f(u.uFogFar, fogFar);
    gl.uniform1f(u.uTime, time);
    gl.uniform1i(u.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    this._lastTex = null;
  }

  drawQuad({ entry, cx, cy, z, w, h, opacity, active = 0, tint = [0.6, 0.6, 0.6] }) {
    const gl = this.gl;
    const u = this.quad.u;
    if (entry !== this._lastTex) {
      gl.bindTexture(gl.TEXTURE_2D, entry.tex);
      this._lastTex = entry;
    }
    gl.uniform2f(u.uCenter, cx, cy);
    gl.uniform2f(u.uSize, w, h);
    gl.uniform1f(u.uZ, z);
    gl.uniform1f(u.uOpacity, opacity);
    gl.uniform1f(u.uActive, active);
    gl.uniform1f(u.uLoaded, entry.ready ? 1 : 0);
    gl.uniform3f(u.uTint, tint[0], tint[1], tint[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    if (!this.supported) return;
    const ext = this.gl.getExtension('WEBGL_lose_context');
    ext && ext.loseContext();
  }
}
