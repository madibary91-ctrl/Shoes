import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// تنظیمات باندل: خروجی UMD با نام سراسری SF3D
// development => assets/dist/sf3d.js (+ source map)
// production  => assets/dist/sf3d.min.js (terser)
export default defineConfig(({ mode }) => {
  const prod = mode === 'production';
  return {
    publicDir: false,
    // جلوگیری از پیدا شدن postcss.config.mjs ریشه‌ی ریپو (مال Next.js)
    css: { postcss: {} },
    build: {
      outDir: 'assets/dist',
      emptyOutDir: false,
      sourcemap: !prod,
      minify: prod ? 'terser' : false,
      target: 'es2019',
      lib: {
        entry: resolve(__dirname, 'assets/src/index.js'),
        name: 'SF3D',
        formats: ['umd'],
        fileName: () => (prod ? 'sf3d.min.js' : 'sf3d.js'),
      },
      rollupOptions: {
        output: { inlineDynamicImports: true, exports: 'named' },
      },
      terserOptions: { compress: { passes: 2 }, format: { comments: false } },
    },
  };
});
