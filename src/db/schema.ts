import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// محصولات دموی شبیه‌ساز ووکامرس (ساختار JSON همان payload افزونه است)
export const demoProducts = pgTable("demo_products", {
  id: integer("id").primaryKey(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
});

// سبد خرید دمو به‌ازای هر نشست (کوکی)
export const demoCartItems = pgTable("demo_cart_items", {
  id: serial("id").primaryKey(),
  session: text("session").notNull(),
  productId: integer("product_id").notNull(),
  variationId: integer("variation_id").notNull().default(0),
  quantity: integer("quantity").notNull().default(1),
  attrs: text("attrs").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
