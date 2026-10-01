<?php

declare(strict_types=1);

namespace SF3D\Plugin\Contracts;

/**
 * قرارداد کش؛ پیاده‌سازی (Transient/Null/...) پشت آن پنهان است.
 */
interface CacheInterface
{
    /**
     * @param string $key     کلید.
     * @param mixed  $default مقدار پیش‌فرض.
     * @return mixed
     */
    public function get(string $key, $default = null);

    /**
     * @param string $key   کلید.
     * @param mixed  $value مقدار.
     * @param int    $ttl   مدت (ثانیه).
     */
    public function set(string $key, $value, int $ttl = 3600): bool;

    public function delete(string $key): bool;

    /**
     * پاک‌کردن همه‌ی کلیدهای این افزونه.
     */
    public function flush(): bool;
}
