"use client";

import { useEffect, useRef } from "react";

type SF3DGlobal = {
  mount: (el: HTMLElement) => unknown;
  unmount: (el: HTMLElement) => void;
};

// اجرای همان باندل UMD پلاگین (assets/dist/sf3d.min.js) داخل صفحه
export default function Demo({ boot }: { boot: unknown }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = host.current;
    if (!wrapper) return;

    const root = document.createElement("div");
    root.className = "sf3d-root";
    root.setAttribute("data-sf3d", "1");
    root.style.setProperty("--sf3d-height", "100vh");
    const data = document.createElement("script");
    data.type = "application/json";
    data.setAttribute("data-sf3d-json", "");
    data.textContent = JSON.stringify(boot).replace(/</g, "\\u003c");
    root.appendChild(data);
    wrapper.appendChild(root);

    const w = window as unknown as { SF3D?: SF3DGlobal };
    const start = () => {
      if (w.SF3D && wrapper.contains(root)) w.SF3D.mount(root);
    };

    let script = document.querySelector<HTMLScriptElement>("script[data-sf3d-bundle]");
    if (w.SF3D) {
      start();
    } else if (script) {
      script.addEventListener("load", start, { once: true });
    } else {
      script = document.createElement("script");
      script.src = "/sf3d/sf3d.min.js";
      script.async = true;
      script.setAttribute("data-sf3d-bundle", "1");
      script.addEventListener("load", start, { once: true });
      document.body.appendChild(script);
    }

    return () => {
      try {
        w.SF3D?.unmount(root);
      } catch {
        /* بی‌اهمیت */
      }
      root.remove();
    };
  }, [boot]);

  return <div ref={host} />;
}
