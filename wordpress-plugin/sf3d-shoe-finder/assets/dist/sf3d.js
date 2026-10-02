(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.SF3D = {}));
})(this, function(exports2) {
  "use strict";
  function shallowEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => a[k] === b[k]);
  }
  class Store {
    /** @param {Object} initial */
    constructor(initial = {}) {
      this.state = { ...initial };
      this.listeners = /* @__PURE__ */ new Map();
    }
    get(key) {
      return this.state[key];
    }
    /** @returns {boolean} آیا مقدار تغییر کرد */
    set(key, value) {
      const old = this.state[key];
      if (shallowEqual(old, value)) return false;
      this.state[key] = value;
      this._notify(key, value, old);
      return true;
    }
    update(partial) {
      Object.keys(partial).forEach((k) => this.set(k, partial[k]));
    }
    /**
     * فقط به کلید مشخص گوش می‌دهد. '*' برای همه.
     * @returns {() => void} تابع لغو اشتراک
     */
    subscribe(key, fn) {
      if (!this.listeners.has(key)) this.listeners.set(key, /* @__PURE__ */ new Set());
      this.listeners.get(key).add(fn);
      return () => {
        var _a;
        return (_a = this.listeners.get(key)) == null ? void 0 : _a.delete(fn);
      };
    }
    _notify(key, value, old) {
      [key, "*"].forEach((k) => {
        var _a;
        (_a = this.listeners.get(k)) == null ? void 0 : _a.forEach((fn) => {
          try {
            fn(value, old, key);
          } catch (e) {
            if (typeof console !== "undefined") console.error("[SF3D] store listener error", e);
          }
        });
      });
    }
  }
  const PUBLIC_MAP = {
    ready: "sf3d:ready",
    focus: "sf3d:focus",
    filter: "sf3d:filter",
    "cart:added": "sf3d:added",
    "cart:removed": "sf3d:removed",
    "wishlist:toggle": "sf3d:wishlist:toggle",
    error: "sf3d:error"
  };
  class Events {
    /** @param {HTMLElement|null} domTarget */
    constructor(domTarget = null) {
      this.map = /* @__PURE__ */ new Map();
      this.domTarget = domTarget;
    }
    on(name, fn) {
      if (!this.map.has(name)) this.map.set(name, /* @__PURE__ */ new Set());
      this.map.get(name).add(fn);
      return () => this.off(name, fn);
    }
    once(name, fn) {
      const off = this.on(name, (p) => {
        off();
        fn(p);
      });
      return off;
    }
    off(name, fn) {
      var _a;
      (_a = this.map.get(name)) == null ? void 0 : _a.delete(fn);
    }
    emit(name, payload) {
      [name, "*"].forEach((n) => {
        var _a;
        (_a = this.map.get(n)) == null ? void 0 : _a.forEach((fn) => {
          try {
            n === "*" ? fn(name, payload) : fn(payload);
          } catch (e) {
            if (typeof console !== "undefined") console.error("[SF3D] event error", name, e);
          }
        });
      });
      const domName = PUBLIC_MAP[name];
      if (domName && this.domTarget) {
        this.domTarget.dispatchEvent(new CustomEvent(domName, { detail: payload, bubbles: true }));
      }
    }
  }
  class Container {
    constructor() {
      this.factories = /* @__PURE__ */ new Map();
      this.instances = /* @__PURE__ */ new Map();
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
  const GRID_DEFAULTS = {
    gridCols: 8,
    itemSize: 2.5,
    gap: 0.4,
    dragSpeed: 2.2,
    dampFactor: 0.2,
    clickThreshold: 5,
    dragResistance: 0.25,
    zoomIn: 12,
    zoomOut: 31,
    zoomDamp: 0.25,
    fov: 40,
    focusScale: 1.5,
    dimScale: 0.5,
    dimOpacity: 0.15,
    curvatureStrength: 0.06,
    cullDistance: 14,
    mapWidth: 120,
    fogNear: 19,
    fogFar: 100,
    enterStartOpacity: 0,
    enterStartZ: -50,
    exitEndZ: 20,
    transitionZDamp: 0.25,
    enterOpacityDamp: 0.85,
    exitOpacityDamp: 0.15,
    enterStaggerDelay: 400,
    exitStaggerDelay: 300,
    cleanupTimeout: 700,
    exitSpreadY: 0.5,
    enterSpreadY: 1,
    transitionYDamp: 0.08,
    filterOpacityDamp: 0.06,
    filterScaleTarget: 0.5,
    labelZoomMax: 24,
    bgColor: "#e0e0e0",
    bgOpacity: 0.4,
    bgSpeed: 0.05,
    bgScale: 3,
    bgLineThickness: 0.03
  };
  const GRID_LIMITS = {
    gridCols: [1, 24, true],
    itemSize: [0.5, 10],
    gap: [0, 5],
    dragSpeed: [0.1, 10],
    dampFactor: [0.01, 1],
    clickThreshold: [1, 50],
    dragResistance: [0, 1],
    zoomIn: [2, 80],
    zoomOut: [5, 160],
    zoomDamp: [0.01, 1],
    fov: [10, 100],
    focusScale: [1, 4],
    dimScale: [0.1, 1],
    dimOpacity: [0, 1],
    curvatureStrength: [0, 1],
    cullDistance: [1, 200],
    mapWidth: [10, 1e3],
    fogNear: [0, 500],
    fogFar: [1, 1e3],
    enterStaggerDelay: [0, 3e3],
    exitStaggerDelay: [0, 3e3],
    cleanupTimeout: [0, 5e3],
    bgOpacity: [0, 1],
    bgSpeed: [0, 5],
    bgScale: [0.1, 20],
    bgLineThickness: [0, 1]
  };
  const FEATURE_DEFAULTS = {
    wishlist: true,
    quickActions: true,
    badges: true,
    gallery: true,
    related: true,
    search: true,
    darkMode: true,
    filters: true,
    sort: true,
    bulk: true,
    recent: true,
    cartDrawer: true,
    minimap: true,
    hashSync: true,
    cardModal: true
  };
  const DEFAULT_PRESET = "minimal";
  const PRESET_RE = /^[a-z0-9_-]{1,32}$/;
  const HEX_RE = /^#[0-9a-f]{3,8}$/i;
  const STRINGS = {
    all: "همه",
    wishlist: "علاقه‌مندی‌ها",
    recent: "اخیراً دیده‌شده",
    filters: "فیلترها",
    sort: "مرتب‌سازی",
    reset: "پاک‌کردن فیلترها",
    search: "جستجوی کفش…",
    noResults: "نتیجه‌ای پیدا نشد",
    addToCart: "افزودن به سبد",
    selectOptions: "گزینه‌ها را انتخاب کنید",
    outOfStock: "ناموجود",
    sale: "حراج",
    new: "جدید",
    added: "به سبد اضافه شد",
    adding: "در حال افزودن…",
    error: "خطایی رخ داد. دوباره تلاش کنید.",
    cart: "سبد خرید",
    cartEmpty: "سبد خرید شما خالی است",
    subtotal: "جمع جزء",
    checkout: "تسویه حساب",
    continueShopping: "ادامه‌ی خرید",
    remove: "حذف",
    close: "بستن",
    related: "محصولات مشابه",
    emptyWishlist: "هنوز چیزی ذخیره نکردی",
    emptyRecent: "هنوز محصولی ندیده‌ای",
    lowStock: "فقط {n} عدد باقی مانده!",
    inStock: "موجود در انبار",
    share: "اشتراک‌گذاری",
    linkCopied: "لینک کپی شد",
    quickView: "مشاهده سریع",
    compare: "مقایسه",
    compareTitle: "مقایسه محصولات",
    selected: "{n} محصول انتخاب شد",
    bulkAdd: "افزودن به سبد",
    clear: "لغو انتخاب",
    skip: "پرش به شبکه",
    gridLabel: "شبکه محصولات",
    viewProduct: "مشاهده محصول",
    prev: "قبلی",
    next: "بعدی",
    darkMode: "حالت تاریک",
    lightMode: "حالت روشن",
    sortDefault: "پیش‌فرض",
    sortNew: "جدیدترین",
    sortPriceAsc: "ارزان‌ترین",
    sortPriceDesc: "گران‌ترین",
    sortPopular: "محبوب‌ترین",
    size: "سایز",
    color: "رنگ",
    choose: "انتخاب…",
    spin360: "برای چرخاندن بکشید",
    addedAnnounce: "{title} به سبد اضافه شد",
    wishlistAdded: "{title} به علاقه‌مندی‌ها اضافه شد",
    wishlistRemoved: "{title} از علاقه‌مندی‌ها حذف شد",
    focused: "{title} انتخاب شد",
    products: "محصول",
    // ── [F14] کلیدهای جدید ──
    gallery: "گالری تصاویر",
    // ── کلیدهای مورد نیاز fixهای بعدی (F5, F7, F9, F10, F17) ──
    networkError: "اتصال برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.",
    resultsCount: "{n} محصول یافت شد",
    cartCount: "سبد خرید، {n} کالا",
    compareOn: "{title} به مقایسه اضافه شد",
    compareOff: "{title} از مقایسه حذف شد",
    selectOn: "{title} برای افزودن گروهی انتخاب شد",
    selectOff: "{title} از انتخاب گروهی خارج شد",
    webglLost: "نمایش سه‌بعدی قطع شد؛ در حال بازیابی…",
    webglRestored: "نمایش سه‌بعدی دوباره برقرار شد"
  };
  const num = (v, d) => Number.isFinite(Number(v)) && v !== "" && v !== null ? Number(v) : d;
  function clampGrid(key, value) {
    const lim = GRID_LIMITS[key];
    if (!lim) return value;
    const [min, max, int] = lim;
    let v = Math.min(max, Math.max(min, value));
    if (int) v = Math.round(v);
    return v;
  }
  const normalizePreset = (v) => {
    const s = typeof v === "string" ? v.trim().toLowerCase() : "";
    return PRESET_RE.test(s) ? s : DEFAULT_PRESET;
  };
  function normalizeConfig(raw = {}) {
    const grid = { ...GRID_DEFAULTS };
    Object.keys(GRID_DEFAULTS).forEach((k) => {
      const v = raw.grid && raw.grid[k];
      if (v === void 0 || v === null || v === "") return;
      if (typeof GRID_DEFAULTS[k] === "number") {
        grid[k] = clampGrid(k, num(v, GRID_DEFAULTS[k]));
      } else if (k === "bgColor") {
        grid[k] = HEX_RE.test(String(v)) ? String(v) : GRID_DEFAULTS[k];
      } else {
        grid[k] = String(v);
      }
    });
    if (grid.zoomOut <= grid.zoomIn) grid.zoomOut = grid.zoomIn + 1;
    if (grid.fogFar <= grid.fogNear) grid.fogFar = grid.fogNear + 1;
    const features = { ...FEATURE_DEFAULTS };
    Object.keys(FEATURE_DEFAULTS).forEach((k) => {
      if (raw.features && k in raw.features) features[k] = !!raw.features[k] && raw.features[k] !== "0";
    });
    const locale = raw.locale || typeof document !== "undefined" && document.documentElement.lang || "fa-IR";
    return {
      grid,
      features,
      strings: { ...STRINGS, ...raw.i18n || {} },
      ajaxUrl: raw.ajaxUrl || "/?wc-ajax=%%endpoint%%",
      nonce: raw.nonce || "",
      locale,
      rtl: raw.rtl !== void 0 ? !!raw.rtl : typeof document !== "undefined" && document.dir === "rtl",
      isLoggedIn: !!raw.isLoggedIn,
      currency: { symbol: "", position: "right_space", decimals: 0, decimalSep: ".", thousandSep: ",", ...raw.currency || {} },
      wpLocale: raw.wpLocale || {},
      cartUrl: raw.cartUrl || "",
      checkoutUrl: raw.checkoutUrl || "",
      title: raw.title || "",
      height: raw.height || "",
      theme: raw.theme || "auto",
      // [F2b] preset حالا از PHP (Renderer::config) می‌رسد
      preset: normalizePreset(raw.preset),
      startCollection: raw.startCollection || "all",
      cardPosition: raw.cardPosition || "end",
      wishlist: Array.isArray(raw.wishlist) ? raw.wishlist.map(Number) : [],
      debug: !!raw.debug
    };
  }
  const QUAD_VS = `
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
  const QUAD_FS = `
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
  const BG_VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos + 0.5;
  gl_Position = vec4(aPos * 2.0, 0.0, 1.0);
}`;
  const BG_FS = `
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
  function hexToRgb(hex) {
    let h2 = String(hex || "").trim().replace("#", "");
    if (h2.length === 3) h2 = h2.split("").map((c) => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(h2)) return null;
    const n = parseInt(h2, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function isLight(hex) {
    const c = hexToRgb(hex);
    if (!c) return true;
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] > 0.6;
  }
  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error("[SF3D] shader: " + gl.getShaderInfoLog(s));
    }
    return s;
  }
  function program(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("[SF3D] link: " + gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }
  class Renderer {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {{onQuality?:(q:number)=>void}} opts
     */
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      const attrs = { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance" };
      this.gl = canvas.getContext("webgl", attrs) || canvas.getContext("experimental-webgl", attrs);
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
      this.quality = 2;
      this.onQuality = opts.onQuality || (() => {
      });
      this.width = 0;
      this.height = 0;
      this._acc = 0;
      this._frames = 0;
      this._elapsed = 0;
      this._lastTex = null;
    }
    resize(w, h2) {
      this.width = Math.max(1, w);
      this.height = Math.max(1, h2);
      const c = this.canvas;
      c.width = Math.round(this.width * this.dpr);
      c.height = Math.round(this.height * this.dpr);
      c.style.width = this.width + "px";
      c.style.height = this.height + "px";
    }
    /** پایش FPS؛ اگر <45 → کاهش DPR ؛ اگر <30 → کیفیت حداقل */
    trackFrame(dt) {
      if (dt > 0.25) return;
      this._elapsed += dt;
      if (this._elapsed < 2) return;
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
    drawQuad({ entry, cx, cy, z, w, h: h2, opacity, active = 0, tint = [0.6, 0.6, 0.6] }) {
      const gl = this.gl;
      const u = this.quad.u;
      if (entry !== this._lastTex) {
        gl.bindTexture(gl.TEXTURE_2D, entry.tex);
        this._lastTex = entry;
      }
      gl.uniform2f(u.uCenter, cx, cy);
      gl.uniform2f(u.uSize, w, h2);
      gl.uniform1f(u.uZ, z);
      gl.uniform1f(u.uOpacity, opacity);
      gl.uniform1f(u.uActive, active);
      gl.uniform1f(u.uLoaded, entry.ready ? 1 : 0);
      gl.uniform3f(u.uTint, tint[0], tint[1], tint[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    dispose() {
      if (!this.supported) return;
      const ext = this.gl.getExtension("WEBGL_lose_context");
      ext && ext.loseContext();
    }
  }
  let reduced = false;
  function setReducedMotion(value) {
    reduced = !!value;
  }
  function isReducedMotion() {
    return reduced;
  }
  function damp(current, target, smoothTime, dt) {
    if (reduced || smoothTime <= 0) return target;
    const k = 1 - Math.exp(-(2 / smoothTime) * dt);
    const next = current + (target - current) * k;
    return Math.abs(target - next) < 1e-4 ? target : next;
  }
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  class Camera {
    constructor(cfg) {
      this.cfg = cfg;
      this.x = 0;
      this.y = 0;
      this.zoom = cfg.zoomOut;
      this.tx = 0;
      this.ty = 0;
      this.tz = cfg.zoomOut;
      this.width = 1;
      this.height = 1;
      this.bounds = { minX: -10, maxX: 10, minY: -10, maxY: 10 };
      this.vx = 0;
      this.vy = 0;
      this.dragging = false;
      this.tanHalf = Math.tan(cfg.fov * Math.PI / 360);
    }
    resize(w, h2) {
      this.width = Math.max(1, w);
      this.height = Math.max(1, h2);
    }
    get aspect() {
      return this.width / this.height;
    }
    focal() {
      return [1 / (this.tanHalf * this.aspect), 1 / this.tanHalf];
    }
    /** واحد دنیا به ازای هر پیکسل در عمق مشخص (فاصله از دوربین) */
    unitsPerPixel(depth = this.zoom) {
      return 2 * depth * this.tanHalf / this.height;
    }
    setBounds(b) {
      this.bounds = b;
    }
    setTarget(x, y, zoom) {
      this.tx = x;
      this.ty = y;
      if (zoom !== void 0) this.tz = zoom;
      this.vx = this.vy = 0;
    }
    /** درگ با مقاومت خارج از محدوده */
    panByPixels(dx, dy) {
      const upp = this.unitsPerPixel(this.tz) * (this.cfg.dragSpeed / 2.2);
      const b = this.bounds;
      const r = this.cfg.dragResistance;
      let nx = this.tx - dx * upp;
      let ny = this.ty + dy * upp;
      if (nx < b.minX || nx > b.maxX) nx = this.tx - dx * upp * r;
      if (ny < b.minY || ny > b.maxY) ny = this.ty + dy * upp * r;
      this.vx = (nx - this.tx) * 0.6 + this.vx * 0.4;
      this.vy = (ny - this.ty) * 0.6 + this.vy * 0.4;
      this.tx = nx;
      this.ty = ny;
    }
    /** پایان درگ: اینرسی کوچک + برگرداندن به محدوده */
    release() {
      const b = this.bounds;
      this.tx = clamp(this.tx + this.vx * 6, b.minX, b.maxX);
      this.ty = clamp(this.ty + this.vy * 6, b.minY, b.maxY);
      this.vx = this.vy = 0;
    }
    zoomBy(factor, min, max) {
      this.tz = clamp(this.tz * factor, min, max);
    }
    /** @returns {boolean} آیا هنوز در حال حرکت است */
    update(dt) {
      const c = this.cfg;
      const px = this.x;
      const py = this.y;
      const pz = this.zoom;
      this.x = damp(this.x, this.tx, c.dampFactor, dt);
      this.y = damp(this.y, this.ty, c.dampFactor, dt);
      this.zoom = damp(this.zoom, this.tz, c.zoomDamp, dt);
      return px !== this.x || py !== this.y || pz !== this.zoom;
    }
    /** تصویر یک نقطه‌ی دنیا روی صفحه (پیکسل نسبت به canvas) + مقیاس px/unit */
    project(wx, wy, wz = 0) {
      const d = this.zoom - wz;
      const s = this.height / (2 * d * this.tanHalf);
      return { x: this.width / 2 + (wx - this.x) * s, y: this.height / 2 - (wy - this.y) * s, scale: s, depth: d };
    }
    /** برعکس project در عمق wz */
    unproject(px, py, wz = 0) {
      const d = this.zoom - wz;
      const upp = 2 * d * this.tanHalf / this.height;
      return { x: this.x + (px - this.width / 2) * upp, y: this.y - (py - this.height / 2) * upp };
    }
  }
  const MAX_TEX = 768;
  class TextureStore {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {{onLoad?:Function, concurrency?:number}} opts
     */
    constructor(gl, opts = {}) {
      this.gl = gl;
      this.cache = /* @__PURE__ */ new Map();
      this.queue = [];
      this.active = 0;
      this.concurrency = opts.concurrency || 4;
      this.onLoad = opts.onLoad || (() => {
      });
    }
    /** @returns {{tex:WebGLTexture, ready:boolean, aspect:number, failed:boolean}} */
    get(url) {
      let e = this.cache.get(url);
      if (!e) {
        e = { tex: this.gl.createTexture(), ready: false, failed: false, aspect: 1, url };
        this.cache.set(url, e);
        this.queue.push(e);
        this._pump();
      }
      return e;
    }
    /** آپلود canvas (برای برچسب‌ها و نشان‌ها)؛ در صورت وجود، دوباره آپلود می‌شود */
    fromCanvas(key, canvas) {
      let e = this.cache.get(key);
      if (!e) {
        e = { tex: this.gl.createTexture(), ready: false, failed: false, aspect: 1, url: key };
        this.cache.set(key, e);
      }
      this._upload(e, canvas, canvas.width, canvas.height);
      return e;
    }
    _pump() {
      while (this.active < this.concurrency && this.queue.length) {
        const e = this.queue.shift();
        this.active++;
        this._load(e).catch(() => {
          e.failed = true;
        }).finally(() => {
          this.active--;
          this._pump();
        });
      }
    }
    async _load(e) {
      const isSvg = /\.svg(\?|$)/i.test(e.url) || /[?&]format=svg/i.test(e.url) || e.url.startsWith("data:image/svg");
      let source;
      let w;
      let h2;
      if (!isSvg && typeof createImageBitmap === "function") {
        const res = await fetch(e.url, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error("http " + res.status);
        const blob = await res.blob();
        let bmp = await createImageBitmap(blob, { premultiplyAlpha: "premultiply" });
        const big = Math.max(bmp.width, bmp.height);
        if (big > MAX_TEX) {
          const r = MAX_TEX / big;
          const small = await createImageBitmap(bmp, { resizeWidth: Math.round(bmp.width * r), resizeHeight: Math.round(bmp.height * r), resizeQuality: "high" });
          bmp.close && bmp.close();
          bmp = small;
        }
        source = bmp;
        w = bmp.width;
        h2 = bmp.height;
      } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.src = e.url;
        await img.decode();
        const nw = img.naturalWidth || 512;
        const nh = img.naturalHeight || 512;
        const r = Math.min(1, MAX_TEX / Math.max(nw, nh));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(nw * r));
        c.height = Math.max(1, Math.round(nh * r));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        source = c;
        w = c.width;
        h2 = c.height;
      }
      this._upload(e, source, w, h2);
      if (source.close) source.close();
      this.onLoad(e);
    }
    _upload(e, source, w, h2) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, e.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      e.aspect = w / h2;
      e.ready = true;
    }
    dispose() {
      this.cache.forEach((e) => this.gl.deleteTexture(e.tex));
      this.cache.clear();
      this.queue.length = 0;
    }
  }
  const cache$1 = /* @__PURE__ */ new Map();
  function nf(locale, opts) {
    const key = locale + JSON.stringify(opts);
    if (!cache$1.has(key)) {
      try {
        cache$1.set(key, new Intl.NumberFormat(locale, opts));
      } catch (e) {
        cache$1.set(key, new Intl.NumberFormat("en", opts));
      }
    }
    return cache$1.get(key);
  }
  function formatNumber(value, locale, opts = {}) {
    return nf(locale, opts).format(Number(value) || 0);
  }
  function formatPercent(value, locale) {
    return nf(locale, { style: "percent", maximumFractionDigits: 0 }).format((Number(value) || 0) / 100);
  }
  function formatPrice(amount, currency, locale) {
    const decimals = Number(currency.decimals) || 0;
    const n = formatNumber(amount, locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const s = currency.symbol || "";
    switch (currency.position) {
      case "left":
        return s + n;
      case "left_space":
        return `${s} ${n}`;
      case "right":
        return n + s;
      default:
        return `${n} ${s}`;
    }
  }
  function tpl(str, vars = {}) {
    return String(str).replace(/\{(\w+)\}/g, (m, k) => k in vars ? vars[k] : m);
  }
  function roundRect(ctx, x, y, w, h2, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h2, r);
    ctx.arcTo(x + w, y + h2, x, y + h2, r);
    ctx.arcTo(x, y + h2, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function heartPath(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.9);
    ctx.bezierCurveTo(cx - s * 1.8, cy - s * 0.2, cx - s * 0.9, cy - s * 1.3, cx, cy - s * 0.45);
    ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.3, cx + s * 1.8, cy - s * 0.2, cx, cy + s * 0.9);
    ctx.closePath();
  }
  const BADGE_PX = 384;
  const HEART = { cx: 0.885, cy: 0.115, r: 0.075 };
  class LabelPainter {
    constructor(cfg) {
      this.cfg = cfg;
      this.fontFamily = 'system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif';
    }
    setFont(f) {
      if (f) this.fontFamily = f;
    }
    /** برچسب عنوان + قیمت زیر کاشی */
    label(product, theme) {
      const { cfg } = this;
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 150;
      const ctx = c.getContext("2d");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.direction = cfg.rtl ? "rtl" : "ltr";
      ctx.fillStyle = theme.text;
      ctx.font = `600 34px ${this.fontFamily}`;
      let title = product.title || "";
      while (ctx.measureText(title).width > 480 && title.length > 4) title = title.slice(0, -2);
      if (title !== product.title) title = title.trim() + "…";
      ctx.fillText(title, 256, 42);
      const priceStr = this.priceText(product);
      ctx.font = `700 30px ${this.fontFamily}`;
      ctx.fillStyle = theme.price;
      if (product.on_sale && product.regular_price) {
        const reg = formatPrice(product.regular_price, cfg.currency, cfg.locale);
        ctx.font = `400 24px ${this.fontFamily}`;
        const wReg = ctx.measureText(reg).width;
        ctx.font = `700 30px ${this.fontFamily}`;
        const wSale = ctx.measureText(priceStr).width;
        const total = wReg + wSale + 16;
        const start = 256 - total / 2;
        ctx.textAlign = "left";
        ctx.fillText(priceStr, start + (cfg.rtl ? wReg + 16 : 0), 100);
        ctx.font = `400 24px ${this.fontFamily}`;
        ctx.fillStyle = theme.muted;
        const rx = start + (cfg.rtl ? 0 : wSale + 16);
        ctx.fillText(reg, rx, 100);
        ctx.fillRect(rx, 100, wReg, 2);
      } else {
        ctx.fillText(priceStr, 256, 100);
      }
      return c;
    }
    priceText(product) {
      const { cfg } = this;
      if (product.type === "variable" && product.price_min !== void 0 && product.price_max !== void 0 && product.price_min !== product.price_max) {
        return `${formatPrice(product.price_min, cfg.currency, cfg.locale)} – ${formatPrice(product.price_max, cfg.currency, cfg.locale)}`;
      }
      return formatPrice(product.price || 0, cfg.currency, cfg.locale);
    }
    /** نشان‌ها (حراج/جدید/ناموجود) + قلب علاقه‌مندی + تیک انتخاب */
    badge(product, { wished, selected, badges = true, wishlist = true }, theme) {
      const { cfg } = this;
      const S = BADGE_PX;
      const c = document.createElement("canvas");
      c.width = S;
      c.height = S;
      const ctx = c.getContext("2d");
      const rtl = cfg.rtl;
      ctx.direction = rtl ? "rtl" : "ltr";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const s = cfg.strings;
      if (badges) {
        const pills = [];
        if (!product.in_stock) pills.push({ t: s.outOfStock, bg: "#6b7280", fg: "#fff" });
        if (product.on_sale && product.discount > 0) pills.push({ t: `−${formatPercent(product.discount, cfg.locale)}`, bg: "#e11d48", fg: "#fff" });
        if (product.is_new) pills.push({ t: s.new, bg: "#16a34a", fg: "#fff" });
        let y = 14;
        ctx.font = `700 24px ${this.fontFamily}`;
        pills.forEach((p) => {
          const w = Math.ceil(ctx.measureText(p.t).width) + 28;
          const x = rtl ? S - 14 - w : 14;
          ctx.fillStyle = p.bg;
          roundRect(ctx, x, y, w, 38, 19);
          ctx.fill();
          ctx.fillStyle = p.fg;
          ctx.fillText(p.t, x + w / 2, y + 20);
          y += 46;
        });
      }
      if (wishlist) {
        const cx = (rtl ? 1 - HEART.cx : HEART.cx) * S;
        const cy = HEART.cy * S;
        ctx.fillStyle = theme.heartBg;
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.fill();
        heartPath(ctx, cx, cy + 1, 11);
        if (wished) {
          ctx.fillStyle = "#e11d48";
          ctx.fill();
        } else {
          ctx.strokeStyle = theme.heartStroke;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
      if (selected) {
        const cx = S - 44;
        const cy = S - 44;
        ctx.fillStyle = "#2563eb";
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy);
        ctx.lineTo(cx - 3, cy + 10);
        ctx.lineTo(cx + 13, cy - 10);
        ctx.stroke();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 6;
        roundRect(ctx, 4, 4, S - 8, S - 8, 28);
        ctx.stroke();
      }
      return c;
    }
    /** آیا این محصول اصلاً به بافت نشان نیاز دارد؟ */
    static needsBadge(product, flags) {
      return !!(flags.wishlist || flags.selected || flags.badges && (!product.in_stock || product.on_sale || product.is_new));
    }
  }
  class Tile {
    /**
     * @param {Object} product
     * @param {number} index
     * @param {{cfg:Object, app:Object, textures:Object, painter:LabelPainter}} env
     */
    constructor(product, index, env) {
      this.product = product;
      this.id = product.id;
      this.index = index;
      this.env = env;
      this.base = { x: 0, y: 0 };
      this.pos = { x: 0, y: 0 };
      this.row = 0;
      this.col = 0;
      this.normY = 0;
      this.gridVisible = false;
      this.matches = true;
      this.phase = "hidden";
      this.startAt = 0;
      this.opacity = 0;
      this.scale = 1;
      this.focusZ = 0;
      this.curveZ = 0;
      this.transZ = 0;
      this.transY = 0;
      this.filterOpacity = 1;
      this.filterScale = 1;
      this.activeAmt = 0;
      this.labelAlpha = 0;
      this.wasDimmed = false;
      this.culled = false;
      this.entry = null;
      this.imageUrl = product.image;
      this.tint = hexToRgb(product.primary_color_hex) || [0.62, 0.62, 0.66];
      this.labelEntry = null;
      this.labelVersion = -1;
      this.badgeEntry = null;
      this.badgeKey = "";
      this.wished = false;
      this.selected = false;
    }
    get image() {
      if (!this.entry) this.entry = this.env.textures.get(this.imageUrl);
      return this.entry;
    }
    /** تغییر تصویر کاشی (همگام با گالری) */
    setImage(url) {
      this.imageUrl = url || this.product.image;
      this.entry = this.env.textures.get(this.imageUrl);
    }
    /** نمایش با ورود (stagger) */
    show(delaySec, now) {
      if (this.phase === "hidden") {
        this.transZ = this.env.cfg.enterStartZ;
        this.transY = this.normY * this.env.cfg.enterSpreadY;
        this.opacity = this.env.cfg.enterStartOpacity;
        this.pos.x = this.base.x;
        this.pos.y = this.base.y;
        this.filterOpacity = this.matches ? 1 : 0;
      }
      this.gridVisible = true;
      this.phase = "entering";
      this.startAt = now + delaySec;
    }
    hide(delaySec, now) {
      if (this.phase === "hidden") return;
      this.gridVisible = false;
      this.phase = "exiting";
      this.startAt = now + delaySec;
    }
    get pickable() {
      return this.gridVisible && this.matches && this.opacity > 0.25 && !this.culled;
    }
    /** وضعیت برای جلوگیری از محاسبه‌ی بیهوده */
    get sleeping() {
      return this.phase === "hidden";
    }
    update(dt, now, ctx) {
      if (this.phase === "hidden") return false;
      const cfg = this.env.cfg;
      const cam = ctx.cam;
      this.pos.x = damp(this.pos.x, this.base.x, 0.2, dt);
      this.pos.y = damp(this.pos.y, this.base.y, 0.2, dt);
      this.filterOpacity = damp(this.filterOpacity, this.matches ? 1 : 0, cfg.filterOpacityDamp, dt);
      this.filterScale = damp(this.filterScale, this.matches ? 1 : cfg.filterScaleTarget, cfg.filterOpacityDamp, dt);
      const go = now >= this.startAt;
      let tOp;
      let tZ;
      let tY;
      if (this.gridVisible) {
        tOp = go ? 1 : cfg.enterStartOpacity;
        tZ = go ? 0 : cfg.enterStartZ;
        tY = go ? 0 : this.normY * cfg.enterSpreadY;
      } else if (go) {
        tOp = 0;
        tZ = cfg.exitEndZ;
        tY = this.normY * cfg.exitSpreadY;
      } else {
        tOp = 1;
        tZ = 0;
        tY = 0;
      }
      const dx = this.pos.x - cam.x;
      const dy = this.pos.y - cam.y;
      const cull = cfg.cullDistance * (cam.zoom / 8) * ctx.cullScale;
      this.culled = Math.abs(dx) > cull || Math.abs(dy) > cull;
      if (this.culled && !this.gridVisible) {
        this.opacity = 0;
        this.phase = "hidden";
        return false;
      }
      const tCurve = -(dx * dx + dy * dy) * cfg.curvatureStrength * 0.1;
      const focusMode = ctx.activeId !== null;
      const isActive = ctx.activeId === this.id;
      const hovered = ctx.hoverId === this.id && !ctx.dragging;
      let iScale = 1;
      let iOpacity = 1;
      let tFocusZ = 0;
      if (focusMode) {
        if (isActive) {
          iScale = cfg.focusScale;
          tFocusZ = 2;
        } else {
          iScale = cfg.dimScale;
          iOpacity = cfg.dimOpacity;
          tFocusZ = -0.5;
          this.wasDimmed = true;
        }
      } else if (hovered) {
        iScale = 1.05;
        tFocusZ = 0.5;
      }
      const finalOpacity = iOpacity * this.filterOpacity;
      this.scale = damp(this.scale, iScale * this.filterScale, 0.15, dt);
      this.focusZ = damp(this.focusZ, tFocusZ, 0.2, dt);
      this.curveZ = damp(this.curveZ, tCurve, 0.2, dt);
      this.transZ = damp(this.transZ, tZ, cfg.transitionZDamp, dt);
      this.transY = damp(this.transY, tY, cfg.transitionYDamp, dt);
      this.activeAmt = damp(this.activeAmt, isActive ? 1 : 0, isActive ? 0.6 : 0.15, dt);
      const target = finalOpacity * tOp;
      let od;
      if (!this.matches || this.filterOpacity < 0.99) od = cfg.filterOpacityDamp;
      else if (focusMode || this.wasDimmed) od = 0.15;
      else if (this.gridVisible) od = cfg.enterOpacityDamp;
      else od = cfg.exitOpacityDamp;
      this.opacity = damp(this.opacity, target, od, dt);
      if (!focusMode && this.opacity > 0.95) this.wasDimmed = false;
      let tLabel = 0;
      if (this.gridVisible && this.matches) tLabel = focusMode ? isActive ? 1 : 0 : cam.zoom < cfg.labelZoomMax ? 1 : 0;
      this.labelAlpha = damp(this.labelAlpha, tLabel, 0.2, dt);
      if (!this.gridVisible && go && this.opacity < 4e-3) {
        this.opacity = 0;
        this.phase = "hidden";
      } else if (this.gridVisible && go && this.phase === "entering" && this.opacity > 0.98) {
        this.phase = "visible";
      }
      return true;
    }
    /** ابعاد تصویر داخل جعبه‌ی کاشی با حفظ نسبت */
    dims() {
      const max = this.env.cfg.itemSize * 0.9;
      const e = this.entry;
      const a = e && e.ready ? e.aspect : 1;
      return a > 1 ? { w: max, h: max / a } : { w: max * a, h: max };
    }
    ensureTextures(version2, theme, flags) {
      const painter = this.env.painter;
      if (this.labelVersion !== version2) {
        this.labelEntry = this.env.textures.fromCanvas("label:" + this.id, painter.label(this.product, theme));
        this.badgeKey = "";
        this.labelVersion = version2;
      }
      const key = `${this.wished ? 1 : 0}${this.selected ? 1 : 0}${this.product.in_stock ? 1 : 0}`;
      if (key !== this.badgeKey) {
        this.badgeKey = key;
        const f = { wished: this.wished, selected: this.selected, badges: flags.badges, wishlist: flags.wishlist };
        this.badgeEntry = LabelPainter.needsBadge(this.product, { ...f }) ? this.env.textures.fromCanvas("badge:" + this.id, painter.badge(this.product, f, theme)) : null;
      }
    }
    draw(r, version2, theme, flags) {
      if (this.opacity < 4e-3 || this.culled || this.phase === "hidden") return;
      this.ensureTextures(version2, theme, flags);
      const cfg = this.env.cfg;
      const s = this.scale;
      const z = this.curveZ + this.focusZ + this.transZ;
      const cx = this.pos.x;
      const cy = this.pos.y + this.transY;
      const d = this.dims();
      r.drawQuad({ entry: this.image, cx, cy, z, w: d.w * s, h: d.h * s, opacity: this.opacity, active: this.activeAmt, tint: this.tint });
      if (this.badgeEntry) {
        r.drawQuad({ entry: this.badgeEntry, cx, cy, z, w: cfg.itemSize * s, h: cfg.itemSize * s, opacity: this.opacity });
      }
      const la = this.labelAlpha * this.opacity;
      if (la > 0.01 && this.labelEntry) {
        const lw = cfg.itemSize * 1.15 * s;
        r.drawQuad({ entry: this.labelEntry, cx, cy: cy - (cfg.itemSize / 2 + 0.3) * s, z, w: lw, h: lw * 150 / 512, opacity: la });
      }
    }
    /**
     * تست برخورد با نقطه‌ی صفحه
     * @returns {{part:'body'|'heart'}|null}
     */
    hit(px, py, cam) {
      const z = this.curveZ + this.focusZ + this.transZ;
      const p = cam.unproject(px, py, z);
      const size = this.env.cfg.itemSize * this.scale;
      const dx = p.x - this.pos.x;
      const dy = p.y - (this.pos.y + this.transY);
      const half = size / 2;
      if (Math.abs(dx) > half || Math.abs(dy) > half) return null;
      const u = dx / size;
      const v = dy / size;
      const rtl = this.env.app.rtl;
      const hu = (rtl ? -1 : 1) * (HEART.cx - 0.5);
      const hv = 0.5 - HEART.cy;
      if (Math.hypot(u - hu, v - hv) <= HEART.r * 1.5) return { part: "heart" };
      return { part: "body" };
    }
    /** مستطیل صفحه‌ای کاشی (برای دسترس‌پذیری و Quick Actions) */
    screenRect(cam) {
      const z = this.curveZ + this.focusZ + this.transZ;
      const c = cam.project(this.pos.x, this.pos.y + this.transY, z);
      const size = this.env.cfg.itemSize * this.scale * c.scale;
      return { x: c.x, y: c.y, size, left: c.x - size / 2, top: c.y - size / 2 };
    }
  }
  function computeLayout(count, cfg, rtl = false) {
    const cols = Math.max(1, Math.min(cfg.gridCols, count || 1));
    const rows = Math.max(1, Math.ceil(count / cols));
    const pitchX = cfg.itemSize + cfg.gap;
    const pitchY = cfg.itemSize + cfg.gap + 0.5;
    const positions = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const inRow = row === rows - 1 ? count - row * cols : cols;
      let x = (col - (inRow - 1) / 2) * pitchX;
      if (rtl) x = -x;
      const y = -(row - (rows - 1) / 2) * pitchY;
      positions.push({ x, y, row, col });
    }
    const halfW = (cols - 1) * pitchX / 2;
    const halfH = (rows - 1) * pitchY / 2;
    return {
      positions,
      cols,
      rows,
      pitchX,
      pitchY,
      bounds: { minX: -halfW, maxX: halfW, minY: -halfH, maxY: halfH }
    };
  }
  class Quadtree {
    /**
     * @param {{x:number,y:number,w:number,h:number}} bounds مرکز و نیم‌اندازه‌ها
     */
    constructor(bounds, depth = 0, capacity = 8, maxDepth = 6) {
      this.b = bounds;
      this.depth = depth;
      this.capacity = capacity;
      this.maxDepth = maxDepth;
      this.items = [];
      this.kids = null;
    }
    static fromItems(items, pad = 5) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      items.forEach((i) => {
        minX = Math.min(minX, i.x);
        maxX = Math.max(maxX, i.x);
        minY = Math.min(minY, i.y);
        maxY = Math.max(maxY, i.y);
      });
      if (!items.length) {
        minX = minY = -1;
        maxX = maxY = 1;
      }
      const qt = new Quadtree({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, w: (maxX - minX) / 2 + pad, h: (maxY - minY) / 2 + pad });
      items.forEach((i) => qt.insert(i));
      return qt;
    }
    insert(item) {
      if (this.kids) return this.kids[this._idx(item.x, item.y)].insert(item);
      this.items.push(item);
      if (this.items.length > this.capacity && this.depth < this.maxDepth) this._split();
      return void 0;
    }
    _idx(x, y) {
      return (x >= this.b.x ? 1 : 0) + (y >= this.b.y ? 2 : 0);
    }
    _split() {
      const { x, y, w, h: h2 } = this.b;
      const hw = w / 2;
      const hh = h2 / 2;
      this.kids = [
        new Quadtree({ x: x - hw, y: y - hh, w: hw, h: hh }, this.depth + 1, this.capacity, this.maxDepth),
        new Quadtree({ x: x + hw, y: y - hh, w: hw, h: hh }, this.depth + 1, this.capacity, this.maxDepth),
        new Quadtree({ x: x - hw, y: y + hh, w: hw, h: hh }, this.depth + 1, this.capacity, this.maxDepth),
        new Quadtree({ x: x + hw, y: y + hh, w: hw, h: hh }, this.depth + 1, this.capacity, this.maxDepth)
      ];
      const old = this.items;
      this.items = [];
      old.forEach((i) => this.kids[this._idx(i.x, i.y)].insert(i));
    }
    /** همه‌ی آیتم‌های داخل مربع به مرکز (x,y) و شعاع r */
    query(x, y, r, out = []) {
      const { b } = this;
      if (x + r < b.x - b.w || x - r > b.x + b.w || y + r < b.y - b.h || y - r > b.y + b.h) return out;
      if (this.kids) {
        this.kids.forEach((k) => k.query(x, y, r, out));
      } else {
        for (const i of this.items) {
          if (Math.abs(i.x - x) <= r && Math.abs(i.y - y) <= r) out.push(i);
        }
      }
      return out;
    }
  }
  function valuesFor(product, key) {
    if (key === "category") return (product.categories || []).map(String);
    const v = product.attributes && product.attributes[key];
    return Array.isArray(v) ? v.map(String) : [];
  }
  function matchesFilters(product, selected) {
    for (const key of Object.keys(selected || {})) {
      const wanted = selected[key];
      if (!wanted || !wanted.length) continue;
      const have = valuesFor(product, key);
      if (!wanted.some((w) => have.includes(String(w)))) return false;
    }
    return true;
  }
  function hasActiveFilters(selected) {
    return Object.values(selected || {}).some((v) => v && v.length);
  }
  const SORTERS = {
    default: null,
    new: (a, b) => String(b.date || "").localeCompare(String(a.date || "")),
    "price-asc": (a, b) => (a.price || 0) - (b.price || 0),
    "price-desc": (a, b) => (b.price || 0) - (a.price || 0),
    popular: (a, b) => (b.popularity || 0) - (a.popularity || 0)
  };
  function sortList(list, key, getProduct = (x) => x) {
    const fn = SORTERS[key];
    if (!fn) return list.slice();
    return list.map((item, i) => ({ item, i })).sort((a, b) => fn(getProduct(a.item), getProduct(b.item)) || a.i - b.i).map((x) => x.item);
  }
  function countOptions(products, key, value) {
    return products.reduce((n, p) => n + (valuesFor(p, key).includes(String(value)) ? 1 : 0), 0);
  }
  const THEMES = {
    light: { text: "#111111", price: "#111111", muted: "#6b7280", heartBg: "rgba(255,255,255,0.92)", heartStroke: "#111111" },
    dark: { text: "#f4f4f5", price: "#f4f4f5", muted: "#a1a1aa", heartBg: "rgba(30,30,34,0.92)", heartStroke: "#f4f4f5" }
  };
  class Grid {
    /**
     * @param {{cfg:Object, app:Object, store:Object, events:Object, textures:Object, camera:Object, resolveCollection:Function}} deps
     */
    constructor(deps) {
      this.cfg = deps.cfg;
      this.app = deps.app;
      this.store = deps.store;
      this.events = deps.events;
      this.camera = deps.camera;
      this.resolveCollection = deps.resolveCollection;
      this.painter = new LabelPainter(deps.app);
      this.env = { cfg: this.cfg, app: this.app, textures: deps.textures, painter: this.painter };
      this.tiles = [];
      this.byId = /* @__PURE__ */ new Map();
      this.list = [];
      this.layout = null;
      this.qtree = null;
      this.collection = "all";
      this.version = 0;
      this.theme = THEMES.light;
      this.quality = 2;
      this.hoverId = null;
      this.activeId = null;
      this.dragging = false;
      this.now = 0;
    }
    setProducts(products) {
      this.tiles = products.map((p, i) => new Tile(p, i, this.env));
      this.byId = new Map(this.tiles.map((t) => [t.id, t]));
    }
    addProduct(product) {
      if (this.byId.has(product.id)) return this.byId.get(product.id);
      const t = new Tile(product, this.tiles.length, this.env);
      this.tiles.push(t);
      this.byId.set(t.id, t);
      return t;
    }
    setTheme(dark) {
      this.theme = dark ? THEMES.dark : THEMES.light;
      this.version++;
    }
    setFont(f) {
      this.painter.setFont(f);
      this.version++;
    }
    setWishlist(ids) {
      const set = new Set(ids);
      this.tiles.forEach((t) => {
        t.wished = set.has(t.id);
      });
    }
    setSelection(ids) {
      const set = new Set(ids);
      this.tiles.forEach((t) => {
        t.selected = set.has(t.id);
      });
    }
    /** پیمایش برای نمایش مجدد برچسب‌ها (مثلاً بعد از تغییر موجودی) */
    invalidateLabels() {
      this.version++;
    }
    /**
     * محاسبه‌ی مجدد مجموعه‌ی نمایش‌داده‌شده و چیدمان
     * @param {{reset?:boolean}} opts reset=true هنگام تعویض کلکسیون (stagger)
     */
    refresh(opts = {}) {
      const { reset = false } = opts;
      const now = this.now;
      const set = this.resolveCollection(this.collection);
      const filter = this.store.get("filter") || { selected: {} };
      const sort = this.store.get("sort") || "default";
      const inSet = this.tiles.filter((t) => !set || set.has(t.id));
      inSet.forEach((t) => {
        t.matches = matchesFilters(t.product, filter.selected);
      });
      const matched = sortList(inSet.filter((t) => t.matches), sort, (t) => t.product);
      const lay = computeLayout(matched.length, this.cfg, this.app.rtl);
      this.layout = lay;
      this.list = matched;
      const gridH = lay.rows * lay.pitchY;
      matched.forEach((t, i) => {
        const p = lay.positions[i];
        t.base = { x: p.x, y: p.y };
        t.row = p.row;
        t.col = p.col;
        t.normY = gridH > 0 ? p.y / (gridH / 2) : 0;
      });
      this.camera.setBounds(lay.bounds);
      this.qtree = Quadtree.fromItems(matched.map((t) => ({ x: t.base.x, y: t.base.y, tile: t })));
      const instant = isReducedMotion();
      const ids = new Set(inSet.map((t) => t.id));
      let rank = 0;
      const total = Math.max(1, inSet.length);
      this.tiles.forEach((t) => {
        if (ids.has(t.id)) {
          if (!t.matches && t.phase === "hidden") t.base = { x: 0, y: 0 };
          if (!t.gridVisible) {
            const delay = reset && !instant ? rank / total * (this.cfg.enterStaggerDelay / 1e3) : 0;
            t.show(delay, now);
          }
          rank++;
        } else if (t.gridVisible) {
          const delay = reset && !instant ? t.index / this.tiles.length * (this.cfg.exitStaggerDelay / 1e3) : 0;
          t.hide(delay, now);
        }
      });
      this.events.emit("grid:layout", { count: matched.length, total: inSet.length });
    }
    setCollection(slug, reset = true) {
      this.collection = slug;
      this.refresh({ reset });
    }
    update(dt, now) {
      this.now = now;
      const ctx = {
        cam: this.camera,
        activeId: this.activeId,
        hoverId: this.hoverId,
        dragging: this.dragging,
        cullScale: this.quality === 0 ? 0.7 : 1
      };
      for (let i = 0; i < this.tiles.length; i++) this.tiles[i].update(dt, now, ctx);
    }
    draw(r, time) {
      const cam = this.camera;
      const [fx, fy] = cam.focal();
      r.beginTiles({ camX: cam.x, camY: cam.y, camZ: cam.zoom, focalX: fx, focalY: fy, fogNear: this.cfg.fogNear, fogFar: this.cfg.fogFar, time });
      const flags = { badges: this.app.features.badges, wishlist: this.app.features.wishlist };
      let active = null;
      for (let i = 0; i < this.tiles.length; i++) {
        const t = this.tiles[i];
        if (t.id === this.activeId) active = t;
        else t.draw(r, this.version, this.theme, flags);
      }
      if (active) active.draw(r, this.version, this.theme, flags);
    }
    /**
     * پیدا کردن کاشی زیر نشانگر با کوآدتری
     * @returns {{tile:Tile, part:string}|null}
     */
    pickAt(px, py) {
      if (!this.qtree) return null;
      const w = this.camera.unproject(px, py, 0);
      const cand = this.qtree.query(w.x, w.y, this.cfg.itemSize * 2.4);
      let best = null;
      let bestZ = -Infinity;
      for (const c of cand) {
        const t = c.tile;
        if (!t.pickable) continue;
        if (this.activeId !== null && t.id !== this.activeId) continue;
        const hit = t.hit(px, py, this.camera);
        if (!hit) continue;
        const z = t.focusZ + t.curveZ;
        if (z > bestZ) {
          bestZ = z;
          best = { tile: t, part: hit.part };
        }
      }
      if (!best && this.activeId !== null) {
        return null;
      }
      return best;
    }
    /** کاشی‌هایی که الان داخل نما هستند (برای دسترس‌پذیری) */
    visibleTiles() {
      const cam = this.camera;
      const out = [];
      for (const t of this.list) {
        if (!t.gridVisible || t.opacity < 0.2) continue;
        const r = t.screenRect(cam);
        if (r.x < -r.size || r.x > cam.width + r.size || r.y < -r.size || r.y > cam.height + r.size) continue;
        out.push(t);
      }
      return out;
    }
    getTile(id) {
      return this.byId.get(id) || null;
    }
  }
  class Scene {
    /**
     * @param {{container:HTMLElement, config:Object, store:Object, events:Object, actions:Object, resolveCollection:Function}} deps
     */
    constructor(deps) {
      this.container = deps.container;
      this.config = deps.config;
      this.cfg = deps.config.grid;
      this.store = deps.store;
      this.events = deps.events;
      this.actions = deps.actions;
      this.resolveCollection = deps.resolveCollection;
      this.pointers = /* @__PURE__ */ new Map();
      this.clock = 0;
      this.last = 0;
      this.raf = 0;
      this.dark = false;
      this.engaged = false;
      this.moved = false;
      this.visible = true;
      this.supported = false;
      this.interactive = false;
      this.lastTap = null;
    }
    mount() {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "sf3d-canvas";
      this.canvas.setAttribute("aria-hidden", "true");
      this.container.appendChild(this.canvas);
      this._buildTouchToggle();
      this.renderer = new Renderer(this.canvas, {
        onQuality: (q) => {
          this.grid && (this.grid.quality = q);
          this.events.emit("quality", q);
        }
      });
      this.supported = this.renderer.supported;
      this.camera = new Camera(this.cfg);
      if (!this.supported) return false;
      this.textures = new TextureStore(this.renderer.gl, {});
      this.grid = new Grid({
        cfg: this.cfg,
        app: this.config,
        store: this.store,
        events: this.events,
        textures: this.textures,
        camera: this.camera,
        resolveCollection: this.resolveCollection
      });
      this.grid.setFont(getComputedStyle(this.container).fontFamily);
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.container);
      this.resize();
      this._bind();
      this.io = new IntersectionObserver((entries) => {
        this.visible = entries[0].isIntersecting;
        if (!this.visible) this.setInteractive(false);
        this.visible ? this.start() : this.stop();
      });
      this.io.observe(this.container);
      this._unsubs = [
        this.store.subscribe("activeProduct", (id) => this.onActive(id))
      ];
      return true;
    }
    /** E04: جابه‌جایی حالت تعامل. false = اسکرول صفحه (pan-y)، true = کنترل کامل نقشه (none) */
    setInteractive(on) {
      on = !!on;
      if (this.interactive === on) return;
      this.interactive = on;
      this.pointers.clear();
      this.pinch = 0;
      clearTimeout(this.longTimer);
      this.container.classList.toggle("is-interactive", on);
      const L = this._tl;
      if (this._touchBtn) {
        this._touchBtn.setAttribute("aria-pressed", on ? "true" : "false");
        this._touchBtn.textContent = on ? L.off : L.on;
      }
      if (this._touchHint) {
        this._touchHint.textContent = on ? L.hintOn : L.hintOff;
        clearTimeout(this._hintTimer);
        this._hintTimer = setTimeout(() => {
          this._touchHint.textContent = "";
        }, 3500);
      }
      this.events.emit("touchmode", on);
    }
    /** E04: دکمه‌ی جایگزین ژست دوبار ضربه (WCAG 2.5.1) + ناحیه‌ی اعلان وضعیت */
    _buildTouchToggle() {
      const t = this.config && this.config.i18n || {};
      this._tl = {
        on: t.touchOn || "فعال‌سازی تعامل با نقشه",
        off: t.touchOff || "خروج از تعامل (اسکرول صفحه)",
        hintOn: t.touchHintOn || "حالت تعامل فعال شد. برای اسکرول صفحه دوبار روی فضای خالی ضربه بزنید.",
        hintOff: t.touchHintOff || "اسکرول صفحه فعال شد."
      };
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sf3d-touchtoggle";
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = this._tl.on;
      btn.addEventListener("click", () => this.setInteractive(!this.interactive));
      const hint = document.createElement("div");
      hint.className = "sf3d-touchhint";
      hint.setAttribute("role", "status");
      hint.setAttribute("aria-live", "polite");
      this.container.append(btn, hint);
      this._touchBtn = btn;
      this._touchHint = hint;
      this.container.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.interactive) this.setInteractive(false);
      });
    }
    /** E04: دوبار ضربه روی فضای خالی (نه روی کاشی) → true یعنی حالت عوض شد و کلیک باید نادیده گرفته شود */
    _isDoubleTap(p) {
      const now = performance.now();
      const prev = this.lastTap;
      if (this.grid.pickAt(p.x, p.y)) {
        this.lastTap = null;
        return false;
      }
      if (prev && now - prev.t < 320 && Math.hypot(p.x - prev.x, p.y - prev.y) < 36) {
        this.lastTap = null;
        this.setInteractive(!this.interactive);
        return true;
      }
      this.lastTap = { t: now, x: p.x, y: p.y };
      return false;
    }
    resize() {
      const r = this.container.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h2 = Math.max(1, Math.round(r.height));
      this.renderer.resize(w, h2);
      this.camera.resize(w, h2);
      this.events.emit("resize", { w, h: h2 });
    }
    setDark(v) {
      this.dark = !!v;
      this.grid && this.grid.setTheme(this.dark);
    }
    start() {
      if (this.raf || !this.supported) return;
      this.last = performance.now();
      const loop = (t) => {
        this.raf = requestAnimationFrame(loop);
        this.frame(t);
      };
      this.raf = requestAnimationFrame(loop);
    }
    stop() {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    frame(t) {
      const dt = Math.max(0, Math.min((t - this.last) / 1e3, 0.1));
      this.last = t;
      this.clock += dt;
      const reduced2 = isReducedMotion();
      const time = reduced2 ? 0 : this.clock;
      const cam = this.camera;
      const cfg = this.cfg;
      cam.update(dt);
      this.store.set("zoom", Math.round(cam.zoom * 100) / 100);
      this.grid.update(dt, this.clock);
      const r = this.renderer;
      r.begin();
      r.drawBackground({
        color: this.dark ? "#52525b" : cfg.bgColor,
        opacity: cfg.bgOpacity,
        scale: cfg.bgScale,
        thick: cfg.bgLineThickness,
        offsetX: cam.x * 0.04 + (reduced2 ? 0 : time * cfg.bgSpeed * 0.2),
        offsetY: cam.y * 0.04 + (reduced2 ? 0 : time * cfg.bgSpeed * 0.1)
      });
      this.grid.draw(r, time % 5);
      r.trackFrame(dt);
      this.events.emit("frame", cam);
    }
    /** مرکز کردن دوربین روی کاشی با جبران فضای کارت */
    onActive(id) {
      this.grid.activeId = id;
      if (id === null) return;
      const tile = this.grid.getTile(id);
      if (!tile) return;
      const cfg = this.cfg;
      const zoom = this.camera.tz > cfg.zoomIn + 2 ? cfg.zoomIn : this.camera.tz;
      this.focusOn(tile.base.x, tile.base.y, zoom);
    }
    focusOn(x, y, zoom) {
      const cam = this.camera;
      const upp = cam.unitsPerPixel(zoom);
      let tx = x;
      let ty = y;
      if (cam.width >= 860) {
        const endIsRight = this.config.rtl ? this.config.cardPosition === "start" : this.config.cardPosition !== "start";
        tx = x + (endIsRight ? 1 : -1) * 200 * upp;
      } else {
        ty = y - cam.height * 0.22 * upp;
      }
      cam.setTarget(tx, ty, zoom);
    }
    /** حرکت دوربین فقط اگر نقطه از نما بیرون است (ناوبری با کیبورد) */
    ensureInView(tile) {
      const r = tile.screenRect(this.camera);
      const m = r.size;
      const cam = this.camera;
      if (r.x < m || r.x > cam.width - m || r.y < m || r.y > cam.height - m) {
        cam.setTarget(tile.base.x, tile.base.y, cam.tz);
      }
    }
    panTo(x, y) {
      this.camera.setTarget(x, y, this.camera.tz);
    }
    _pos(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    _bind() {
      const c = this.canvas;
      const cfg = this.cfg;
      this._down = (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (e.pointerType === "touch" && !this.interactive) {
          this.pointers.clear();
          this.pinch = 0;
        }
        try {
          c.setPointerCapture(e.pointerId);
        } catch (err) {
        }
        const p = this._pos(e);
        this.pointers.set(e.pointerId, { ...p });
        this.engaged = true;
        if (this.pointers.size === 1) {
          this.start0 = { ...p };
          this.moved = false;
          this.longFired = false;
          clearTimeout(this.longTimer);
          this.longTimer = setTimeout(() => {
            if (!this.moved && this.pointers.size === 1) {
              const hit = this.grid.pickAt(p.x, p.y);
              if (hit) {
                this.longFired = true;
                this.events.emit("tile:longpress", hit.tile);
              }
            }
          }, 550);
        } else {
          this.moved = true;
          const pts = [...this.pointers.values()];
          this.pinch = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        }
      };
      this._move = (e) => {
        const p = this._pos(e);
        const prev = this.pointers.get(e.pointerId);
        if (!prev) {
          if (e.pointerType === "mouse") this._hover(p);
          return;
        }
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        prev.x = p.x;
        prev.y = p.y;
        if (this.pointers.size >= 2) {
          const pts = [...this.pointers.values()];
          const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          if (this.pinch > 0 && d > 0) this.camera.zoomBy(this.pinch / d, cfg.zoomIn, cfg.zoomOut * 1.15);
          this.pinch = d;
          return;
        }
        if (!this.moved && Math.hypot(p.x - this.start0.x, p.y - this.start0.y) > cfg.clickThreshold) {
          this.moved = true;
          clearTimeout(this.longTimer);
          this.grid.dragging = true;
          this.container.classList.add("is-dragging");
        }
        if (this.moved) this.camera.panByPixels(dx, dy);
      };
      this._up = (e) => {
        if (!this.pointers.has(e.pointerId)) return;
        const p = this._pos(e);
        const wasSingle = this.pointers.size === 1;
        this.pointers.delete(e.pointerId);
        clearTimeout(this.longTimer);
        if (wasSingle) {
          if (!this.moved && !this.longFired && e.type === "pointerup") {
            if (!(e.pointerType === "touch" && this._isDoubleTap(p))) this._click(p, e);
          }
          if (this.moved) this.camera.release();
          this.grid.dragging = false;
          this.container.classList.remove("is-dragging");
        }
        if (!this.pointers.size) this.pinch = 0;
      };
      this._leave = () => {
        if (this.pointers.size === 0) this._setHover(null);
      };
      this._wheel = (e) => {
        if (!(this.engaged || e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        this.camera.zoomBy(Math.exp(e.deltaY * 12e-4), cfg.zoomIn, cfg.zoomOut * 1.15);
      };
      this._outside = (e) => {
        if (!this.container.contains(e.target)) this.engaged = false;
      };
      c.addEventListener("pointerdown", this._down);
      c.addEventListener("pointermove", this._move);
      c.addEventListener("pointerup", this._up);
      c.addEventListener("pointercancel", this._up);
      c.addEventListener("pointerleave", this._leave);
      c.addEventListener("wheel", this._wheel, { passive: false });
      c.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        this.events.emit("error", new Error("webgl context lost"));
      });
      document.addEventListener("pointerdown", this._outside);
    }
    _setHover(id) {
      if (this.grid.hoverId === id) return;
      this.grid.hoverId = id;
      this.store.set("hover", id);
      this.canvas.style.cursor = id !== null ? "pointer" : "";
    }
    _hover(p) {
      const hit = this.grid.pickAt(p.x, p.y);
      this._setHover(hit ? hit.tile.id : null);
    }
    _click(p, e) {
      const hit = this.grid.pickAt(p.x, p.y);
      if (!hit) {
        this.actions.background();
        return;
      }
      this.events.emit("tile:click", hit.tile);
      if (hit.part === "heart" && this.config.features.wishlist) this.actions.toggleWishlist(hit.tile.id);
      else if ((e.ctrlKey || e.metaKey || e.shiftKey) && this.config.features.bulk) this.actions.toggleSelect(hit.tile.id);
      else this.actions.toggleFocus(hit.tile.id);
    }
    destroy() {
      this.stop();
      this.ro && this.ro.disconnect();
      this.io && this.io.disconnect();
      document.removeEventListener("pointerdown", this._outside);
      this._unsubs && this._unsubs.forEach((u) => u());
      this.textures && this.textures.dispose();
      this.renderer && this.renderer.dispose();
      this.canvas && this.canvas.remove();
    }
  }
  class CartClient {
    /** @param {{ajaxUrl:string, nonce:string}} config */
    constructor(config) {
      this.ajaxUrl = config.ajaxUrl;
      this.nonce = config.nonce;
    }
    url(endpoint, query = {}) {
      let u = this.ajaxUrl.includes("%%endpoint%%") ? this.ajaxUrl.replace("%%endpoint%%", endpoint) : `${this.ajaxUrl}${this.ajaxUrl.includes("?") ? "&" : "?"}wc-ajax=${endpoint}`;
      const qs = new URLSearchParams(query).toString();
      if (qs) u += (u.includes("?") ? "&" : "?") + qs;
      return u;
    }
    async _fetch(endpoint, { method = "GET", body, query } = {}, retry = true) {
      const opts = { method, credentials: "same-origin", headers: { Accept: "application/json" } };
      if (method === "POST") {
        const fd = new URLSearchParams();
        fd.set("nonce", this.nonce);
        Object.entries(body || {}).forEach(([k, v]) => {
          if (v && typeof v === "object") Object.entries(v).forEach(([kk, vv]) => fd.set(`${k}[${kk}]`, vv));
          else if (v !== void 0 && v !== null) fd.set(k, v);
        });
        opts.body = fd;
        opts.headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
      }
      const res = await fetch(this.url(endpoint, query), opts);
      let json = null;
      try {
        json = await res.json();
      } catch (e) {
      }
      if (res.status === 403 && retry && method === "POST") {
        await this.refreshNonce();
        return this._fetch(endpoint, { method, body, query }, false);
      }
      if (!res.ok || !json || json.success === false) {
        const err = new Error(json && json.data && json.data.message || `HTTP ${res.status}`);
        err.data = json && json.data;
        throw err;
      }
      return json.data !== void 0 ? json.data : json;
    }
    async refreshNonce() {
      const data = await this._fetch("sf3d_nonce", {}, false);
      if (data && data.nonce) this.nonce = data.nonce;
      return this.nonce;
    }
    /** @returns {Promise<{cart_item_key:string, cart:Object}>} */
    addToCart({ productId, variationId = 0, quantity = 1, variation = {} }) {
      return this._fetch("sf3d_add_to_cart", {
        method: "POST",
        body: { product_id: productId, variation_id: variationId, quantity, variation }
      });
    }
    getCart() {
      return this._fetch("sf3d_cart");
    }
    removeItem(key) {
      return this._fetch("sf3d_remove_from_cart", { method: "POST", body: { cart_item_key: key } });
    }
    related(id) {
      return this._fetch("sf3d_related", { query: { id } });
    }
    product(id) {
      return this._fetch("sf3d_product", { query: { id } });
    }
    search(q) {
      return this._fetch("sf3d_search", { query: { q } });
    }
    syncWishlist(ids) {
      return this._fetch("sf3d_wishlist", { method: "POST", body: { ids: ids.join(",") } });
    }
  }
  const ICONS = {
    heart: '<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c2 0 3.3 1 4 2.2h4C14.7 6 16 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    heartFill: '<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c2 0 3.3 1 4 2.2h4C14.7 6 16 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z" fill="currentColor"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    compare: '<path d="M7 4v16M3 8l4-4 4 4M17 20V4m-4 12 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    share: '<path d="M12 3v12m0-12L8 7m4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    cart: '<path d="M3 4h2l2.2 11h10.6L20 7H6.2M9 20.5a.5.5 0 1 0 0-.01M17 20.5a.5.5 0 1 0 0-.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    close: '<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    chevL: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    chevR: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    search: '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    sun: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor"/>',
    grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
  };
  Object.freeze(Object.keys(ICONS));
  function icon(name, size = 20) {
    const px = Number.isFinite(Number(size)) && Number(size) > 0 ? Number(size) : 20;
    const body = Object.prototype.hasOwnProperty.call(ICONS, name) ? ICONS[name] : "";
    const span = document.createElement("span");
    span.className = "sf3d-icon";
    span.setAttribute("aria-hidden", "true");
    span.innerHTML = `<svg viewBox="0 0 24 24" width="${px}" height="${px}" focusable="false">${body}</svg>`;
    return span;
  }
  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === void 0 || v === null || v === false) continue;
        if (k === "class") node.className = v;
        else if (k === "dataset") Object.assign(node.dataset, v);
        else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) node.setAttribute(k, "");
        else node.setAttribute(k, String(v));
      }
    }
    const append = (c) => {
      if (Array.isArray(c)) c.forEach(append);
      else if (c === null || c === void 0 || c === false) return;
      else node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    };
    children.forEach(append);
    return node;
  }
  function debounce(fn, wait) {
    let t;
    const wrapped = (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
    wrapped.cancel = () => clearTimeout(t);
    return wrapped;
  }
  function prefersReducedMotion() {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function isCoarsePointer() {
    return typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  }
  function safeStorage() {
    try {
      const k = "__sf3d__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return localStorage;
    } catch (e) {
      const mem = {};
      return {
        getItem: (k) => k in mem ? mem[k] : null,
        setItem: (k, v) => {
          mem[k] = String(v);
        },
        removeItem: (k) => {
          delete mem[k];
        }
      };
    }
  }
  class Header {
    /** @param {import('../core/App.js').App} app */
    constructor(app) {
      this.app = app;
      const c = app.config;
      const s = c.strings;
      this.items = [];
      this.active = -1;
      this.token = 0;
      this.input = h("input", {
        type: "search",
        class: "sf3d-search__input",
        placeholder: s.search,
        autocomplete: "off",
        role: "combobox",
        "aria-expanded": "false",
        "aria-controls": app.uid + "-sugg",
        "aria-autocomplete": "list",
        "aria-label": s.search
      });
      this.list = h("ul", { class: "sf3d-search__list", id: app.uid + "-sugg", role: "listbox", hidden: true });
      this.search = h("div", { class: "sf3d-search" }, icon("search", 18), this.input, this.list);
      this.themeBtn = h("button", { type: "button", class: "sf3d-iconbtn", "aria-label": s.darkMode, title: s.darkMode });
      this.cartBadge = h("span", { class: "sf3d-badge", "aria-hidden": "true" }, "0");
      this.cartBtn = h("button", { type: "button", class: "sf3d-iconbtn sf3d-cartbtn", "aria-label": s.cart, title: s.cart }, icon("cart", 22), this.cartBadge);
      const actions = h("div", { class: "sf3d-header__actions" });
      if (c.features.darkMode) actions.appendChild(this.themeBtn);
      if (c.features.cartDrawer) actions.appendChild(this.cartBtn);
      this.el = h(
        "header",
        { class: "sf3d-header" },
        h("div", { class: "sf3d-brand" }, c.title || ""),
        c.features.search ? this.search : h("span"),
        actions
      );
      app.stage.appendChild(this.el);
      const run = debounce((q) => this.query(q), 300);
      this.input.addEventListener("input", () => {
        const q = this.input.value.trim();
        if (q.length < 2) return this.close();
        run(q);
        return void 0;
      });
      this.input.addEventListener("keydown", (e) => this.onKey(e));
      this.input.addEventListener("blur", () => setTimeout(() => this.close(), 150));
      this.themeBtn.addEventListener("click", () => app.toggleTheme());
      this.cartBtn.addEventListener("click", () => app.drawer.open());
      this.subs = [
        app.store.subscribe("theme", (t) => this.renderTheme(t)),
        app.store.subscribe("cart", (cart) => {
          this.cartBadge.textContent = formatNumber(cart.count || 0, c.locale);
          this.cartBadge.classList.toggle("is-empty", !cart.count);
        })
      ];
      this.renderTheme(app.store.get("theme"));
      this.cartBadge.classList.add("is-empty");
    }
    renderTheme(t) {
      const s = this.app.config.strings;
      this.themeBtn.textContent = "";
      this.themeBtn.appendChild(icon(t === "dark" ? "sun" : "moon", 20));
      const label = t === "dark" ? s.lightMode : s.darkMode;
      this.themeBtn.setAttribute("aria-label", label);
      this.themeBtn.setAttribute("title", label);
    }
    async query(q) {
      const my = ++this.token;
      let results = [];
      try {
        const res = await this.app.client.search(q);
        results = res.products || [];
        this.app.mergeProducts(results);
      } catch (e) {
        const needle = q.toLowerCase();
        results = Array.from(this.app.catalog.values()).filter((p) => p.title.toLowerCase().includes(needle));
      }
      if (my !== this.token) return;
      this.items = results.slice(0, 5);
      this.renderList();
    }
    renderList() {
      const { app } = this;
      const c = app.config;
      this.list.textContent = "";
      this.active = -1;
      if (!this.items.length) {
        this.list.appendChild(h("li", { class: "sf3d-search__empty", role: "option", "aria-disabled": "true" }, c.strings.noResults));
      }
      this.items.forEach((p, i) => {
        const li = h(
          "li",
          { class: "sf3d-search__item", role: "option", id: `${app.uid}-opt-${i}`, "aria-selected": "false" },
          h("img", { src: p.image, alt: "", loading: "lazy" }),
          h("span", { class: "sf3d-search__name" }, p.title),
          h("span", { class: "sf3d-search__price" }, formatPrice(p.price || 0, c.currency, c.locale))
        );
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.choose(i);
        });
        this.list.appendChild(li);
      });
      this.list.hidden = false;
      this.input.setAttribute("aria-expanded", "true");
    }
    onKey(e) {
      if (e.key === "Escape") {
        this.close();
        return;
      }
      if (this.list.hidden || !this.items.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = this.items.length;
        this.active = (this.active + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
        Array.from(this.list.children).forEach((li, i) => li.setAttribute("aria-selected", String(i === this.active)));
        this.input.setAttribute("aria-activedescendant", `${this.app.uid}-opt-${this.active}`);
      } else if (e.key === "Enter" && this.active >= 0) {
        e.preventDefault();
        this.choose(this.active);
      }
    }
    choose(i) {
      const p = this.items[i];
      if (!p) return;
      this.close();
      this.input.value = "";
      this.app.focusProduct(p.id);
    }
    close() {
      this.list.hidden = true;
      this.input.setAttribute("aria-expanded", "false");
      this.input.removeAttribute("aria-activedescendant");
    }
    destroy() {
      this.subs.forEach((u) => u());
      this.el.remove();
    }
  }
  class Filters {
    /** @param {import('../core/App.js').App} app */
    constructor(app) {
      this.app = app;
      this.el = h("div", { class: "sf3d-filters", role: "group", "aria-label": app.config.strings.filters });
      this.subs = [
        app.store.subscribe("filter", () => this.render()),
        app.store.subscribe("sort", () => this.render()),
        app.store.subscribe("collection", () => this.render())
      ];
      this.render();
    }
    collectionProducts() {
      const grid = this.app.scene.grid;
      const set = this.app.resolveCollection(this.app.store.get("collection"));
      return Array.from(this.app.catalog.values()).filter((p) => !set || set.has(p.id)).filter((p) => grid.getTile(p.id));
    }
    toggle(key, value) {
      const f = this.app.store.get("filter");
      const cur = f.selected[key] || [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      const selected = { ...f.selected, [key]: next };
      if (!next.length) delete selected[key];
      this.app.setFilter(selected);
    }
    render() {
      const { app } = this;
      const c = app.config;
      const s = c.strings;
      const f = app.store.get("filter");
      const sort = app.store.get("sort");
      const products = this.collectionProducts();
      this.el.textContent = "";
      if (c.features.sort) {
        const opts = [["default", s.sortDefault], ["new", s.sortNew], ["price-asc", s.sortPriceAsc], ["price-desc", s.sortPriceDesc], ["popular", s.sortPopular]];
        const row = h(
          "div",
          { class: "sf3d-filters__row", role: "radiogroup", "aria-label": s.sort },
          h("span", { class: "sf3d-filters__label" }, s.sort)
        );
        opts.forEach(([k, label]) => {
          const b = h("button", { type: "button", class: `sf3d-chip${sort === k ? " is-on" : ""}`, role: "radio", "aria-checked": String(sort === k) }, label);
          b.addEventListener("click", () => app.setSort(k));
          row.appendChild(b);
        });
        this.el.appendChild(row);
      }
      if (c.features.filters) {
        (app.payload.filters || []).forEach((group) => {
          const sel = f.selected[group.key] || [];
          const others = { ...f.selected };
          delete others[group.key];
          const pool = products.filter((p) => matchesFilters(p, others));
          const row = h(
            "div",
            { class: "sf3d-filters__row", role: "group", "aria-label": group.label },
            h("span", { class: "sf3d-filters__label" }, group.label)
          );
          group.options.forEach((o) => {
            const n = countOptions(pool, group.key, o.value);
            const on = sel.includes(o.value);
            if (!n && !on) return;
            const b = h(
              "button",
              { type: "button", class: `sf3d-chip${on ? " is-on" : ""}`, "aria-pressed": String(on) },
              group.type === "color" && o.hex ? h("span", { class: "sf3d-chip__dot", style: { background: o.hex } }) : null,
              `${o.label} `,
              h("span", { class: "sf3d-chip__count" }, `(${formatNumber(n, c.locale)})`)
            );
            b.addEventListener("click", () => this.toggle(group.key, o.value));
            row.appendChild(b);
          });
          if (row.children.length > 1) this.el.appendChild(row);
        });
      }
      if (hasActiveFilters(f.selected) || sort !== "default") {
        const reset = h("button", { type: "button", class: "sf3d-chip sf3d-chip--reset" }, s.reset);
        reset.addEventListener("click", () => {
          app.setFilter({});
          app.setSort("default");
        });
        this.el.appendChild(reset);
      }
    }
    destroy() {
      this.subs.forEach((u) => u());
      this.el.remove();
    }
  }
  class Island {
    /** @param {import('../core/App.js').App} app */
    constructor(app) {
      this.app = app;
      this.open = false;
      const c = app.config;
      const s = c.strings;
      this.tabs = h("div", { class: "sf3d-island__tabs", role: "tablist", "aria-label": s.products });
      this.buttons = /* @__PURE__ */ new Map();
      const add = (slug, label, extra) => {
        const b = h("button", { type: "button", class: "sf3d-tab", role: "tab", "aria-selected": "false", dataset: { slug } }, extra, label);
        b.addEventListener("click", () => app.setCollection(slug));
        this.tabs.appendChild(b);
        this.buttons.set(slug, b);
        return b;
      };
      (app.payload.collections || []).forEach((col) => add(col.slug, col.name));
      if (!this.buttons.has("all")) {
        const b = add("all", s.all);
        this.tabs.prepend(b);
      }
      if (c.features.wishlist) {
        this.wCount = h("span", { class: "sf3d-tab__count" }, "0");
        add("wishlist", s.wishlist, icon("heartFill", 16));
        this.buttons.get("wishlist").append(this.wCount);
      }
      if (c.features.recent) add("recent", s.recent, icon("clock", 16));
      this.filterBtn = h("button", { type: "button", class: "sf3d-tab sf3d-tab--filter", "aria-expanded": "false", "aria-controls": app.uid + "-filters" }, icon("filter", 16), s.filters);
      this.filterDot = h("span", { class: "sf3d-dot", hidden: true });
      this.filterBtn.append(this.filterDot);
      this.filterBtn.addEventListener("click", () => this.toggle());
      const hasFilterUi = c.features.filters && (app.payload.filters || []).length || c.features.sort;
      this.filters = hasFilterUi ? new Filters(app) : null;
      this.panel = h("div", { class: "sf3d-island__panel", id: app.uid + "-filters", hidden: true }, this.filters ? this.filters.el : null);
      this.el = h(
        "nav",
        { class: "sf3d-island", "aria-label": s.products },
        this.panel,
        h("div", { class: "sf3d-island__bar" }, this.tabs, hasFilterUi ? this.filterBtn : null)
      );
      app.stage.appendChild(this.el);
      this.subs = [
        app.store.subscribe("collection", (slug) => this.markActive(slug)),
        app.store.subscribe("wishlist", (l) => {
          var _a;
          if (this.wCount) this.wCount.textContent = formatNumber(l.length, c.locale);
          (_a = this.buttons.get("wishlist")) == null ? void 0 : _a.classList.toggle("has-items", l.length > 0);
        }),
        app.store.subscribe("filter", (f) => {
          this.filterDot.hidden = !hasActiveFilters(f.selected);
        }),
        app.store.subscribe("activeProduct", (id) => this.el.classList.toggle("is-dim", id !== null))
      ];
      this.markActive(app.store.get("collection"));
      this.wCount && (this.wCount.textContent = formatNumber(app.store.get("wishlist").length, c.locale));
    }
    markActive(slug) {
      this.buttons.forEach((b2, k) => {
        const on = k === slug;
        b2.classList.toggle("is-active", on);
        b2.setAttribute("aria-selected", String(on));
      });
      const b = this.buttons.get(slug);
      b && b.scrollIntoView && b.scrollIntoView({ block: "nearest", inline: "center" });
    }
    toggle(force) {
      this.open = force !== void 0 ? force : !this.open;
      this.panel.hidden = !this.open;
      this.el.classList.toggle("is-open", this.open);
      this.filterBtn.setAttribute("aria-expanded", String(this.open));
    }
    destroy() {
      this.subs.forEach((u) => u());
      this.filters && this.filters.destroy();
      this.el.remove();
    }
  }
  const KEEP = 'canvas,[aria-live],[role="status"],[role="alert"],[role="log"],[role="dialog"],[aria-modal="true"],[data-sf3d-keep]';
  function supportsInert() {
    return typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;
  }
  function inertOthers(scope, dialog, keepSelector = KEEP) {
    if (!scope || !dialog) return () => {
    };
    const native = supportsInert();
    const touched = [];
    Array.from(scope.children).forEach((el) => {
      if (el === dialog || el.contains(dialog)) return;
      if (el.hasAttribute("inert")) return;
      if (el.matches(keepSelector) || el.querySelector("canvas,[data-sf3d-keep]")) return;
      const prevHidden = el.getAttribute("aria-hidden");
      el.setAttribute("inert", "");
      if (!native) el.setAttribute("aria-hidden", "true");
      touched.push({ el, prevHidden });
    });
    let released = false;
    return () => {
      if (released) return;
      released = true;
      touched.forEach(({ el, prevHidden }) => {
        el.removeAttribute("inert");
        if (native) return;
        if (prevHidden === null) el.removeAttribute("aria-hidden");
        else el.setAttribute("aria-hidden", prevHidden);
      });
      touched.length = 0;
    };
  }
  class Gallery {
    /**
     * @param {import('../core/App.js').App} app
     * @param {string[]} images
     * @param {(index:number, url:string)=>void} onChange
     */
    constructor(app, images, onChange) {
      this.app = app;
      this.images = images.length ? images : [""];
      this.onChange = onChange;
      this.index = 0;
      this.zoom = 1;
      this.pan = { x: 0, y: 0 };
      this.is360 = this.images.length > 8;
      this.pointers = /* @__PURE__ */ new Map();
      const s = app.config.strings;
      const rtl = app.config.rtl;
      this.img = h("img", { class: "sf3d-gallery__img", alt: "", draggable: "false", decoding: "async" });
      this.counter = h("span", { class: "sf3d-gallery__count", "aria-hidden": "true" });
      this.prev = h("button", { type: "button", class: "sf3d-gallery__nav sf3d-gallery__nav--prev", "aria-label": s.prev }, icon(rtl ? "chevR" : "chevL", 20));
      this.next = h("button", { type: "button", class: "sf3d-gallery__nav sf3d-gallery__nav--next", "aria-label": s.next }, icon(rtl ? "chevL" : "chevR", 20));
      this.stage = h("div", { class: "sf3d-gallery__stage", tabindex: "0", role: "group", "aria-roledescription": "carousel", "aria-label": s.gallery || "Gallery" }, this.img, this.counter);
      this.thumbsEl = h("div", { class: "sf3d-gallery__thumbs" });
      this.el = h(
        "div",
        { class: `sf3d-gallery${this.is360 ? " is-360" : ""}` },
        h("div", { class: "sf3d-gallery__row" }, this.prev, this.stage, this.next),
        this.is360 ? h("div", { class: "sf3d-gallery__hint" }, s.spin360) : this.thumbsEl
      );
      if (this.images.length < 2) this.el.classList.add("is-single");
      if (!this.is360) this.buildThumbs();
      this.prev.addEventListener("click", () => this.go(this.index - 1));
      this.next.addEventListener("click", () => this.go(this.index + 1));
      this.stage.addEventListener("keydown", (e) => {
        const dir = rtl ? -1 : 1;
        if (e.key === "ArrowRight") {
          this.go(this.index + dir);
          e.preventDefault();
          e.stopPropagation();
        }
        if (e.key === "ArrowLeft") {
          this.go(this.index - dir);
          e.preventDefault();
          e.stopPropagation();
        }
      });
      this.stage.addEventListener("dblclick", (e) => this.toggleZoom(e));
      this.stage.addEventListener("pointerdown", (e) => this.down(e));
      this.stage.addEventListener("pointermove", (e) => this.move(e));
      this.stage.addEventListener("pointerup", (e) => this.up(e));
      this.stage.addEventListener("pointercancel", (e) => this.up(e));
      this.show(0, false);
    }
    buildThumbs() {
      this.thumbs = this.images.map((url, i) => {
        const b = h("button", { type: "button", class: "sf3d-thumb", "aria-label": `${i + 1} / ${this.images.length}` }, h("img", { src: url, alt: "", loading: "lazy", draggable: "false" }));
        b.addEventListener("click", () => this.go(i));
        this.thumbsEl.appendChild(b);
        return b;
      });
    }
    go(i) {
      const n = this.images.length;
      this.show((i % n + n) % n, true);
    }
    show(i, notify) {
      this.index = i;
      this.img.src = this.images[i];
      this.counter.textContent = `${formatNumber(i + 1, this.app.config.locale)} / ${formatNumber(this.images.length, this.app.config.locale)}`;
      this.resetZoom();
      if (this.thumbs) {
        this.thumbs.forEach((b, k) => {
          b.classList.toggle("is-active", k === i);
          b.setAttribute("aria-current", k === i ? "true" : "false");
        });
      }
      if (notify) this.onChange(i, this.images[i]);
    }
    setImages(list) {
      if (!list.length) return;
      this.images = list;
      this.show(0, false);
    }
    // --- زوم ---
    applyZoom() {
      this.img.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
      this.stage.classList.toggle("is-zoomed", this.zoom > 1);
    }
    resetZoom() {
      this.zoom = 1;
      this.pan = { x: 0, y: 0 };
      this.applyZoom();
    }
    toggleZoom(e) {
      if (this.zoom > 1) return this.resetZoom();
      const r = this.stage.getBoundingClientRect();
      this.zoom = 2.4;
      this.pan = { x: -(e.clientX - r.left - r.width / 2) * 1.4, y: -(e.clientY - r.top - r.height / 2) * 1.4 };
      this.clampPan();
      this.applyZoom();
      return void 0;
    }
    clampPan() {
      const r = this.stage.getBoundingClientRect();
      const mx = r.width * (this.zoom - 1) / 2;
      const my = r.height * (this.zoom - 1) / 2;
      this.pan.x = clamp(this.pan.x, -mx, mx);
      this.pan.y = clamp(this.pan.y, -my, my);
    }
    // --- ورودی اشاره‌گر: سوایپ، اسپین ۳۶۰، پن، پینچ ---
    down(e) {
      this.stage.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.startX = e.clientX;
      this.acc = 0;
      this.swiped = false;
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
        this.pinchZoom = this.zoom;
      }
    }
    move(e) {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.zoom = clamp(this.pinchZoom * (d / this.pinch), 1, 4);
        this.clampPan();
        this.applyZoom();
        return;
      }
      if (this.zoom > 1) {
        this.pan.x += dx;
        this.pan.y += dy;
        this.clampPan();
        this.applyZoom();
        return;
      }
      if (this.is360) {
        this.acc += dx;
        const step = 22;
        while (Math.abs(this.acc) >= step) {
          this.go(this.index + (this.acc > 0 ? -1 : 1));
          this.acc -= Math.sign(this.acc) * step;
        }
      }
    }
    up(e) {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0 && !this.is360 && this.zoom === 1) {
        const dx = e.clientX - this.startX;
        if (Math.abs(dx) > 40 && !this.swiped) {
          this.swiped = true;
          const dir = this.app.config.rtl ? -1 : 1;
          this.go(this.index + (dx < 0 ? dir : -dir));
        }
      }
    }
  }
  const KEY = "sf3d:wishlist";
  class WishlistManager {
    /** @param {import('../core/App.js').App} app */
    constructor(app) {
      this.app = app;
      this.storage = safeStorage();
      const local = this.read();
      const server = app.config.wishlist || [];
      const merged = Array.from(/* @__PURE__ */ new Set([...server, ...local]));
      app.store.set("wishlist", merged);
      this.write(merged);
      this._onStorage = (e) => {
        if (e.key === KEY) app.store.set("wishlist", this.read());
      };
      window.addEventListener("storage", this._onStorage);
      this.pushServer = debounce(() => this.sync(), 600);
      if (app.config.isLoggedIn) this.sync();
    }
    read() {
      try {
        const arr = JSON.parse(this.storage.getItem(KEY) || "[]");
        return Array.isArray(arr) ? arr.map(Number).filter(Boolean) : [];
      } catch (e) {
        return [];
      }
    }
    write(ids) {
      this.storage.setItem(KEY, JSON.stringify(ids));
    }
    has(id) {
      return this.app.store.get("wishlist").includes(id);
    }
    toggle(id) {
      const list = this.app.store.get("wishlist");
      const active = !list.includes(id);
      const next = active ? [...list, id] : list.filter((x) => x !== id);
      this.app.store.set("wishlist", next);
      this.write(next);
      const product = this.app.getProduct(id);
      const s = this.app.config.strings;
      const title = product ? product.title : "";
      this.app.events.emit("wishlist:toggle", { id, active, product });
      this.app.sr.announce(tpl(active ? s.wishlistAdded : s.wishlistRemoved, { title }));
      if (this.app.config.isLoggedIn) this.pushServer();
      return active;
    }
    async sync() {
      try {
        const res = await this.app.client.syncWishlist(this.app.store.get("wishlist"));
        if (res && Array.isArray(res.ids)) {
          const ids = res.ids.map(Number);
          this.app.store.set("wishlist", ids);
          this.write(ids);
        }
      } catch (e) {
      }
    }
    destroy() {
      window.removeEventListener("storage", this._onStorage);
    }
  }
  function heartButton(app, id, extraClass = "") {
    const s = app.config.strings;
    const btn = h("button", { type: "button", class: `sf3d-heart ${extraClass}`, "aria-pressed": "false", "aria-label": s.wishlist, title: s.wishlist });
    const off = icon("heart", 22);
    const on = icon("heartFill", 22);
    btn.append(off, on);
    const apply = (list) => {
      const active = list.includes(id);
      btn.setAttribute("aria-pressed", String(active));
      btn.classList.toggle("is-on", active);
    };
    apply(app.store.get("wishlist"));
    const unsub = app.store.subscribe("wishlist", apply);
    btn.addEventListener("click", () => {
      app.toggleWishlist(id);
      btn.classList.remove("pop");
      void btn.offsetWidth;
      btn.classList.add("pop");
    });
    return { el: btn, destroy: unsub };
  }
  const cache = /* @__PURE__ */ new Map();
  class RelatedProducts {
    /** @param {import('../core/App.js').App} app @param {Object} product */
    constructor(app, product) {
      this.app = app;
      this.product = product;
      this.dead = false;
      const s = app.config.strings;
      this.list = h("div", { class: "sf3d-related__list", role: "list" });
      this.el = h(
        "section",
        { class: "sf3d-related", "aria-label": s.related, hidden: true },
        h("h3", { class: "sf3d-related__title" }, s.related),
        this.list
      );
      const run = () => !this.dead && this.load();
      (window.requestIdleCallback || ((f) => setTimeout(f, 250)))(run);
    }
    async load() {
      const { app, product } = this;
      let items = cache.get(product.id);
      if (!items) {
        try {
          const res = await app.client.related(product.id);
          items = (res.products || []).slice(0, 4);
          app.mergeProducts(items);
        } catch (e) {
          items = [];
        }
        if (!items.length) {
          const cats = new Set(product.categories || []);
          items = Array.from(app.catalog.values()).filter((p) => p.id !== product.id && (p.categories || []).some((c) => cats.has(c))).slice(0, 4);
        }
        cache.set(product.id, items);
      }
      if (this.dead || !items.length) return;
      items.forEach((p) => {
        const b = h(
          "button",
          { type: "button", class: "sf3d-related__item", role: "listitem", title: p.title, "aria-label": p.title },
          h("img", { src: p.image, alt: "", loading: "lazy", draggable: "false" }),
          h("span", { class: "sf3d-related__name" }, p.title)
        );
        b.addEventListener("click", () => app.focusProduct(p.id));
        this.list.appendChild(b);
      });
      this.el.hidden = false;
    }
    destroy() {
      this.dead = true;
    }
  }
  class VariationForm {
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
      this.el = h("div", { class: "sf3d-variations" });
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
          return vv === "" || vv === void 0 || vv === sel[k];
        });
      });
    }
    build() {
      this.attrs.forEach((attr) => {
        const label = h("div", { class: "sf3d-var__label", id: `sf3d-var-${this.product.id}-${attr.key}` }, attr.label, h("span", { class: "sf3d-var__value" }));
        let control;
        if (attr.type === "color") control = this.swatches(attr, label);
        else control = this.select(attr);
        this.el.appendChild(h("div", { class: `sf3d-var sf3d-var--${attr.type}` }, label, control));
      });
    }
    swatches(attr, label) {
      const wrap = h("div", { class: "sf3d-swatches", role: "radiogroup", "aria-labelledby": label.id });
      const fallback = this.product.primary_color_hex;
      attr.options.forEach((opt) => {
        const hex = opt.hex || (attr.options.length === 1 ? fallback : "");
        const btn = h("button", { type: "button", class: "sf3d-swatch", role: "radio", "aria-checked": "false", "aria-label": opt.label, title: opt.label, dataset: { value: opt.value } });
        if (opt.thumb) {
          btn.style.backgroundImage = `url("${opt.thumb}")`;
          btn.classList.add("has-thumb");
        } else if (hexToRgb(hex)) {
          btn.style.background = hex;
          if (isLight(hex)) btn.classList.add("is-light");
        } else {
          btn.classList.add("is-text");
          btn.textContent = String(opt.label).slice(0, 3);
        }
        btn.addEventListener("click", () => this.pick(attr.name, this.selected[attr.name] === opt.value ? "" : opt.value));
        wrap.appendChild(btn);
      });
      this.controls.push({ attr, wrap, kind: "swatch", label });
      return wrap;
    }
    select(attr) {
      const sel = h(
        "select",
        { class: "sf3d-select", "aria-label": attr.label },
        h("option", { value: "" }, `${this.s.choose} ${attr.label}`),
        attr.options.map((o) => h("option", { value: o.value }, o.label))
      );
      sel.addEventListener("change", () => this.pick(attr.name, sel.value));
      this.controls.push({ attr, wrap: sel, kind: "select" });
      return sel;
    }
    /** رنگ پیش‌فرض محصول (primary_color_hex) را اگر در گزینه‌ها بود انتخاب می‌کند */
    preselect() {
      const hex = (this.product.primary_color_hex || "").toLowerCase();
      if (!hex) return;
      const c = this.attrs.find((a) => a.type === "color");
      const opt = c && c.options.find((o) => (o.hex || "").toLowerCase() === hex);
      if (opt && this.compatible(c.name, opt.value)) this.selected[c.name] = opt.value;
    }
    pick(name, value) {
      this.selected[name] = value;
      this.sync();
    }
    resolve() {
      const all = this.attrs.every((a) => this.selected[a.name]);
      if (!all) return null;
      return (this.product.variations || []).find((v) => this.attrs.every((a) => {
        const vv = v.attributes[a.name];
        return vv === "" || vv === void 0 || vv === this.selected[a.name];
      })) || null;
    }
    sync() {
      this.controls.forEach((c) => {
        if (c.kind === "swatch") {
          c.wrap.querySelectorAll(".sf3d-swatch").forEach((b) => {
            const on = b.dataset.value === this.selected[c.attr.name];
            b.setAttribute("aria-checked", on ? "true" : "false");
            b.classList.toggle("is-selected", on);
            const ok = this.compatible(c.attr.name, b.dataset.value);
            b.classList.toggle("is-disabled", !ok);
            b.setAttribute("aria-disabled", ok ? "false" : "true");
          });
          const o = c.attr.options.find((x) => x.value === this.selected[c.attr.name]);
          c.label.querySelector(".sf3d-var__value").textContent = o ? ` : ${o.label}` : "";
        } else {
          c.wrap.value = this.selected[c.attr.name] || "";
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
  class Card {
    /** @param {import('../core/App.js').App} app */
    constructor(app) {
      this.app = app;
      this.current = null;
      this.release = null;
      this.releaseInert = null;
      this.parts = [];
      this.gallery = null;
      this.form = null;
      this.titleId = `${app.uid}-card-title`;
      this.el = h("aside", { class: `sf3d-card sf3d-card--${app.config.cardPosition}`, "aria-hidden": "true", inert: true });
      app.stage.appendChild(this.el);
      this.unsub = app.store.subscribe("activeProduct", (id) => this.render(id));
    }
    clearParts() {
      this.parts.forEach((p) => p.destroy && p.destroy());
      this.parts = [];
      this.gallery = null;
      this.form = null;
      if (this.releaseInert) {
        this.releaseInert();
        this.releaseInert = null;
      }
      if (this.release) {
        this.release();
        this.release = null;
      }
    }
    /** حالت بسته: هیچ نشانه‌ی modal باقی نمی‌ماند و کارت از درخت دسترس‌پذیری خارج می‌شود */
    close() {
      const el = this.el;
      this.current = null;
      el.classList.remove("is-open");
      el.removeAttribute("aria-modal");
      el.removeAttribute("aria-labelledby");
      el.setAttribute("aria-hidden", "true");
      el.setAttribute("inert", "");
    }
    render(id) {
      const app = this.app;
      const prev = this.current;
      this.clearParts();
      if (prev) {
        const t = app.scene.grid.getTile(prev.id);
        t && t.setImage(prev.image);
      }
      if (id === null) {
        this.close();
        return;
      }
      const p = app.getProduct(id);
      if (!p) {
        this.close();
        return;
      }
      this.current = p;
      const c = app.config;
      const s = c.strings;
      this.el.textContent = "";
      this.el.removeAttribute("inert");
      this.el.removeAttribute("aria-hidden");
      this.el.setAttribute("role", "dialog");
      this.el.setAttribute("aria-labelledby", this.titleId);
      this.el.removeAttribute("aria-label");
      const closeBtn = h("button", { type: "button", class: "sf3d-card__close", "aria-label": s.close }, icon("close", 20));
      closeBtn.addEventListener("click", () => app.closeProduct());
      const badges = h("div", { class: "sf3d-card__badges" });
      if (!p.in_stock) badges.appendChild(h("span", { class: "sf3d-pill sf3d-pill--muted" }, s.outOfStock));
      if (p.on_sale && p.discount) badges.appendChild(h("span", { class: "sf3d-pill sf3d-pill--sale" }, `${s.sale} ${formatPercent(p.discount, c.locale)}`));
      if (p.is_new) badges.appendChild(h("span", { class: "sf3d-pill sf3d-pill--new" }, s.new));
      const title = h("h2", { class: "sf3d-card__title", id: this.titleId }, p.title);
      this.priceEl = h("div", { class: "sf3d-card__price" });
      this.stockEl = h("div", { class: "sf3d-stock", role: "status" });
      this.addBtn = h("button", { type: "button", class: "sf3d-btn sf3d-btn--primary sf3d-card__add" });
      this.addLabel = h("span", null);
      this.addBtn.append(icon("cart", 20), this.addLabel);
      const actions = h("div", { class: "sf3d-card__actions" }, this.addBtn);
      if (c.features.wishlist) {
        const hb = heartButton(app, p.id, "sf3d-heart--card");
        this.parts.push(hb);
        actions.appendChild(hb.el);
      }
      const shareBtn = h("button", { type: "button", class: "sf3d-iconbtn", "aria-label": s.share, title: s.share }, icon("share", 20));
      shareBtn.addEventListener("click", () => app.share(p));
      actions.appendChild(shareBtn);
      this.state = { ready: p.type !== "variable" && p.in_stock, variation: null, attributes: {}, complete: p.type !== "variable" };
      let galleryEl = null;
      if (c.features.gallery) {
        const imgs = Array.from(new Set([p.image, ...p.gallery || []].filter(Boolean)));
        const gallery = new Gallery(app, imgs, (i, url) => {
          const t = app.scene.grid.getTile(p.id);
          t && t.setImage(url);
        });
        this.gallery = gallery;
        this.parts.push(gallery);
        galleryEl = gallery.el;
      }
      let formEl = null;
      if (p.type === "variable" && (p.variation_attributes || []).length) {
        this.form = new VariationForm(p, s, (st) => {
          this.state = st;
          if (st.variation && st.variation.image && this.gallery) this.gallery.setImages(Array.from(/* @__PURE__ */ new Set([st.variation.image, ...p.gallery || []])));
          this.refresh();
        });
        formEl = this.form.el;
      } else {
        this.form = null;
      }
      const body = h(
        "div",
        { class: "sf3d-card__body" },
        badges,
        title,
        this.priceEl,
        this.stockEl,
        p.excerpt ? h("p", { class: "sf3d-card__excerpt" }, p.excerpt) : null,
        formEl,
        actions,
        h("a", { class: "sf3d-card__link", href: p.url }, s.viewProduct)
      );
      this.el.append(closeBtn, galleryEl, body);
      if (c.features.related) {
        const rel = new RelatedProducts(app, p);
        this.parts.push(rel);
        this.el.appendChild(rel.el);
      }
      this.addBtn.onclick = () => this.add();
      this.refresh();
      this.el.classList.add("is-open");
      this.release = app.focusManager.trap(this.el, { onEscape: () => app.closeProduct(), initial: closeBtn });
      if (c.features.cardModal !== false) {
        this.el.setAttribute("aria-modal", "true");
        this.releaseInert = inertOthers(app.stage, this.el);
      } else {
        this.el.removeAttribute("aria-modal");
      }
    }
    /** بروزرسانی قیمت، موجودی و دکمه بر اساس وضعیت فعلی */
    refresh() {
      const p = this.current;
      if (!p) return;
      const c = this.app.config;
      const s = c.strings;
      const v = this.state.variation;
      const fmt = (n) => formatPrice(n, c.currency, c.locale);
      this.priceEl.textContent = "";
      const price = v ? v.price : p.price;
      const reg = v ? v.regular_price : p.regular_price;
      if (p.type === "variable" && !v && p.price_min !== void 0 && p.price_min !== p.price_max) {
        this.priceEl.append(`${fmt(p.price_min)} – ${fmt(p.price_max)}`);
      } else {
        this.priceEl.append(h("span", { class: "sf3d-price__now" }, fmt(price || 0)));
        if (reg && reg > (price || 0)) this.priceEl.append(h("del", { class: "sf3d-price__old" }, fmt(reg)));
      }
      const inStock = v ? v.in_stock : p.in_stock;
      const qty = v && v.stock_quantity !== null && v.stock_quantity !== void 0 ? v.stock_quantity : p.stock_quantity;
      this.stockEl.className = "sf3d-stock";
      this.stockEl.textContent = "";
      if (!inStock || qty === 0) {
        this.stockEl.classList.add("is-out");
        this.stockEl.textContent = s.outOfStock;
      } else if (qty !== null && qty !== void 0) {
        const threshold = Math.max(10, p.low_stock_threshold || 0);
        if (qty < 5) this.stockEl.classList.add("is-critical", "is-pulse");
        else if (qty < threshold) this.stockEl.classList.add("is-low", "is-pulse");
        else this.stockEl.classList.add("is-ok");
        if (qty < threshold) this.stockEl.append(icon("bolt", 14), " ", tpl(s.lowStock, { n: formatNumber(qty, c.locale) }));
        else this.stockEl.textContent = s.inStock;
      } else {
        this.stockEl.classList.add("is-ok");
        this.stockEl.textContent = s.inStock;
      }
      const st = this.state;
      let label = s.addToCart;
      let disabled = false;
      if (!p.in_stock) {
        label = s.outOfStock;
        disabled = true;
      } else if (p.type === "variable") {
        if (!st.complete) {
          label = s.selectOptions;
          disabled = true;
        } else if (!st.ready) {
          label = s.outOfStock;
          disabled = true;
        }
      }
      this.addBtn.disabled = disabled;
      this.addLabel.textContent = label;
      this.addBtn.classList.remove("is-loading", "is-done");
    }
    async add() {
      const p = this.current;
      const st = this.state;
      if (!p || this.addBtn.disabled) return;
      const s = this.app.config.strings;
      this.addBtn.disabled = true;
      this.addBtn.classList.add("is-loading");
      this.addLabel.textContent = s.adding;
      try {
        await this.app.addToCart(p, { variationId: st.variation ? st.variation.id : 0, attributes: st.attributes });
        this.addBtn.classList.remove("is-loading");
        this.addBtn.classList.add("is-done");
        this.addLabel.textContent = s.added;
        setTimeout(() => this.current === p && this.refresh(), 1600);
      } catch (e) {
        this.addBtn.classList.remove("is-loading");
        this.refresh();
      }
    }
    destroy() {
      this.unsub && this.unsub();
      this.clearParts();
      this.el.remove();
    }
  }
  class Toast {
    constructor(root) {
      this.box = h("div", { class: "sf3d-toasts", "aria-hidden": "true", "data-sf3d-keep": "" });
      root.appendChild(this.box);
    }
    /**
     * @param {string} message
     * @param {{type?:'success'|'error'|'info', action?:{label:string, onClick:Function}, duration?:number}} opts
     */
    show(message, opts = {}) {
      const { type = "info", action, duration = 3200 } = opts;
      const el = h(
        "div",
        { class: `sf3d-toast sf3d-toast--${type}` },
        type === "success" ? icon("check", 18) : null,
        h("span", null, message)
      );
      if (action) {
        const b = h("button", { type: "button", class: "sf3d-toast__action", tabindex: "-1" }, action.label);
        b.addEventListener("click", () => {
          action.onClick();
          el.remove();
        });
        el.appendChild(b);
      }
      this.box.appendChild(el);
      requestAnimationFrame(() => el.classList.add("is-in"));
      setTimeout(() => {
        el.classList.remove("is-in");
        setTimeout(() => el.remove(), 300);
      }, duration);
      while (this.box.children.length > 3) this.box.firstChild.remove();
    }
  }
  class MiniMap {
    /** @param {import('../core/App.js').App} app */
    constructor(app) {
      this.app = app;
      this.w = app.config.grid.mapWidth;
      this.canvas = h("canvas", { class: "sf3d-minimap__canvas", "aria-hidden": "true" });
      this.el = h("div", { class: "sf3d-minimap", "aria-hidden": "true" }, this.canvas);
      app.stage.appendChild(this.el);
      this.sig = "";
      this.dragging = false;
      this.off = app.events.on("frame", () => this.draw());
      this.canvas.addEventListener("pointerdown", (e) => {
        this.dragging = true;
        this.canvas.setPointerCapture(e.pointerId);
        this.nav(e);
      });
      this.canvas.addEventListener("pointermove", (e) => this.dragging && this.nav(e));
      this.canvas.addEventListener("pointerup", () => {
        this.dragging = false;
      });
      app.events.on("grid:layout", () => {
        this.sig = "";
      });
    }
    frame() {
      const { scene } = this.app;
      const b = scene.camera.bounds;
      const pad = scene.grid.cfg.itemSize;
      return { minX: b.minX - pad, maxX: b.maxX + pad, minY: b.minY - pad, maxY: b.maxY + pad };
    }
    nav(e) {
      const f = this.frame();
      const r = this.canvas.getBoundingClientRect();
      const u = (e.clientX - r.left) / r.width;
      const v = (e.clientY - r.top) / r.height;
      const x = f.minX + u * (f.maxX - f.minX);
      const y = f.maxY - v * (f.maxY - f.minY);
      this.app.scene.panTo(x, y);
    }
    draw() {
      const { scene } = this.app;
      const cam = scene.camera;
      const sig = `${cam.x.toFixed(1)}|${cam.y.toFixed(1)}|${cam.zoom.toFixed(1)}|${cam.width}|${scene.grid.list.length}|${scene.dark}`;
      if (sig === this.sig) return;
      this.sig = sig;
      const f = this.frame();
      const fw = f.maxX - f.minX || 1;
      const fh = f.maxY - f.minY || 1;
      const W = this.w;
      const H = Math.max(40, Math.min(160, Math.round(W * fh / fw)));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (this.canvas.width !== W * dpr || this.canvas.height !== H * dpr) {
        this.canvas.width = W * dpr;
        this.canvas.height = H * dpr;
        this.canvas.style.width = W + "px";
        this.canvas.style.height = H + "px";
      }
      const ctx = this.canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const dot = this.app.config.grid.mapDotSize || 2;
      const dark = scene.dark;
      ctx.fillStyle = dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
      scene.grid.list.forEach((t) => {
        const x = (t.base.x - f.minX) / fw * W;
        const y = (f.maxY - t.base.y) / fh * H;
        ctx.fillRect(x - dot, y - dot, dot * 2, dot * 2);
      });
      const vh = 2 * cam.zoom * cam.tanHalf;
      const vw = vh * cam.aspect;
      const rx = (cam.x - vw / 2 - f.minX) / fw * W;
      const ry = (f.maxY - (cam.y + vh / 2)) / fh * H;
      ctx.strokeStyle = dark ? "#fafafa" : "#111";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(Math.max(0.75, rx), Math.max(0.75, ry), Math.min(W - 1.5, vw / fw * W), Math.min(H - 1.5, vh / fh * H));
    }
    destroy() {
      this.off();
      this.el.remove();
    }
  }
  class CartDrawer {
    /** @param {import('../core/App.js').App} app */
    constructor(app) {
      this.app = app;
      this.isOpen = false;
      const s = app.config.strings;
      this.backdrop = h("div", { class: "sf3d-backdrop", hidden: true });
      this.list = h("ul", { class: "sf3d-drawer__list" });
      this.subtotal = h("strong", { class: "sf3d-drawer__sub" });
      this.closeBtn = h("button", { type: "button", class: "sf3d-iconbtn", "aria-label": s.close }, icon("close", 20));
      this.checkout = h("a", { class: "sf3d-btn sf3d-btn--primary", href: app.config.checkoutUrl || "#" }, s.checkout);
      this.continueBtn = h("button", { type: "button", class: "sf3d-btn sf3d-btn--ghost" }, s.continueShopping);
      this.empty = h("p", { class: "sf3d-drawer__empty" }, s.cartEmpty);
      this.foot = h(
        "div",
        { class: "sf3d-drawer__foot" },
        h("div", { class: "sf3d-drawer__total" }, h("span", null, s.subtotal), this.subtotal),
        this.checkout,
        this.continueBtn
      );
      this.el = h(
        "aside",
        { class: "sf3d-drawer", role: "dialog", "aria-modal": "true", "aria-label": s.cart, "aria-hidden": "true" },
        h("div", { class: "sf3d-drawer__head" }, h("h2", null, s.cart), this.closeBtn),
        this.empty,
        this.list,
        this.foot
      );
      this.el.inert = true;
      app.stage.append(this.backdrop, this.el);
      this.closeBtn.addEventListener("click", () => this.close());
      this.continueBtn.addEventListener("click", () => this.close());
      this.backdrop.addEventListener("click", () => this.close());
      this.unsub = app.store.subscribe("cart", (c) => this.render(c));
      this.render(app.store.get("cart"));
    }
    render(cart) {
      const { app } = this;
      const s = app.config.strings;
      this.list.textContent = "";
      const items = cart.items || [];
      this.empty.hidden = items.length > 0;
      this.foot.hidden = items.length === 0;
      this.subtotal.innerHTML = cart.subtotal_html || "";
      items.forEach((it) => {
        const rm = h("button", { type: "button", class: "sf3d-iconbtn sf3d-drawer__rm", "aria-label": `${s.remove}: ${it.name}` }, icon("trash", 18));
        rm.addEventListener("click", async () => {
          rm.disabled = true;
          try {
            await app.removeFromCart(it);
          } catch (e) {
            rm.disabled = false;
          }
        });
        const li = h(
          "li",
          { class: "sf3d-drawer__item" },
          h("img", { src: it.image || "", alt: "", loading: "lazy" }),
          h(
            "div",
            { class: "sf3d-drawer__info" },
            h("div", { class: "sf3d-drawer__name" }, it.name),
            h("div", { class: "sf3d-drawer__meta" }, `${formatNumber(it.quantity, app.config.locale)} × `, h("span", { html: "" })),
            it.attributes ? h("div", { class: "sf3d-drawer__attrs" }, it.attributes) : null
          ),
          rm
        );
        li.querySelector(".sf3d-drawer__meta span").innerHTML = it.price_html || "";
        this.list.appendChild(li);
      });
    }
    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.backdrop.hidden = false;
      requestAnimationFrame(() => {
        this.backdrop.classList.add("is-in");
        this.el.classList.add("is-in");
      });
      this.el.inert = false;
      this.el.setAttribute("aria-hidden", "false");
      this.release = this.app.focusManager.trap(this.el, { onEscape: () => this.close(), initial: this.closeBtn });
    }
    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.backdrop.classList.remove("is-in");
      this.el.classList.remove("is-in");
      this.el.inert = true;
      this.el.setAttribute("aria-hidden", "true");
      setTimeout(() => {
        if (!this.isOpen) this.backdrop.hidden = true;
      }, 300);
      this.release && this.release();
    }
    destroy() {
      this.unsub();
      this.backdrop.remove();
      this.el.remove();
    }
  }
  const CMP_KEY = "sf3d:compare";
  class QuickActions {
    /** @param {import('../core/App.js').App} app */
    constructor(app) {
      this.app = app;
      this.id = null;
      this.hideTimer = 0;
      this.storage = safeStorage();
      const s = app.config.strings;
      const mk = (ic, label, fn) => {
        const b = h("button", { type: "button", class: "sf3d-qa__btn", "aria-label": label, title: label }, icon(ic, 18));
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          fn();
        });
        return b;
      };
      this.heart = mk("heart", s.wishlist, () => this.id !== null && app.toggleWishlist(this.id));
      this.view = mk("eye", s.quickView, () => this.id !== null && app.focusProduct(this.id));
      this.cmp = mk("compare", s.compare, () => this.id !== null && this.toggleCompare(this.id));
      this.share = mk("share", s.share, () => {
        const p = app.getProduct(this.id);
        p && app.share(p);
      });
      this.el = h("div", { class: "sf3d-qa", role: "toolbar", "aria-label": s.quickView, hidden: true }, this.heart, this.view, this.cmp, this.share);
      app.stage.appendChild(this.el);
      try {
        app.store.set("compare", JSON.parse(this.storage.getItem(CMP_KEY) || "[]"));
      } catch (e) {
      }
      this.el.addEventListener("pointerenter", () => clearTimeout(this.hideTimer));
      this.el.addEventListener("pointerleave", () => this.scheduleHide());
      this.subs = [
        app.store.subscribe("hover", (id) => {
          if (isCoarsePointer()) return;
          if (id !== null) this.showFor(id);
          else this.scheduleHide();
        }),
        app.store.subscribe("activeProduct", (id) => {
          if (id !== null) this.hide();
        }),
        app.store.subscribe("wishlist", () => this.sync())
      ];
      this.offLong = app.events.on("tile:longpress", (tile) => this.showFor(tile.id, true));
      this.offFrame = app.events.on("frame", () => this.place());
      this.onDoc = (e) => {
        if (!this.el.contains(e.target) && this.sticky) this.hide();
      };
      document.addEventListener("pointerdown", this.onDoc);
    }
    showFor(id, sticky = false) {
      if (this.app.store.get("activeProduct") !== null) return;
      clearTimeout(this.hideTimer);
      this.id = id;
      this.sticky = sticky;
      this.el.hidden = false;
      this.sync();
      this.place();
    }
    scheduleHide() {
      clearTimeout(this.hideTimer);
      if (this.sticky) return;
      this.hideTimer = setTimeout(() => this.hide(), 260);
    }
    hide() {
      this.el.hidden = true;
      this.id = null;
      this.sticky = false;
    }
    sync() {
      if (this.id === null) return;
      const on = this.app.store.get("wishlist").includes(this.id);
      this.heart.classList.toggle("is-on", on);
      this.heart.setAttribute("aria-pressed", String(on));
      const inCmp = (this.app.store.get("compare") || []).includes(this.id);
      this.cmp.classList.toggle("is-on", inCmp);
      this.cmp.setAttribute("aria-pressed", String(inCmp));
    }
    place() {
      if (this.el.hidden || this.id === null) return;
      const t = this.app.scene.grid.getTile(this.id);
      if (!t) return;
      const r = t.screenRect(this.app.scene.camera);
      this.el.style.transform = `translate(${Math.round(r.x)}px, ${Math.round(r.top - 8)}px) translate(-50%, -100%)`;
    }
    toggleCompare(id) {
      const cur = this.app.store.get("compare") || [];
      let next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      if (next.length > 3) next = next.slice(-3);
      this.app.store.set("compare", next);
      this.storage.setItem(CMP_KEY, JSON.stringify(next));
      this.sync();
      if (next.length >= 2 && !cur.includes(id)) this.openCompare(next);
    }
    openCompare(ids) {
      const { app } = this;
      const c = app.config;
      const s = c.strings;
      const products = ids.map((i) => app.getProduct(i)).filter(Boolean);
      const rows = [
        [s.size, (p) => (p.attributes && p.attributes.size || []).join("، ") || "—"],
        [s.color, (p) => (p.attributes && p.attributes.color || []).join("، ") || "—"],
        ["", (p) => p.in_stock ? s.inStock : s.outOfStock]
      ];
      const close = h("button", { type: "button", class: "sf3d-iconbtn", "aria-label": s.close }, icon("close", 20));
      const table = h(
        "table",
        { class: "sf3d-compare__table" },
        h("thead", null, h("tr", null, h("th"), products.map((p) => h("th", null, h("img", { src: p.image, alt: "" }), h("div", null, p.title))))),
        h(
          "tbody",
          null,
          h("tr", null, h("th", null, ""), products.map((p) => h("td", null, formatPrice(p.price || 0, c.currency, c.locale)))),
          rows.map(([label, fn]) => h("tr", null, h("th", null, label), products.map((p) => h("td", null, fn(p)))))
        )
      );
      const modal = h(
        "div",
        { class: "sf3d-compare", role: "dialog", "aria-modal": "true", "aria-label": s.compareTitle },
        h("div", { class: "sf3d-compare__head" }, h("h2", null, s.compareTitle), close),
        table
      );
      const back = h("div", { class: "sf3d-backdrop is-in" });
      app.stage.append(back, modal);
      const release = app.focusManager.trap(modal, { onEscape: () => end(), initial: close });
      const end = () => {
        release();
        modal.remove();
        back.remove();
      };
      close.addEventListener("click", end);
      back.addEventListener("click", end);
    }
    destroy() {
      this.subs.forEach((u) => u());
      this.offLong();
      this.offFrame();
      document.removeEventListener("pointerdown", this.onDoc);
      this.el.remove();
    }
  }
  class BulkBar {
    /** @param {import('../core/App.js').App} app */
    constructor(app) {
      this.app = app;
      const s = app.config.strings;
      this.text = h("span", { class: "sf3d-bulk__text", role: "status" });
      this.add = h("button", { type: "button", class: "sf3d-btn sf3d-btn--primary" }, s.bulkAdd);
      this.clear = h("button", { type: "button", class: "sf3d-btn sf3d-btn--ghost" }, s.clear);
      this.el = h("div", { class: "sf3d-bulk", hidden: true }, this.text, this.add, this.clear);
      app.stage.appendChild(this.el);
      this.clear.addEventListener("click", () => app.store.set("selection", []));
      this.add.addEventListener("click", () => this.run());
      this.unsub = app.store.subscribe("selection", (ids) => {
        this.el.hidden = !ids.length;
        this.text.textContent = tpl(s.selected, { n: formatNumber(ids.length, app.config.locale) });
        app.scene.grid.setSelection(ids);
      });
    }
    async run() {
      const { app } = this;
      const ids = app.store.get("selection");
      this.add.disabled = true;
      let ok = 0;
      let skipped = 0;
      for (const id of ids) {
        const p = app.getProduct(id);
        if (!p || !p.in_stock || p.type === "variable") {
          skipped++;
          continue;
        }
        try {
          await app.addToCart(p, { quiet: true });
          ok++;
        } catch (e) {
          skipped++;
        }
      }
      this.add.disabled = false;
      const s = app.config.strings;
      const n = formatNumber(ok, app.config.locale);
      app.toast.show(`${n} ${s.products} ${s.added}${skipped ? ` — ${formatNumber(skipped, app.config.locale)} ${s.selectOptions}` : ""}`, { type: ok ? "success" : "error" });
      app.sr.announce(`${n} ${s.products} ${s.added}`);
      if (ok) app.store.set("selection", []);
    }
    destroy() {
      this.unsub();
      this.el.remove();
    }
  }
  class EmptyState {
    /** @param {import('../core/App.js').App} app */
    constructor(app) {
      this.app = app;
      this.msg = h("p", { class: "sf3d-empty__msg" });
      this.reset = h("button", { type: "button", class: "sf3d-btn sf3d-btn--ghost" }, app.config.strings.reset);
      this.ico = h("div", { class: "sf3d-empty__icon" });
      this.el = h("div", { class: "sf3d-empty", hidden: true, role: "status" }, this.ico, this.msg, this.reset);
      app.stage.appendChild(this.el);
      this.reset.addEventListener("click", () => {
        app.setFilter({});
        app.setCollection("all");
      });
      this.off = app.events.on("grid:layout", ({ count, total }) => this.update(count, total));
    }
    update(count, total) {
      const { app } = this;
      const s = app.config.strings;
      const col = app.store.get("collection");
      this.el.hidden = count > 0;
      if (count > 0) return;
      this.ico.textContent = "";
      if (total === 0 && col === "wishlist") {
        this.ico.appendChild(icon("heart", 40));
        this.msg.textContent = s.emptyWishlist;
        this.reset.hidden = true;
      } else if (total === 0 && col === "recent") {
        this.ico.appendChild(icon("clock", 40));
        this.msg.textContent = s.emptyRecent;
        this.reset.hidden = true;
      } else {
        this.ico.appendChild(icon("search", 40));
        this.msg.textContent = s.noResults;
        this.reset.hidden = false;
      }
    }
    destroy() {
      this.off();
      this.el.remove();
    }
  }
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  class FocusManager {
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
        if (e.key === "Escape" && opts.onEscape) {
          e.stopPropagation();
          opts.onEscape();
          return;
        }
        if (e.key !== "Tab") return;
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
      container.addEventListener("keydown", onKey);
      const target = opts.initial || container.querySelector(FOCUSABLE) || container;
      if (!container.hasAttribute("tabindex")) container.setAttribute("tabindex", "-1");
      setTimeout(() => target.focus({ preventScroll: true }), 30);
      const release = () => {
        container.removeEventListener("keydown", onKey);
        if (previous && previous.focus && document.contains(previous)) previous.focus({ preventScroll: true });
      };
      this.stack.push(release);
      return () => {
        this.stack = this.stack.filter((r) => r !== release);
        release();
      };
    }
  }
  class ScreenReader {
    constructor(root) {
      this.region = h("div", {
        class: "sf3d-sr-only",
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true"
      });
      root.appendChild(this.region);
      this.timer = 0;
    }
    announce(message) {
      clearTimeout(this.timer);
      this.region.textContent = "";
      this.timer = setTimeout(() => {
        this.region.textContent = message;
      }, 60);
    }
  }
  class KeyboardNav {
    /** @param {import('../core/App.js').App} app */
    constructor(app) {
      this.app = app;
      this.btns = /* @__PURE__ */ new Map();
      this.sig = "";
      this.layoutDirty = true;
      this.pending = null;
      this.focusedId = null;
      this.tick = 0;
      const s = app.config.strings;
      this.skip = h("a", { class: "sf3d-skip", href: "#" + app.uid + "-grid" }, s.skip);
      this.skip.addEventListener("click", (e) => {
        e.preventDefault();
        const first = this.layer.querySelector("button");
        first && first.focus();
      });
      this.layer = h("div", { class: "sf3d-a11y-grid", role: "grid", id: app.uid + "-grid", "aria-label": s.gridLabel });
      app.root.prepend(this.skip);
      app.stage.appendChild(this.layer);
      this.layer.addEventListener("keydown", (e) => this.onKey(e));
      app.events.on("frame", () => this.sync());
      app.events.on("grid:layout", () => {
        this.layoutDirty = true;
      });
      app.store.subscribe("activeProduct", () => {
        this.layoutDirty = true;
      });
    }
    describe(t) {
      const p = t.product;
      const c = this.app.config;
      const bits = [p.title, formatPrice(p.price || 0, c.currency, c.locale)];
      if (p.on_sale && p.discount) bits.push(`${c.strings.sale} ${p.discount}%`);
      if (!p.in_stock) bits.push(c.strings.outOfStock);
      return bits.join("، ");
    }
    sync() {
      if ((this.tick++ & 1) === 1) return;
      const { camera, grid } = this.app.scene;
      const sig = `${camera.x.toFixed(2)}|${camera.y.toFixed(2)}|${camera.zoom.toFixed(2)}|${grid.activeId}`;
      if (sig === this.sig && !this.layoutDirty && !this.pending) return;
      this.sig = sig;
      const list = grid.visibleTiles().slice(0, 80);
      const keep = new Set(list.map((t) => t.id));
      if (this.pending !== null) keep.add(this.pending);
      if (this.focusedId !== null) keep.add(this.focusedId);
      if (this.layoutDirty || keep.size !== this.btns.size || [...keep].some((id) => !this.btns.has(id))) {
        const hadFocus = this.layer.contains(document.activeElement);
        this.rebuild(list, keep, grid);
        this.layoutDirty = false;
        if (hadFocus && this.pending === null && this.btns.has(this.focusedId)) this.pending = this.focusedId;
      }
      this.btns.forEach((btn, id) => {
        const t = grid.getTile(id);
        if (!t) return;
        const r = t.screenRect(camera);
        const size = Math.max(48, r.size);
        btn.style.transform = `translate(${Math.round(r.x - size / 2)}px, ${Math.round(r.y - size / 2)}px)`;
        btn.style.width = btn.style.height = `${Math.round(size)}px`;
      });
      if (this.pending !== null && this.btns.has(this.pending)) {
        this.btns.get(this.pending).focus({ preventScroll: true });
        this.pending = null;
      }
    }
    rebuild(list, keep, grid) {
      const tiles = grid.list.filter((t) => keep.has(t.id));
      this.layer.textContent = "";
      this.btns.clear();
      const rows = /* @__PURE__ */ new Map();
      tiles.forEach((t) => {
        if (!rows.has(t.row)) rows.set(t.row, []);
        rows.get(t.row).push(t);
      });
      const focusMode = grid.activeId !== null;
      [...rows.keys()].sort((a, b) => a - b).forEach((r) => {
        const row = h("div", { role: "row", class: "sf3d-a11y-row", "aria-rowindex": r + 1 });
        rows.get(r).sort((a, b) => a.col - b.col).forEach((t) => {
          const btn = h("button", {
            type: "button",
            class: "sf3d-a11y-btn",
            tabindex: t.id === this.focusedId || this.focusedId === null && t === tiles[0] ? "0" : "-1",
            "aria-label": this.describe(t),
            "aria-pressed": focusMode ? String(grid.activeId === t.id) : null,
            dataset: { id: t.id, row: t.row, col: t.col }
          });
          btn.addEventListener("click", () => this.app.toggleFocus(t.id));
          btn.addEventListener("focus", () => {
            this.focusedId = t.id;
            grid.hoverId = t.id;
            this.app.scene.ensureInView(t);
            this.btns.forEach((b) => b.setAttribute("tabindex", b === btn ? "0" : "-1"));
          });
          btn.addEventListener("blur", () => {
            if (grid.hoverId === t.id) grid.hoverId = null;
          });
          this.btns.set(t.id, btn);
          row.appendChild(h("div", { role: "gridcell", class: "sf3d-a11y-cell" }, btn));
        });
        this.layer.appendChild(row);
      });
    }
    onKey(e) {
      const grid = this.app.scene.grid;
      const cur = grid.getTile(this.focusedId);
      if (!cur) return;
      const rtl = this.app.config.rtl;
      let dr = 0;
      let dc = 0;
      switch (e.key) {
        case "ArrowRight":
          dc = rtl ? -1 : 1;
          break;
        case "ArrowLeft":
          dc = rtl ? 1 : -1;
          break;
        case "ArrowUp":
          dr = -1;
          break;
        case "ArrowDown":
          dr = 1;
          break;
        case "Home":
          return this.go(grid.list[0], e);
        case "End":
          return this.go(grid.list[grid.list.length - 1], e);
        default:
          return void 0;
      }
      const target = grid.list.find((t) => t.row === cur.row + dr && t.col === cur.col + dc);
      return this.go(target, e);
    }
    go(tile, e) {
      e.preventDefault();
      if (!tile) return;
      this.pending = tile.id;
      this.app.scene.ensureInView(tile);
      this.layoutDirty = true;
    }
    announceFocus(tile) {
      this.app.sr.announce(tpl(this.app.config.strings.focused, { title: tile.product.title }));
    }
    /** بازگرداندن فوکوس به دکمه‌ی کاشی (پس از بستن کارت) */
    restoreFocus(id) {
      if (id === null || id === void 0) return;
      this.pending = id;
      this.focusedId = id;
      this.layoutDirty = true;
    }
    destroy() {
      this.layer.remove();
      this.skip.remove();
    }
  }
  const HASH_LIMITS = Object.freeze({
    MAX_HASH_LENGTH: 2e3,
    MAX_FILTER_KEYS: 12,
    MAX_VALUES_PER_KEY: 20,
    MAX_FILTER_PAIRS: 50,
    MAX_KEY_LENGTH: 32,
    MAX_VALUE_LENGTH: 64
  });
  const KEY_RE = /^[\p{L}\p{N}_-]{1,32}$/u;
  const VALUE_RE = /^[\p{L}\p{N}_.-]{1,64}$/u;
  const SLUG_RE = /^[\p{L}\p{N}_-]{1,64}$/u;
  const SORT_RE = /^[a-z0-9_-]{1,32}$/i;
  const PRODUCT_RE = /^product-(\d{1,10})$/;
  const BLOCKED_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
  const ALLOWED_TOP_KEYS = /* @__PURE__ */ new Set(["filter", "sort", "collection"]);
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const isSafeKey = (k) => typeof k === "string" && KEY_RE.test(k) && !BLOCKED_KEYS.has(k.toLowerCase());
  const isSafeValue = (v) => typeof v === "string" && VALUE_RE.test(v);
  function safeDecode(s) {
    try {
      return decodeURIComponent(s);
    } catch (e) {
      return null;
    }
  }
  function currentHash() {
    return typeof location !== "undefined" ? location.hash : "";
  }
  function parseFilter(val, allowed, target) {
    let pairs = 0;
    for (const pair of val.split(",")) {
      if (pairs >= HASH_LIMITS.MAX_FILTER_PAIRS) break;
      const idx = pair.indexOf(":");
      if (idx < 1) continue;
      const k = pair.slice(0, idx);
      const v = pair.slice(idx + 1);
      if (!isSafeKey(k) || !isSafeValue(v)) continue;
      if (allowed && !allowed.has(k)) continue;
      if (!hasOwn(target, k)) {
        if (Object.keys(target).length >= HASH_LIMITS.MAX_FILTER_KEYS) continue;
        target[k] = [];
      }
      const list = target[k];
      if (list.length >= HASH_LIMITS.MAX_VALUES_PER_KEY || list.includes(v)) continue;
      list.push(v);
      pairs++;
    }
  }
  function parseHash(hash = currentHash(), options = {}) {
    const out = { product: null, filter: {}, sort: "", collection: "" };
    const raw = String(hash || "").replace(/^#/, "");
    if (!raw || raw.length > HASH_LIMITS.MAX_HASH_LENGTH) return out;
    const allowed = options && options.filterKeys ? new Set(options.filterKeys) : null;
    const seen = /* @__PURE__ */ new Set();
    for (const part of raw.split("&")) {
      const m = PRODUCT_RE.exec(part);
      if (m) {
        const id = Number(m[1]);
        if (out.product === null && Number.isSafeInteger(id) && id > 0) out.product = id;
        continue;
      }
      const eq = part.indexOf("=");
      if (eq < 1) continue;
      const key = part.slice(0, eq);
      if (!ALLOWED_TOP_KEYS.has(key) || seen.has(key)) continue;
      const val = safeDecode(part.slice(eq + 1));
      if (val === null) continue;
      seen.add(key);
      if (key === "filter") parseFilter(val, allowed, out.filter);
      else if (key === "sort") out.sort = SORT_RE.test(val) ? val : "";
      else if (key === "collection") out.collection = SLUG_RE.test(val) ? val : "";
    }
    return out;
  }
  function buildHash({ product, filter, sort, collection } = {}) {
    const parts = [];
    const id = Number(product);
    if (Number.isSafeInteger(id) && id > 0) parts.push(`product-${id}`);
    const pairs = [];
    const keys = /* @__PURE__ */ new Set();
    Object.keys(filter || {}).forEach((k) => {
      if (!isSafeKey(k)) return;
      const vals = Array.isArray(filter[k]) ? filter[k] : [];
      const clean = [];
      vals.forEach((v) => {
        v = String(v);
        if (isSafeValue(v) && !clean.includes(v) && clean.length < HASH_LIMITS.MAX_VALUES_PER_KEY) clean.push(v);
      });
      if (!clean.length || keys.size >= HASH_LIMITS.MAX_FILTER_KEYS) return;
      keys.add(k);
      clean.forEach((v) => pairs.push(`${k}:${v}`));
    });
    const f = pairs.slice(0, HASH_LIMITS.MAX_FILTER_PAIRS).join(",");
    if (f) parts.push(`filter=${encodeURIComponent(f)}`);
    if (sort && sort !== "default" && SORT_RE.test(sort)) parts.push(`sort=${encodeURIComponent(sort)}`);
    if (collection && collection !== "all" && SLUG_RE.test(collection)) parts.push(`collection=${encodeURIComponent(collection)}`);
    return parts.length ? `#${parts.join("&")}` : "";
  }
  function writeHash(state) {
    if (typeof location === "undefined" || typeof history === "undefined" || typeof history.replaceState !== "function") return false;
    const next = buildHash(state || {});
    if (location.hash === next) return false;
    try {
      history.replaceState(history.state, "", location.pathname + location.search + next);
      return true;
    } catch (e) {
      return false;
    }
  }
  let uidCounter = 0;
  const RECENT_KEY = "sf3d:recent";
  const THEME_KEY = "sf3d:theme";
  class App {
    /**
     * @param {HTMLElement} root
     * @param {{config:Object, payload:Object}} boot
     */
    constructor(root, boot) {
      this.root = root;
      this.boot = boot;
      this.uid = `sf3d-${++uidCounter}`;
      this.destroyers = [];
      this.ready = false;
    }
    /** @param {Map<string,Object>} plugins */
    init(plugins = /* @__PURE__ */ new Map()) {
      const { root, boot } = this;
      this.config = normalizeConfig(boot.config || {});
      this.payload = { products: [], collections: [], filters: [], ...boot.payload || {} };
      const c = this.config;
      this.storage = safeStorage();
      this.events = new Events(root);
      this.store = new Store({
        activeProduct: null,
        collection: "all",
        filter: { selected: {} },
        sort: "default",
        cart: { count: 0, subtotal_html: "", items: [] },
        wishlist: [],
        hover: null,
        zoom: c.grid.zoomOut,
        recent: this.readRecent(),
        selection: [],
        compare: [],
        theme: "light"
      });
      this.client = new CartClient(c);
      this.focusManager = new FocusManager();
      this.catalog = new Map(this.payload.products.map((p) => [p.id, p]));
      this.container = new Container();
      this.container.instance("app", this).instance("store", this.store).instance("events", this.events).instance("config", c).instance("client", this.client);
      root.textContent = "";
      root.classList.add("sf3d-root");
      root.dir = c.rtl ? "rtl" : "ltr";
      if (c.height) root.style.setProperty("--sf3d-height", c.height);
      this.stage = h("div", { class: "sf3d-stage" });
      root.appendChild(this.stage);
      const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
      setReducedMotion(prefersReducedMotion());
      root.classList.toggle("is-reduced-motion", prefersReducedMotion());
      if (mq && mq.addEventListener) {
        const onMq = () => {
          setReducedMotion(mq.matches);
          root.classList.toggle("is-reduced-motion", mq.matches);
        };
        mq.addEventListener("change", onMq);
        this.destroyers.push(() => mq.removeEventListener("change", onMq));
      }
      this.sr = new ScreenReader(root);
      this.toast = new Toast(this.stage);
      this.scene = new Scene({
        container: this.stage,
        config: c,
        store: this.store,
        events: this.events,
        resolveCollection: (slug) => this.resolveCollection(slug),
        actions: {
          toggleFocus: (id) => this.toggleFocus(id),
          toggleWishlist: (id) => this.toggleWishlist(id),
          toggleSelect: (id) => this.toggleSelect(id),
          background: () => {
            if (this.store.get("activeProduct") !== null) this.closeProduct();
            this.island && this.island.toggle(false);
          }
        }
      });
      if (!this.scene.mount()) {
        this.stage.appendChild(h("p", { class: "sf3d-nogl" }, "WebGL در این مرورگر پشتیبانی نمی‌شود."));
        this.events.emit("error", new Error("webgl unsupported"));
        return this;
      }
      this.scene.grid.setProducts(this.payload.products);
      this.wishlist = new WishlistManager(this);
      this.container.instance("wishlist", this.wishlist);
      this.header = new Header(this);
      this.island = new Island(this);
      this.card = new Card(this);
      this.drawer = new CartDrawer(this);
      this.empty = new EmptyState(this);
      if (c.features.minimap) this.minimap = new MiniMap(this);
      if (c.features.quickActions) this.quick = new QuickActions(this);
      if (c.features.bulk) this.bulk = new BulkBar(this);
      this.kbd = new KeyboardNav(this);
      this.destroyers.push(() => [this.header, this.island, this.card, this.drawer, this.empty, this.minimap, this.quick, this.bulk, this.kbd].forEach((x) => x && x.destroy && x.destroy()));
      this.bindState();
      this.initTheme();
      const hs = c.features.hashSync ? parseHash() : { product: null, filter: {}, sort: "", collection: "" };
      this.scene.setDark(this.store.get("theme") === "dark");
      const startCol = hs.collection || c.startCollection || "all";
      this.store.set("filter", { selected: hs.filter });
      if (hs.sort) this.store.set("sort", hs.sort);
      this.store.set("collection", this.hasCollection(startCol) ? startCol : "all");
      this.scene.grid.setWishlist(this.store.get("wishlist"));
      this.scene.grid.collection = this.store.get("collection");
      this.scene.grid.refresh({ reset: true });
      this.scene.start();
      this.bindGlobal();
      this.refreshCart();
      this.ready = true;
      this.events.emit("ready", this);
      if (hs.product) this.focusProduct(hs.product);
      plugins.forEach((plugin, name) => this.usePlugin(name, plugin));
      return this;
    }
    // ---------- پلاگین‌ها ----------
    usePlugin(name, plugin) {
      this.pluginsUsed = this.pluginsUsed || /* @__PURE__ */ new Set();
      if (this.pluginsUsed.has(name)) return;
      this.pluginsUsed.add(name);
      if (plugin.hooks) Object.entries(plugin.hooks).forEach(([ev, fn]) => this.destroyers.push(this.events.on(ev, fn)));
      if (typeof plugin.init === "function") {
        try {
          plugin.init(this);
        } catch (e) {
          this.events.emit("error", e);
        }
      }
    }
    // ---------- کلکسیون‌ها ----------
    hasCollection(slug) {
      return ["all", "wishlist", "recent"].includes(slug) || (this.payload.collections || []).some((x) => x.slug === slug);
    }
    /** @returns {Set<number>|null} null = همه */
    resolveCollection(slug) {
      if (slug === "all") return null;
      if (slug === "wishlist") return new Set(this.store.get("wishlist"));
      if (slug === "recent") return new Set(this.store.get("recent"));
      const col = (this.payload.collections || []).find((x) => x.slug === slug);
      if (!col) return null;
      return new Set(Array.from(this.catalog.values()).filter((p) => (p.categories || []).includes(col.id)).map((p) => p.id));
    }
    // ---------- Store ----------
    bindState() {
      const { store, events } = this;
      const grid = () => this.scene.grid;
      const hashWrite = () => {
        if (!this.config.features.hashSync || !this.ready) return;
        writeHash({ product: store.get("activeProduct"), filter: store.get("filter").selected, sort: store.get("sort"), collection: store.get("collection") });
      };
      this.destroyers.push(
        store.subscribe("wishlist", (ids) => {
          grid().setWishlist(ids);
          if (store.get("collection") === "wishlist") grid().refresh();
        }),
        store.subscribe("recent", () => {
          if (store.get("collection") === "recent") grid().refresh();
        }),
        store.subscribe("filter", (f) => {
          grid().refresh();
          events.emit("filter", f.selected);
          hashWrite();
        }),
        store.subscribe("sort", () => {
          grid().refresh();
          hashWrite();
        }),
        store.subscribe("collection", (slug) => {
          if (store.get("activeProduct") !== null) store.set("activeProduct", null);
          grid().setCollection(slug, true);
          if (!this.ready) return;
          this.scene.camera.setTarget(0, 0, this.config.grid.zoomOut);
          events.emit("collection", slug);
          hashWrite();
        }),
        store.subscribe("activeProduct", (id) => {
          const prev = this.lastActive;
          this.lastActive = id;
          events.emit("focus", id !== null ? this.getProduct(id) : null);
          hashWrite();
          if (id !== null) {
            this.pushRecent(id);
            const p = this.getProduct(id);
            const t = grid().getTile(id);
            p && this.sr.announce(tpl(this.config.strings.focused, { title: p.title }));
            t && (t.labelVersion = -1);
          } else if (prev !== void 0 && prev !== null) {
            this.kbd && this.kbd.restoreFocus(prev);
          }
        }),
        store.subscribe("theme", (t) => {
          this.root.dataset.theme = t;
          this.scene.setDark(t === "dark");
        }),
        store.subscribe("hover", () => {
        })
      );
    }
    bindGlobal() {
      const onKey = (e) => {
        var _a, _b;
        const tag = e.target && e.target.tagName || "";
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || e.target && e.target.isContentEditable;
        if (e.key === "Escape" && !typing && this.store.get("activeProduct") !== null && !this.drawer.isOpen) {
          this.closeProduct();
        } else if ((e.key === "w" || e.key === "W") && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && this.config.features.wishlist) {
          const id = (_b = (_a = this.store.get("activeProduct")) != null ? _a : this.store.get("hover")) != null ? _b : this.kbd.focusedId;
          if (id !== null && id !== void 0) this.toggleWishlist(id);
        }
      };
      this.root.addEventListener("keydown", onKey);
      const onHash = () => {
        if (!this.config.features.hashSync) return;
        const hs = parseHash();
        const cur = this.store.get("activeProduct");
        if (hs.product && hs.product !== cur) this.focusProduct(hs.product);
        else if (!hs.product && cur !== null) this.store.set("activeProduct", null);
      };
      window.addEventListener("hashchange", onHash);
      this.destroyers.push(() => {
        this.root.removeEventListener("keydown", onKey);
        window.removeEventListener("hashchange", onHash);
      });
    }
    // ---------- تم ----------
    initTheme() {
      const pref = this.storage.getItem(THEME_KEY);
      const mq = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
      const auto = () => mq && mq.matches ? "dark" : "light";
      const initial = pref || (this.config.theme === "auto" ? auto() : this.config.theme);
      this.store.set("theme", initial === "dark" ? "dark" : "light");
      this.root.dataset.theme = this.store.get("theme");
      if (mq && mq.addEventListener) {
        const onChange = () => {
          if (!this.storage.getItem(THEME_KEY) && this.config.theme === "auto") this.store.set("theme", auto());
        };
        mq.addEventListener("change", onChange);
        this.destroyers.push(() => mq.removeEventListener("change", onChange));
      }
    }
    toggleTheme() {
      const next = this.store.get("theme") === "dark" ? "light" : "dark";
      this.storage.setItem(THEME_KEY, next);
      this.store.set("theme", next);
    }
    // ---------- محصولات ----------
    getProduct(id) {
      return this.catalog.get(id) || null;
    }
    mergeProducts(list) {
      (list || []).forEach((p) => {
        if (!p || this.catalog.has(p.id)) return;
        this.catalog.set(p.id, p);
        this.scene.grid.addProduct(p);
      });
    }
    async ensureProduct(id) {
      let p = this.getProduct(id);
      if (p) return p;
      try {
        const res = await this.client.product(id);
        if (res && res.product) {
          this.mergeProducts([res.product]);
          p = this.getProduct(id);
        }
      } catch (e) {
      }
      return p;
    }
    toggleFocus(id) {
      if (this.store.get("activeProduct") === id) this.closeProduct();
      else this.focusProduct(id);
    }
    async focusProduct(id) {
      const p = await this.ensureProduct(id);
      if (!p) return;
      const grid = this.scene.grid;
      let tile = grid.getTile(id);
      if (!tile) return;
      if (!tile.gridVisible || !tile.matches) {
        this.store.set("activeProduct", null);
        if (!this.store.get("filter") || Object.keys(this.store.get("filter").selected).length) this.store.set("filter", { selected: {} });
        if (this.store.get("collection") !== "all") this.store.set("collection", "all");
        else grid.refresh();
        tile = grid.getTile(id);
      }
      this.store.set("activeProduct", id);
    }
    closeProduct() {
      this.store.set("activeProduct", null);
    }
    setCollection(slug) {
      if (this.store.get("collection") === slug) {
        this.scene.camera.setTarget(0, 0, this.config.grid.zoomOut);
        return;
      }
      this.store.set("collection", slug);
    }
    setFilter(selected) {
      this.store.set("filter", { selected });
    }
    setSort(key) {
      this.store.set("sort", key);
    }
    toggleWishlist(id) {
      return this.wishlist.toggle(id);
    }
    toggleSelect(id) {
      const cur = this.store.get("selection");
      this.store.set("selection", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
    }
    readRecent() {
      try {
        return (JSON.parse(safeStorage().getItem(RECENT_KEY) || "[]") || []).map(Number).slice(0, 8);
      } catch (e) {
        return [];
      }
    }
    pushRecent(id) {
      if (!this.config.features.recent) return;
      const next = [id, ...this.store.get("recent").filter((x) => x !== id)].slice(0, 8);
      this.store.set("recent", next);
      this.storage.setItem(RECENT_KEY, JSON.stringify(next));
    }
    // ---------- سبد خرید ----------
    normalizeCart(cart) {
      return { count: 0, subtotal_html: "", items: [], ...cart || {} };
    }
    async refreshCart() {
      try {
        const data = await this.client.getCart();
        this.store.set("cart", this.normalizeCart(data.cart || data));
      } catch (e) {
      }
    }
    /**
     * @param {Object} product
     * @param {{variationId?:number, attributes?:Object, quantity?:number, quiet?:boolean}} opts
     */
    async addToCart(product, opts = {}) {
      const s = this.config.strings;
      try {
        const res = await this.client.addToCart({
          productId: product.id,
          variationId: opts.variationId || 0,
          quantity: opts.quantity || 1,
          variation: opts.attributes || {}
        });
        this.store.set("cart", this.normalizeCart(res.cart));
        this.events.emit("cart:added", { product, data: res });
        const msg = tpl(s.addedAnnounce, { title: product.title });
        this.sr.announce(msg);
        if (!opts.quiet) {
          this.toast.show(msg, {
            type: "success",
            action: this.config.features.cartDrawer ? { label: s.cart, onClick: () => this.drawer.open() } : null
          });
        }
        return res;
      } catch (e) {
        this.events.emit("error", e);
        const msg = e && e.message && !/^HTTP/.test(e.message) ? e.message : s.error;
        this.sr.announce(msg);
        this.toast.show(msg, { type: "error" });
        throw e;
      }
    }
    async removeFromCart(item) {
      const res = await this.client.removeItem(item.key);
      this.store.set("cart", this.normalizeCart(res.cart));
      this.events.emit("cart:removed", { item, data: res });
      return res;
    }
    // ---------- اشتراک‌گذاری ----------
    async share(product) {
      const s = this.config.strings;
      const url = `${location.origin}${location.pathname}${location.search}#product-${product.id}`;
      try {
        if (navigator.share) {
          await navigator.share({ title: product.title, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        this.toast.show(s.linkCopied, { type: "success" });
        this.sr.announce(s.linkCopied);
      } catch (e) {
        if (e && e.name !== "AbortError") this.toast.show(url, { type: "info", duration: 6e3 });
      }
    }
    destroy() {
      this.destroyers.forEach((d) => {
        try {
          d();
        } catch (e) {
        }
      });
      this.destroyers = [];
      this.wishlist && this.wishlist.destroy();
      this.scene && this.scene.destroy();
      this.root.classList.remove("sf3d-root");
    }
  }
  const version = "2.0.0";
  const registry = /* @__PURE__ */ new Map();
  const apps = [];
  function use(name, plugin) {
    if (!name || !plugin || registry.has(name)) return;
    registry.set(name, plugin);
    apps.forEach((a) => a.ready && a.usePlugin(name, plugin));
  }
  function readBoot(el) {
    const script = el.querySelector("script[data-sf3d-json]");
    if (!script) throw new Error("[SF3D] data script not found");
    return JSON.parse(script.textContent || "{}");
  }
  function mount(el, boot) {
    if (el.__sf3d) return el.__sf3d;
    const data = boot || readBoot(el);
    const app = new App(el, data);
    el.__sf3d = app;
    apps.push(app);
    app.init(registry);
    return app;
  }
  function unmount(el) {
    const app = el && el.__sf3d;
    if (!app) return;
    app.destroy();
    apps.splice(apps.indexOf(app), 1);
    delete el.__sf3d;
  }
  function init(scope = document) {
    scope.querySelectorAll(".sf3d-root[data-sf3d]").forEach((el) => {
      try {
        mount(el);
      } catch (e) {
        if (typeof console !== "undefined") console.error(e);
      }
    });
  }
  if (typeof window !== "undefined") {
    const start = () => init();
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
    window.addEventListener("elementor/frontend/init", () => {
      const ef = window.elementorFrontend;
      if (ef && ef.hooks) {
        ef.hooks.addAction("frontend/element_ready/sf3d_shoe_finder.default", ($scope) => {
          init($scope[0]);
        });
      }
    });
  }
  exports2.apps = apps;
  exports2.init = init;
  exports2.mount = mount;
  exports2.unmount = unmount;
  exports2.use = use;
  exports2.version = version;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
//# sourceMappingURL=sf3d.js.map
