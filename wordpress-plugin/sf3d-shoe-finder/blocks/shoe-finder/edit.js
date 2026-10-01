/* eslint-env browser */
// ویرایشگر بلوک: InspectorControls با همان تنظیمات ویجت المنتور (بدون نیاز به build)
(function (wp) {
  var el = wp.element.createElement;
  var __ = wp.i18n.__;
  var InspectorControls = wp.blockEditor.InspectorControls;
  var useBlockProps = wp.blockEditor.useBlockProps;
  var C = wp.components;

  var FEATURES = [
    ['wishlist', 'علاقه‌مندی‌ها'], ['quick_actions', 'Quick Actions'], ['badges', 'نشان‌ها'], ['gallery', 'گالری تصاویر'],
    ['related', 'محصولات مشابه'], ['search', 'جستجوی زنده'], ['dark_mode', 'تم تاریک'], ['filters', 'فیلتر سایز/رنگ'],
    ['sort', 'مرتب‌سازی'], ['bulk', 'انتخاب چندگانه'], ['recent', 'اخیراً دیده‌شده'], ['cart_drawer', 'دراور سبد'],
    ['minimap', 'مینی‌مپ'], ['hash_sync', 'لینک مستقیم'],
  ];

  function Edit(props) {
    var a = props.attributes;
    var set = props.setAttributes;
    var td = 'sf3d-shoe-finder';
    function field(Control, key, label, extra) {
      return el(Control, Object.assign({ key: key, label: __(label, td), value: a[key], onChange: function (v) { var o = {}; o[key] = v; set(o); } }, extra || {}));
    }

    var panels = [
      el(C.PanelBody, { key: 'q', title: __('محصولات', td), initialOpen: true },
        field(C.TextControl, 'title', 'عنوان هدر'),
        field(C.RangeControl, 'limit', 'تعداد محصولات', { min: 1, max: 300 }),
        field(C.TextControl, 'categories', 'دسته‌ها (slug با ویرگول)'),
        field(C.SelectControl, 'orderby', 'مرتب‌سازی', { options: [
          { value: 'date', label: 'جدیدترین' }, { value: 'title', label: 'عنوان' }, { value: 'price', label: 'قیمت' },
          { value: 'popularity', label: 'محبوبیت' }, { value: 'menu_order', label: 'ترتیب دستی' }, { value: 'rand', label: 'تصادفی' } ] }),
        field(C.SelectControl, 'order', 'جهت', { options: [{ value: 'DESC', label: 'نزولی' }, { value: 'ASC', label: 'صعودی' }] }),
        field(C.ToggleControl, 'only_in_stock', 'فقط موجود', { checked: !!a.only_in_stock })),
      el(C.PanelBody, { key: 'l', title: __('چیدمان', td), initialOpen: false },
        field(C.TextControl, 'height', 'ارتفاع (مثلاً 100vh یا 720px)'),
        field(C.RangeControl, 'columns', 'ستون‌ها', { min: 1, max: 20 }),
        field(C.RangeControl, 'item_size', 'اندازه‌ی کاشی', { min: 1, max: 6, step: 0.1 }),
        field(C.RangeControl, 'gap', 'فاصله', { min: 0, max: 3, step: 0.1 }),
        field(C.SelectControl, 'theme', 'تم', { options: [{ value: 'auto', label: 'خودکار' }, { value: 'light', label: 'روشن' }, { value: 'dark', label: 'تاریک' }] }),
        field(C.SelectControl, 'card_position', 'جایگاه کارت', { options: [{ value: 'end', label: 'انتها' }, { value: 'start', label: 'ابتدا' }] })),
      el(C.PanelBody, { key: 'f', title: __('قابلیت‌ها', td), initialOpen: false },
        FEATURES.map(function (f) {
          return field(C.ToggleControl, f[0], f[1], { checked: !!a[f[0]] });
        })),
    ];

    var blockProps = useBlockProps({ className: 'sf3d-block-placeholder', style: { padding: '32px', textAlign: 'center', background: '#ececec', border: '1px dashed #999', borderRadius: '12px', direction: 'rtl' } });
    return el('div', blockProps,
      el(InspectorControls, null, panels),
      el('strong', null, 'SF3D Shoe Finder'),
      el('p', { style: { margin: '8px 0 0' } }, __('شبکه‌ی سه‌بعدی محصولات — پیش‌نمایش در سایت نمایش داده می‌شود.', td)),
      el('small', null, (a.limit || 60) + ' ' + __('محصول', td) + ' · ' + (a.columns || 8) + ' ' + __('ستون', td)));
  }

  window.SF3DBlock = window.SF3DBlock || {};
  window.SF3DBlock.edit = Edit;
})(window.wp);
