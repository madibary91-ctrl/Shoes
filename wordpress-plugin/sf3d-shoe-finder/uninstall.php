<?php
/**
 * پاک‌سازی هنگام حذف افزونه.
 *
 * @package SF3D
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

$index = get_option('sf3d_cache_index', array());
if (is_array($index)) {
    foreach ($index as $name) {
        delete_transient((string) $name);
    }
}
delete_option('sf3d_cache_index');
// user_meta علاقه‌مندی‌ها (sf3d_wishlist) عمداً حفظ می‌شود.
