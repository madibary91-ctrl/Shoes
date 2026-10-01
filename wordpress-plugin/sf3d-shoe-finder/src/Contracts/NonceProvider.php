<?php

declare(strict_types=1);

namespace SF3D\Plugin\Contracts;

/**
 * قرارداد تولید و بررسی nonce.
 */
interface NonceProvider
{
    public function create(): string;

    public function verify(string $nonce): bool;

    /**
     * تولید nonce تازه (برای صفحات کش‌شده).
     */
    public function refresh(): string;
}
