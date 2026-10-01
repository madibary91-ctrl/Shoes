// همگام‌سازی hash آدرس: #product-12&filter=size:42,color:red&sort=price-asc&collection=running

/** @returns {{product:number|null, filter:Object, sort:string, collection:string}} */
export function parseHash(hash = location.hash) {
  const out = { product: null, filter: {}, sort: '', collection: '' };
  const raw = String(hash || '').replace(/^#/, '');
  if (!raw) return out;
  raw.split('&').forEach((part) => {
    const m = /^product-(\d+)$/.exec(part);
    if (m) {
      out.product = Number(m[1]);
      return;
    }
    const eq = part.indexOf('=');
    if (eq < 0) return;
    const key = part.slice(0, eq);
    const val = decodeURIComponent(part.slice(eq + 1));
    if (key === 'filter') {
      val.split(',').forEach((pair) => {
        const [k, v] = pair.split(':');
        if (k && v) (out.filter[k] = out.filter[k] || []).push(v);
      });
    } else if (key === 'sort') out.sort = val;
    else if (key === 'collection') out.collection = val;
  });
  return out;
}

export function buildHash({ product, filter, sort, collection }) {
  const parts = [];
  if (product) parts.push(`product-${product}`);
  const f = Object.entries(filter || {})
    .flatMap(([k, vals]) => (vals || []).map((v) => `${k}:${v}`))
    .join(',');
  if (f) parts.push(`filter=${encodeURIComponent(f)}`);
  if (sort && sort !== 'default') parts.push(`sort=${encodeURIComponent(sort)}`);
  if (collection && collection !== 'all') parts.push(`collection=${encodeURIComponent(collection)}`);
  return parts.length ? `#${parts.join('&')}` : '';
}

export function writeHash(state) {
  const next = buildHash(state);
  const url = location.pathname + location.search + next;
  if (location.hash !== next) history.replaceState(null, '', url);
}
