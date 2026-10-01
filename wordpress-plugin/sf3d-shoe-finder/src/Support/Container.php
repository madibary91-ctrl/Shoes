<?php

declare(strict_types=1);

namespace SF3D\Plugin\Support;

use RuntimeException;

/**
 * کانتینر ساده‌ی تزریق وابستگی.
 */
final class Container
{
    /** @var array<string,array{factory:callable,shared:bool}> */
    private $bindings = array();

    /** @var array<string,mixed> */
    private $instances = array();

    /**
     * ثبت factory که هر بار نمونه‌ی جدید می‌سازد.
     *
     * @param string   $id      شناسه (معمولاً نام کلاس/اینترفیس).
     * @param callable $factory تابع سازنده؛ کانتینر را می‌گیرد.
     */
    public function bind(string $id, callable $factory): void
    {
        $this->bindings[$id] = array('factory' => $factory, 'shared' => false);
        unset($this->instances[$id]);
    }

    /**
     * ثبت factory که فقط یک بار اجرا می‌شود.
     */
    public function singleton(string $id, callable $factory): void
    {
        $this->bindings[$id] = array('factory' => $factory, 'shared' => true);
        unset($this->instances[$id]);
    }

    /**
     * ثبت نمونه‌ی آماده.
     *
     * @param mixed $instance نمونه.
     */
    public function instance(string $id, $instance): void
    {
        $this->instances[$id] = $instance;
    }

    public function has(string $id): bool
    {
        return isset($this->instances[$id]) || isset($this->bindings[$id]);
    }

    /**
     * @return mixed
     * @throws RuntimeException اگر سرویس ثبت نشده باشد.
     */
    public function make(string $id)
    {
        if (isset($this->instances[$id])) {
            return $this->instances[$id];
        }
        if (!isset($this->bindings[$id])) {
            throw new RuntimeException(sprintf('SF3D: service "%s" is not registered.', $id));
        }
        $binding = $this->bindings[$id];
        $value   = ($binding['factory'])($this);
        if ($binding['shared']) {
            $this->instances[$id] = $value;
        }
        return $value;
    }
}
