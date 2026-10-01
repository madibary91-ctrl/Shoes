import { NextRequest, NextResponse } from "next/server";
import { addCartItem, cartSnapshot, demoNonce, findProduct, listProducts, removeCartItem } from "@/lib/demo-db";

// شبیه‌ساز اندپوینت‌های wc-ajax پلاگین (sf3d_*) با همان قالب {success, data}
const COOKIE = "sf3d_demo";

type Variation = { id: number; in_stock: boolean; attributes: Record<string, string> };

const ok = (data: unknown, session?: string, isNew = false) => {
  const res = NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  if (isNew && session) res.cookies.set(COOKIE, session, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 86400 * 7 });
  return res;
};
const fail = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, data: { code, message, ...extra } }, { status, headers: { "Cache-Control": "no-store" } });

function sessionOf(req: NextRequest) {
  const existing = req.cookies.get(COOKIE)?.value;
  return existing ? { id: existing, isNew: false } : { id: crypto.randomUUID(), isNew: true };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ endpoint: string }> }) {
  const { endpoint } = await ctx.params;
  const q = req.nextUrl.searchParams;
  const s = sessionOf(req);

  switch (endpoint) {
    case "sf3d_cart":
      return ok({ cart: await cartSnapshot(s.id) }, s.id, s.isNew);
    case "sf3d_nonce":
      return ok({ nonce: demoNonce() });
    case "sf3d_product": {
      const p = await findProduct(Number(q.get("id")));
      return p ? ok({ product: p }) : fail(404, "not_found", "محصول پیدا نشد.");
    }
    case "sf3d_related": {
      const id = Number(q.get("id"));
      const all = await listProducts();
      const me = all.find((p) => p.id === id);
      const cats = (me?.categories as number[]) || [];
      const rel = all.filter((p) => p.id !== id && (p.categories as number[]).some((c) => cats.includes(c))).slice(0, 4);
      return ok({ products: rel });
    }
    case "sf3d_search": {
      const term = (q.get("q") || "").trim().toLowerCase();
      const all = await listProducts();
      return ok({ products: term ? all.filter((p) => String(p.title).toLowerCase().includes(term)).slice(0, 5) : [] });
    }
    case "sf3d_wishlist":
      return ok({ ids: [] });
    default:
      return fail(404, "unknown", "اندپوینت ناشناخته است.");
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ endpoint: string }> }) {
  const { endpoint } = await ctx.params;
  const form = await req.formData();
  const s = sessionOf(req);

  // بررسی nonce (معادل guard() در AjaxController)
  if (form.get("nonce") !== demoNonce()) {
    return fail(403, "bad_nonce", "نشست شما منقضی شده است. دوباره تلاش کنید.", { nonce: demoNonce() });
  }

  if (endpoint === "sf3d_add_to_cart") {
    const productId = Number(form.get("product_id"));
    const variationId = Number(form.get("variation_id") || 0);
    const quantity = Math.max(1, Number(form.get("quantity") || 1));
    const product = await findProduct(productId);
    if (!product) return fail(400, "not_purchasable", "این محصول قابل خرید نیست.");

    const picked: Record<string, string> = {};
    for (const [k, v] of form.entries()) {
      const m = /^variation\[(.+)\]$/.exec(k);
      if (m) picked[m[1]] = String(v);
    }
    if (product.type === "variable") {
      const v = ((product.variations as Variation[]) || []).find((x) => x.id === variationId);
      if (!v) return fail(400, "add_failed", "لطفاً گزینه‌های محصول را انتخاب کنید.");
      if (!v.in_stock) return fail(400, "add_failed", "این گزینه ناموجود است.");
    } else if (!product.in_stock) {
      return fail(400, "add_failed", "این محصول ناموجود است.");
    }
    const labels = Object.entries(picked).map(([k, v]) => `${k.replace("attribute_pa_", "")}: ${v}`).join("، ");
    const key = await addCartItem(s.id, productId, variationId, quantity, labels);
    return ok({ cart_item_key: key, cart: await cartSnapshot(s.id) }, s.id, s.isNew);
  }

  if (endpoint === "sf3d_remove_from_cart") {
    const removed = await removeCartItem(s.id, String(form.get("cart_item_key") || ""));
    if (!removed) return fail(400, "remove_failed", "حذف ممکن نشد.");
    return ok({ cart: await cartSnapshot(s.id) }, s.id, s.isNew);
  }

  if (endpoint === "sf3d_wishlist") {
    const ids = String(form.get("ids") || "").split(",").map(Number).filter(Boolean);
    return ok({ ids });
  }

  return fail(404, "unknown", "اندپوینت ناشناخته است.");
}
