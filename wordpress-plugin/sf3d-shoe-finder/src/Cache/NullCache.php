<?php

declare(strict_types=1);

namespace SF3D\Plugin\Cache;

use SF3D\Plugin\Contracts\CacheInterface;

/**
 * کش بی‌اثر؛ برای تست و حالت دیباگ.
 */
final class NullCache implements CacheInterface
{
    /**
     * @param mixed $default مقدار پیش‌فرض.
     * @return mixed
     */
    public function get(string $key, $default = null)
    {
        return $default;
    }

    /**
     * @param mixed $value مقدار.
     */
    public function set(string $key, $value, int $ttl = 3600): bool
    {
        return true;
    }

    public function delete(string $key): bool
    {
        return true;
    }

    public function flush(): bool
    {
        return true;
    }
}
