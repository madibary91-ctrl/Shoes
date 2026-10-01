<?php

declare(strict_types=1);

namespace SF3D\Plugin\Cache;

use SF3D\Plugin\Contracts\CacheInterface;
use SF3D\Plugin\Hooks\EventRegistry;

/**
 * کش مبتنی بر Transient وردپرس.
 * فهرست کلیدها در یک option نگه‌داری می‌شود تا flush بدون wildcard ممکن باشد.
 */
final class TransientCache implements CacheInterface
{
    private const INDEX_OPTION = 'sf3d_cache_index';

    /**
     * @param mixed $default مقدار پیش‌فرض.
     * @return mixed
     */
    public function get(string $key, $default = null)
    {
        $value = get_transient($this->name($key));
        return $value === false ? $default : $value;
    }

    /**
     * @param mixed $value مقدار.
     */
    public function set(string $key, $value, int $ttl = 3600): bool
    {
        $name = $this->name($key);
        $ok   = set_transient($name, $value, max(0, $ttl));
        if ($ok) {
            $this->remember($name);
        }
        return (bool) $ok;
    }

    public function delete(string $key): bool
    {
        $name = $this->name($key);
        $this->forget($name);
        return delete_transient($name);
    }

    public function flush(): bool
    {
        $index = $this->index();
        foreach ($index as $name) {
            delete_transient($name);
        }
        update_option(self::INDEX_OPTION, array(), false);
        EventRegistry::fire(EventRegistry::A_CACHE_FLUSHED, count($index));
        return true;
    }

    private function name(string $key): string
    {
        // نام transient حداکثر ۱۷۲ نویسه
        return 'sf3d_' . md5($key);
    }

    /**
     * @return string[]
     */
    private function index(): array
    {
        $index = get_option(self::INDEX_OPTION, array());
        return is_array($index) ? array_map('strval', $index) : array();
    }

    private function remember(string $name): void
    {
        $index = $this->index();
        if (!in_array($name, $index, true)) {
            $index[] = $name;
            update_option(self::INDEX_OPTION, $index, false);
        }
    }

    private function forget(string $name): void
    {
        $index = array_values(array_diff($this->index(), array($name)));
        update_option(self::INDEX_OPTION, $index, false);
    }
}
