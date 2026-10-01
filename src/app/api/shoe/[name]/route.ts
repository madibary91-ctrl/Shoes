import type { NextRequest } from "next/server";

// تولید SVG کفش (نمای کناری) با رنگ‌های دلخواه؛ rot زاویه‌ی چرخش برای گالری/۳۶۰
export async function GET(_req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const m = /^([0-9a-f]{6})-([0-9a-f]{6})-(\d{1,3})\.svg$/i.exec(name);
  if (!m) return new Response("Not found", { status: 404 });
  const c = `#${m[1]}`;
  const a = `#${m[2]}`;
  const rot = (Number(m[3]) * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sx = Math.sign(cos || 1) * Math.max(0.22, Math.abs(cos));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="416" viewBox="0 0 400 260">
  <ellipse cx="205" cy="226" rx="${(165 * Math.abs(sx)).toFixed(1)}" ry="9" fill="#000" opacity="0.14"/>
  <g transform="translate(200 130) scale(${sx.toFixed(3)} 1) translate(-200 -130)">
    <path d="M40 188 Q38 216 70 216 L350 216 Q378 216 372 192 L368 182 L40 182 Z" fill="#fafafa" stroke="#bdbdbd" stroke-width="2"/>
    <path d="M44 184 L44 122 Q44 98 72 94 L118 90 Q138 58 176 70 L216 106 Q262 110 302 126 Q366 142 371 184 Z" fill="${c}"/>
    <path d="M302 126 Q366 142 371 184 L300 184 Q312 152 302 126 Z" fill="${a}" opacity="0.28"/>
    <path d="M44 122 Q44 96 80 92 L102 92 L112 134 L50 138 Z" fill="${a}" opacity="0.85"/>
    <path d="M118 162 Q200 182 292 132" fill="none" stroke="${a}" stroke-width="9" stroke-linecap="round"/>
    <g stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.9">
      <path d="M150 90 L176 78"/><path d="M168 102 L194 90"/><path d="M188 114 L214 104"/>
    </g>
    <path d="M40 182 L368 182" stroke="#d4d4d4" stroke-width="3"/>
  </g>
</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, immutable" },
  });
}
