// نقطه‌ی ورود: API عمومی window.SF3D + راه‌اندازی خودکار + اتصال به Elementor
import { App } from './core/App.js';

export const version = '2.0.0';

const registry = new Map();
export const apps = [];

/**
 * ثبت پلاگین جاوااسکریپت
 * SF3D.use('my-plugin', { init(app) {}, hooks: { 'tile:click': (tile) => {} } })
 */
export function use(name, plugin) {
  if (!name || !plugin || registry.has(name)) return;
  registry.set(name, plugin);
  apps.forEach((a) => a.ready && a.usePlugin(name, plugin));
}

function readBoot(el) {
  const script = el.querySelector('script[data-sf3d-json]');
  if (!script) throw new Error('[SF3D] data script not found');
  return JSON.parse(script.textContent || '{}');
}

/** نصب روی یک المنت ریشه */
export function mount(el, boot) {
  if (el.__sf3d) return el.__sf3d;
  const data = boot || readBoot(el);
  const app = new App(el, data);
  el.__sf3d = app;
  apps.push(app);
  app.init(registry);
  return app;
}

export function unmount(el) {
  const app = el && el.__sf3d;
  if (!app) return;
  app.destroy();
  apps.splice(apps.indexOf(app), 1);
  delete el.__sf3d;
}

export function init(scope = document) {
  scope.querySelectorAll('.sf3d-root[data-sf3d]').forEach((el) => {
    try {
      mount(el);
    } catch (e) {
      if (typeof console !== 'undefined') console.error(e);
    }
  });
}

if (typeof window !== 'undefined') {
  const start = () => init();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // Elementor: ویجت در ویرایشگر/پیش‌نمایش زنده
  window.addEventListener('elementor/frontend/init', () => {
    const ef = window.elementorFrontend;
    if (ef && ef.hooks) {
      ef.hooks.addAction('frontend/element_ready/sf3d_shoe_finder.default', ($scope) => {
        init($scope[0]);
      });
    }
  });
}
