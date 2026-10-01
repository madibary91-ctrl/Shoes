// کوآدتری نقطه‌ای برای pickAt سریع (به‌جای حلقه‌ی خطی)

export class Quadtree {
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
    return undefined;
  }

  _idx(x, y) {
    return (x >= this.b.x ? 1 : 0) + (y >= this.b.y ? 2 : 0);
  }

  _split() {
    const { x, y, w, h } = this.b;
    const hw = w / 2;
    const hh = h / 2;
    this.kids = [
      new Quadtree({ x: x - hw, y: y - hh, w: hw, h: hh }, this.depth + 1, this.capacity, this.maxDepth),
      new Quadtree({ x: x + hw, y: y - hh, w: hw, h: hh }, this.depth + 1, this.capacity, this.maxDepth),
      new Quadtree({ x: x - hw, y: y + hh, w: hw, h: hh }, this.depth + 1, this.capacity, this.maxDepth),
      new Quadtree({ x: x + hw, y: y + hh, w: hw, h: hh }, this.depth + 1, this.capacity, this.maxDepth),
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
