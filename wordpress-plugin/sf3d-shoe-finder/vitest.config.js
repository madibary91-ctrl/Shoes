import { defineConfig } from 'vitest/config';

export default defineConfig({
  // جلوگیری از پیدا شدن postcss.config.mjs ریشه‌ی ریپو (مال Next.js).
  // آبجکت inline یعنی Vite دیگر دنبال فایل config نمی‌گردد.
  css: { postcss: {} },
  test: {
    include: ['tests/js/**/*.test.js'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
