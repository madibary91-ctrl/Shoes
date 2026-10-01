// صحنه: canvas، حلقه‌ی رندر، ورودی (درگ/پینچ/ویل/کلیک/لانگ‌پرس)
import { Renderer } from './Renderer.js';
import { Camera } from './Camera.js';
import { TextureStore } from './TextureStore.js';
import { Grid } from '../grid/Grid.js';
import { isReducedMotion } from '../utils/damp.js';

export class Scene {
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
    this.pointers = new Map();
    this.clock = 0;
    this.last = 0;
    this.raf = 0;
    this.dark = false;
    this.engaged = false;
    this.moved = false;
    this.visible = true;
    this.supported = false;
  }

  mount() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sf3d-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.canvas);

    this.renderer = new Renderer(this.canvas, {
      onQuality: (q) => {
        this.grid && (this.grid.quality = q);
        this.events.emit('quality', q);
      },
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
      resolveCollection: this.resolveCollection,
    });
    this.grid.setFont(getComputedStyle(this.container).fontFamily);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.container);
    this.resize();
    this._bind();

    // توقف رندر وقتی ویجت داخل دید نیست (IntersectionObserver)
    this.io = new IntersectionObserver((entries) => {
      this.visible = entries[0].isIntersecting;
      this.visible ? this.start() : this.stop();
    });
    this.io.observe(this.container);

    this._unsubs = [
      this.store.subscribe('activeProduct', (id) => this.onActive(id)),
    ];
    return true;
  }

  resize() {
    const r = this.container.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    this.renderer.resize(w, h);
    this.camera.resize(w, h);
    this.events.emit('resize', { w, h });
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
    const dt = Math.max(0, Math.min((t - this.last) / 1000, 0.1));
    this.last = t;
    this.clock += dt;
    const reduced = isReducedMotion();
    const time = reduced ? 0 : this.clock;
    const cam = this.camera;
    const cfg = this.cfg;
    cam.update(dt);
    this.store.set('zoom', Math.round(cam.zoom * 100) / 100);
    this.grid.update(dt, this.clock);
    const r = this.renderer;
    r.begin();
    r.drawBackground({
      color: this.dark ? '#52525b' : cfg.bgColor,
      opacity: cfg.bgOpacity,
      scale: cfg.bgScale,
      thick: cfg.bgLineThickness,
      offsetX: cam.x * 0.04 + (reduced ? 0 : time * cfg.bgSpeed * 0.2),
      offsetY: cam.y * 0.04 + (reduced ? 0 : time * cfg.bgSpeed * 0.1),
    });
    this.grid.draw(r, time % 5); // mediump: زمان را کوچک نگه می‌داریم (دوره‌ی درخشش ۲٫۵ ثانیه)
    r.trackFrame(dt);
    this.events.emit('frame', cam);
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
      const endIsRight = this.config.rtl ? this.config.cardPosition === 'start' : this.config.cardPosition !== 'start';
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
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* بی‌اهمیت */ }
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
              this.events.emit('tile:longpress', hit.tile);
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
        if (e.pointerType === 'mouse') this._hover(p);
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
        this.container.classList.add('is-dragging');
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
        if (!this.moved && !this.longFired && e.type === 'pointerup') this._click(p, e);
        if (this.moved) this.camera.release();
        this.grid.dragging = false;
        this.container.classList.remove('is-dragging');
      }
      if (!this.pointers.size) this.pinch = 0;
    };
    this._leave = () => {
      if (this.pointers.size === 0) this._setHover(null);
    };
    this._wheel = (e) => {
      if (!(this.engaged || e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      this.camera.zoomBy(Math.exp(e.deltaY * 0.0012), cfg.zoomIn, cfg.zoomOut * 1.15);
    };
    this._outside = (e) => {
      if (!this.container.contains(e.target)) this.engaged = false;
    };
    c.addEventListener('pointerdown', this._down);
    c.addEventListener('pointermove', this._move);
    c.addEventListener('pointerup', this._up);
    c.addEventListener('pointercancel', this._up);
    c.addEventListener('pointerleave', this._leave);
    c.addEventListener('wheel', this._wheel, { passive: false });
    c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.events.emit('error', new Error('webgl context lost')); });
    document.addEventListener('pointerdown', this._outside);
  }

  _setHover(id) {
    if (this.grid.hoverId === id) return;
    this.grid.hoverId = id;
    this.store.set('hover', id);
    this.canvas.style.cursor = id !== null ? 'pointer' : '';
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
    this.events.emit('tile:click', hit.tile);
    if (hit.part === 'heart' && this.config.features.wishlist) this.actions.toggleWishlist(hit.tile.id);
    else if ((e.ctrlKey || e.metaKey || e.shiftKey) && this.config.features.bulk) this.actions.toggleSelect(hit.tile.id);
    else this.actions.toggleFocus(hit.tile.id);
  }

  destroy() {
    this.stop();
    this.ro && this.ro.disconnect();
    this.io && this.io.disconnect();
    document.removeEventListener('pointerdown', this._outside);
    this._unsubs && this._unsubs.forEach((u) => u());
    this.textures && this.textures.dispose();
    this.renderer && this.renderer.dispose();
    this.canvas && this.canvas.remove();
  }
}
