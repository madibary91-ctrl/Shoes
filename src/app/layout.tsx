import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SF3D Shoe Finder — ویجت المنتور سه‌بعدی برای ووکامرس",
  description: "دموی زنده‌ی افزونه‌ی SF3D Shoe Finder: شبکه‌ی سه‌بعدی محصولات، فیلتر، علاقه‌مندی‌ها و سبد خرید AJAX.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-neutral-200 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
