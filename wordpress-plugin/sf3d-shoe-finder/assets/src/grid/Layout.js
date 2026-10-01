// محاسبه‌ی چیدمان شبکه (مرکز در مبدأ)

/**
 * @param {number} count
 * @param {{gridCols:number,itemSize:number,gap:number}} cfg
 * @param {boolean} rtl
 * @returns {{positions:{x:number,y:number,row:number,col:number}[], cols:number, rows:number, bounds:Object, pitchX:number, pitchY:number}}
 */
export function computeLayout(count, cfg, rtl = false) {
  const cols = Math.max(1, Math.min(cfg.gridCols, count || 1));
  const rows = Math.max(1, Math.ceil(count / cols));
  const pitchX = cfg.itemSize + cfg.gap;
  const pitchY = cfg.itemSize + cfg.gap + 0.5; // فضای برچسب زیر هر کاشی
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
  const halfW = ((cols - 1) * pitchX) / 2;
  const halfH = ((rows - 1) * pitchY) / 2;
  return {
    positions,
    cols,
    rows,
    pitchX,
    pitchY,
    bounds: { minX: -halfW, maxX: halfW, minY: -halfH, maxY: halfH },
  };
}
