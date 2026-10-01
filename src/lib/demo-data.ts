// داده‌ی نمونه‌ی شبیه‌ساز ووکامرس؛ ساختار خروجی دقیقاً مطابق payload پلاگین است.

export const SEED_VERSION = "v3";

export type DemoProduct = Record<string, unknown> & { id: number };

const SIZES = ["39", "40", "41", "42", "43", "44", "45"];

const COLORS: Record<string, { label: string; hex: string; accent: string }> = {
  black: { label: "مشکی", hex: "#1f1f23", accent: "#e5e5e5" },
  white: { label: "سفید", hex: "#f2f2f2", accent: "#2a2a2a" },
  red: { label: "قرمز", hex: "#dc2626", accent: "#fafafa" },
  blue: { label: "آبی", hex: "#2563eb", accent: "#fafafa" },
  green: { label: "سبز", hex: "#16a34a", accent: "#fafafa" },
  orange: { label: "نارنجی", hex: "#f97316", accent: "#1f1f23" },
  yellow: { label: "زرد", hex: "#eab308", accent: "#1f1f23" },
  pink: { label: "صورتی", hex: "#ec4899", accent: "#fafafa" },
  grey: { label: "طوسی", hex: "#9ca3af", accent: "#1f1f23" },
};

const CATS = [
  { id: 11, slug: "running", name: "دویدن" },
  { id: 12, slug: "lifestyle", name: "روزمره" },
  { id: 13, slug: "basketball", name: "بسکتبال" },
];

type Spec = {
  id: number;
  title: string;
  cat: number;
  color: keyof typeof COLORS;
  colors: (keyof typeof COLORS)[];
  price: number;
  discount?: number;
  ageDays: number;
  stock: number | null;
  variable: boolean;
  frames?: number;
};

const SPECS: Spec[] = [
  { id: 101, title: "ایر مکس پالس", cat: 11, color: "red", colors: ["red", "black", "white"], price: 5200000, discount: 20, ageDays: 40, stock: null, variable: true },
  { id: 102, title: "رانر پرو ۲", cat: 11, color: "blue", colors: ["blue", "orange"], price: 4100000, ageDays: 3, stock: null, variable: true },
  { id: 103, title: "اولترا بوست", cat: 11, color: "black", colors: ["black", "grey", "green"], price: 6900000, ageDays: 90, stock: null, variable: true },
  { id: 104, title: "سوییفت لایت", cat: 11, color: "orange", colors: ["orange", "yellow"], price: 3300000, discount: 15, ageDays: 20, stock: null, variable: true },
  { id: 105, title: "تریل بلیز", cat: 11, color: "green", colors: ["green", "black"], price: 4700000, ageDays: 55, stock: 3, variable: false },
  { id: 106, title: "کلاود استپ", cat: 11, color: "grey", colors: ["grey", "pink"], price: 3900000, ageDays: 5, stock: 8, variable: false },
  { id: 107, title: "اسکای وکر", cat: 12, color: "white", colors: ["white", "black", "blue"], price: 4400000, ageDays: 70, stock: null, variable: true },
  { id: 108, title: "ریترو ۸۶", cat: 12, color: "yellow", colors: ["yellow", "white"], price: 3600000, discount: 30, ageDays: 120, stock: null, variable: true },
  { id: 109, title: "استریت کلاسیک", cat: 12, color: "black", colors: ["black", "white"], price: 2900000, ageDays: 2, stock: 25, variable: false },
  { id: 110, title: "اورجینال ۹۰", cat: 12, color: "pink", colors: ["pink", "white", "grey"], price: 4200000, ageDays: 30, stock: null, variable: true },
  { id: 111, title: "کورت لو", cat: 12, color: "blue", colors: ["blue", "white"], price: 3100000, ageDays: 6, stock: 0, variable: false },
  { id: 112, title: "متروپولیس", cat: 12, color: "grey", colors: ["grey", "black"], price: 3800000, ageDays: 200, stock: 14, variable: false },
  { id: 113, title: "جامپ ایلیت", cat: 13, color: "red", colors: ["red", "black", "yellow"], price: 7400000, ageDays: 4, stock: null, variable: true, frames: 12 },
  { id: 114, title: "دانک های", cat: 13, color: "black", colors: ["black", "red"], price: 6200000, discount: 10, ageDays: 80, stock: null, variable: true },
  { id: 115, title: "کورت کینگ", cat: 13, color: "white", colors: ["white", "blue"], price: 5600000, ageDays: 35, stock: 4, variable: false },
  { id: 116, title: "ایر دانک ۲", cat: 13, color: "orange", colors: ["orange", "black"], price: 6800000, ageDays: 1, stock: null, variable: true },
  { id: 117, title: "هوپ مستر", cat: 13, color: "green", colors: ["green", "white"], price: 5100000, discount: 25, ageDays: 150, stock: 9, variable: false },
  { id: 118, title: "فست بریک", cat: 13, color: "blue", colors: ["blue", "grey"], price: 4900000, ageDays: 15, stock: null, variable: true },
];

export function shoeUrl(hex: string, accent: string, rot = 0): string {
  return `/api/shoe/${hex.replace("#", "")}-${accent.replace("#", "")}-${rot}.svg`;
}

function build(spec: Spec): DemoProduct {
  const main = COLORS[spec.color];
  const frames = spec.frames ?? 4;
  const gallery: string[] =
    frames > 8
      ? Array.from({ length: frames }, (_, i) => shoeUrl(main.hex, main.accent, Math.round((i * 360) / frames)))
      : [0, 25, 50, 70].slice(0, frames).map((r) => shoeUrl(main.hex, main.accent, r));

  const regular = spec.discount ? Math.round(spec.price / (1 - spec.discount / 100) / 10000) * 10000 : spec.price;
  const created = new Date(Date.now() - spec.ageDays * 86400000).toISOString();

  const variations: Record<string, unknown>[] = [];
  let total = 0;
  if (spec.variable) {
    spec.colors.forEach((ck, ci) => {
      const col = COLORS[ck];
      SIZES.forEach((size, si) => {
        const seed = (spec.id + ci * 7 + si * 3) % 11;
        const qty = seed === 0 ? 0 : seed < 4 ? seed : seed * 3;
        total += qty;
        variations.push({
          id: spec.id * 100 + ci * 10 + si,
          attributes: { attribute_pa_size: size, attribute_pa_color: ck },
          in_stock: qty > 0,
          price: spec.price,
          regular_price: regular,
          stock_quantity: qty,
          image: shoeUrl(col.hex, col.accent, 0),
        });
      });
    });
  }

  const sizesUsed = spec.variable ? SIZES : [];
  return {
    id: spec.id,
    title: spec.title,
    slug: `shoe-${spec.id}`,
    url: `#product-${spec.id}`,
    excerpt: "کفش سبک و راحت با زیره‌ی ضدلغزش، مناسب استفاده‌ی روزانه و ورزشی.",
    type: spec.variable ? "variable" : "simple",
    image: shoeUrl(main.hex, main.accent, 0),
    gallery,
    price: spec.price,
    price_min: spec.price,
    price_max: spec.price,
    regular_price: regular,
    on_sale: !!spec.discount,
    discount: spec.discount ?? 0,
    is_new: spec.ageDays <= 7,
    in_stock: spec.variable ? total > 0 : (spec.stock ?? 1) > 0,
    stock_quantity: spec.variable ? total : spec.stock,
    low_stock_threshold: 2,
    categories: [spec.cat],
    attributes: { size: sizesUsed, color: spec.colors },
    variation_attributes: spec.variable
      ? [
          { name: "attribute_pa_size", key: "size", label: "سایز", type: "select", options: SIZES.map((s) => ({ value: s, label: s, hex: "", thumb: "" })) },
          { name: "attribute_pa_color", key: "color", label: "رنگ", type: "color", options: spec.colors.map((c) => ({ value: c, label: COLORS[c].label, hex: COLORS[c].hex, thumb: "" })) },
        ]
      : [],
    variations,
    primary_color_hex: main.hex,
    popularity: (spec.id * 37) % 500,
    date: created,
    _v: SEED_VERSION,
  };
}

export const SEED_PRODUCTS: DemoProduct[] = SPECS.map(build);

export function buildBoot(products: DemoProduct[], nonce: string) {
  return {
    config: {
      ajaxUrl: "/api/demo/%%endpoint%%",
      nonce,
      locale: "fa-IR",
      rtl: true,
      isLoggedIn: false,
      wishlist: [],
      title: "SF3D Shoe Finder",
      height: "100vh",
      theme: "auto",
      cardPosition: "end",
      startCollection: "all",
      grid: {},
      features: {},
      currency: { symbol: "تومان", position: "right_space", decimals: 0, decimalSep: ".", thousandSep: "," },
      cartUrl: "#cart",
      checkoutUrl: "#checkout",
    },
    payload: {
      version: 3,
      products,
      collections: [{ id: 0, slug: "all", name: "همه", count: products.length }, ...CATS.map((c) => ({ ...c, count: products.filter((p) => (p.categories as number[]).includes(c.id)).length }))],
      filters: [
        { key: "size", label: "سایز", type: "select", options: SIZES.map((s) => ({ value: s, label: s, hex: "" })) },
        { key: "color", label: "رنگ", type: "color", options: Object.entries(COLORS).map(([value, c]) => ({ value, label: c.label, hex: c.hex })) },
      ],
    },
  };
}
