// هماهنگ‌کننده‌ی شبکه (معادل ShoeGrid + GridCanvas): کاشی‌ها، چیدمان، فیلتر، مرتب‌سازی، pick
import { Tile } from './Tile.js';
import { computeLayout } from './Layout.js';
import { Quadtree } from './Quadtree.js';
import { LabelPainter } from './Badges.js';
import { matchesFilters, sortList } from './FilterEngine.js';
import { isReducedMotion } from '../utils/damp.js';

const THEMES = {
  light: { text: '#111111', price: '#111111', muted: '#6b7280', heartBg: 'rgba(255,255,255,0.92)', heartStroke: '#111111' },
  dark: { text: '#f4f4f5', price: '#f4f4f5', muted: '#a1a1aa', heartBg: 'rgba(30,30,34,0.92)', heartStroke: '#f4f4f5' },
};

export class Grid {
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
    this.byId = new Map();
    this.list = []; // کاشی‌های قابل‌نمایش به ترتیب چیدمان
    this.layout = null;
    this.qtree = null;
    this.collection = 'all';
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
    this.tiles.forEach((t) => { t.wished = set.has(t.id); });
  }

  setSelection(ids) {
    const set = new Set(ids);
    this.tiles.forEach((t) => { t.selected = set.has(t.id); });
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
    const filter = this.store.get('filter') || { selected: {} };
    const sort = this.store.get('sort') || 'default';
    const inSet = this.tiles.filter((t) => !set || set.has(t.id));
    inSet.forEach((t) => { t.matches = matchesFilters(t.product, filter.selected); });
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
        if (!t.matches && t.phase === 'hidden') t.base = { x: 0, y: 0 };
        if (!t.gridVisible) {
          const delay = reset && !instant ? (rank / total) * (this.cfg.enterStaggerDelay / 1000) : 0;
          t.show(delay, now);
        }
        rank++;
      } else if (t.gridVisible) {
        const delay = reset && !instant ? (t.index / this.tiles.length) * (this.cfg.exitStaggerDelay / 1000) : 0;
        t.hide(delay, now);
      }
    });
    this.events.emit('grid:layout', { count: matched.length, total: inSet.length });
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
      cullScale: this.quality === 0 ? 0.7 : 1,
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
      if (this.activeId !== null && t.id !== this.activeId) continue; // در فوکوس فقط کاشی فعال
      const hit = t.hit(px, py, this.camera);
      if (!hit) continue;
      const z = t.focusZ + t.curveZ;
      if (z > bestZ) {
        bestZ = z;
        best = { tile: t, part: hit.part };
      }
    }
    if (!best && this.activeId !== null) {
      // خارج از کاشی فعال: فقط کلیک خالی (برای بستن)
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
