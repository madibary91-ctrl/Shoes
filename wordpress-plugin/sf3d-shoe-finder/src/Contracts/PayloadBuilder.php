<?php

declare(strict_types=1);

namespace SF3D\Plugin\Contracts;

/**
 * سازنده‌ی payload (داده‌ی JSON شبکه).
 */
interface PayloadBuilder
{
    /**
     * @param array<string,mixed> $args آرگومان‌های کوئری.
     * @return array<string,mixed>
     */
    public function build(array $args = array()): array;

    /**
     * @param array<string,mixed> $args آرگومان‌های کوئری.
     */
    public function toJson(array $args = array()): string;
}
