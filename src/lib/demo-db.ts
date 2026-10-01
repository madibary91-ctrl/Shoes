import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { demoCartItems, demoProducts } from "@/db/schema";
import { SEED_PRODUCTS, SEED_VERSION, type DemoProduct } from "@/lib/demo-data";

let ready: Promise<void> | null = null;

/** ساخت جدول‌ها (در صورت نبود) و seed محصولات نمونه */
export function ensureDemo(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await db.execute(sql`create table if not exists demo_products (id integer primary key, data jsonb not null)`);
      await db.execute(sql`create table if not exists demo_cart_items (
        id serial primary key, session text not null, product_id integer not null,
        variation_id integer not null default 0, quantity integer not null default 1,
        attrs text not null default '', created_at timestamp not null default now())`);
      const rows = await db.select().from(demoProducts);
      const fresh = rows.filter((r) => (r.data as { _v?: string })._v === SEED_VERSION).length;
      if (fresh !== SEED_PRODUCTS.length) {
        await db.delete(demoProducts);
        await db.insert(demoProducts).values(SEED_PRODUCTS.map((p) => ({ id: p.id, data: p })));
      }
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export async function listProducts(): Promise<DemoProduct[]> {
  await ensureDemo();
  const rows = await db.select().from(demoProducts).orderBy(demoProducts.id);
  return rows.map((r) => r.data as DemoProduct);
}

export async function findProduct(id: number): Promise<DemoProduct | null> {
  await ensureDemo();
  const rows = await db.select().from(demoProducts).where(eq(demoProducts.id, id));
  return rows[0] ? (rows[0].data as DemoProduct) : null;
}

/** nonce دمو: وابسته به روز، شبیه wp_create_nonce */
export function demoNonce(): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`sf3d-demo-${day}`).digest("hex").slice(0, 10);
}

const fmt = (n: number) => `${new Intl.NumberFormat("fa-IR").format(n)} تومان`;

/** تصویر لحظه‌ای وضعیت سبد (همان ساختار AjaxController::snapshot در PHP) */
export async function cartSnapshot(session: string) {
  const items = await db.select().from(demoCartItems).where(eq(demoCartItems.session, session)).orderBy(demoCartItems.id);
  const out = [];
  let count = 0;
  let subtotal = 0;
  for (const it of items) {
    const p = await findProduct(it.productId);
    if (!p) continue;
    const variations = (p.variations as { id: number; price: number; image: string }[]) || [];
    const v = variations.find((x) => x.id === it.variationId);
    const price = (v ? v.price : (p.price as number)) || 0;
    count += it.quantity;
    subtotal += price * it.quantity;
    out.push({
      key: String(it.id),
      product_id: it.productId,
      name: p.title as string,
      quantity: it.quantity,
      price_html: `<span>${fmt(price)}</span>`,
      image: (v && v.image) || (p.image as string),
      url: p.url as string,
      attributes: it.attrs,
    });
  }
  return { count, subtotal_html: `<span>${fmt(subtotal)}</span>`, items: out, cart_url: "#cart", checkout_url: "#checkout" };
}

export async function addCartItem(session: string, productId: number, variationId: number, quantity: number, attrs: string) {
  const existing = await db.select().from(demoCartItems).where(eq(demoCartItems.session, session));
  const same = existing.find((e) => e.productId === productId && e.variationId === variationId);
  if (same) {
    await db.update(demoCartItems).set({ quantity: same.quantity + quantity }).where(eq(demoCartItems.id, same.id));
    return String(same.id);
  }
  const [row] = await db.insert(demoCartItems).values({ session, productId, variationId, quantity, attrs }).returning({ id: demoCartItems.id });
  return String(row.id);
}

export async function removeCartItem(session: string, key: string) {
  const id = Number(key);
  if (!Number.isFinite(id)) return false;
  const res = await db.delete(demoCartItems).where(eq(demoCartItems.id, id)).returning({ id: demoCartItems.id });
  return res.length > 0 && !!session;
}
