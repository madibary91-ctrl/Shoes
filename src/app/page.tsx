import Demo from "@/components/Demo";
import { buildBoot } from "@/lib/demo-data";
import { demoNonce, listProducts } from "@/lib/demo-db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await listProducts();
  const boot = buildBoot(products, demoNonce());

  return (
    <main className="relative min-h-screen">
      <link rel="stylesheet" href="/sf3d/sf3d.css" precedence="default" />
      <Demo boot={boot} />
      <a
        href="/sf3d-shoe-finder.zip"
        download
        className="fixed bottom-5 right-5 z-50 hidden min-h-12 items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white shadow-xl transition hover:opacity-90 md:flex"
      >
        ⬇ دانلود پلاگین وردپرس (ZIP)
      </a>
    </main>
  );
}
