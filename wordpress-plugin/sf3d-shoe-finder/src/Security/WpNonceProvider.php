<?php

declare(strict_types=1);

namespace SF3D\Plugin\Security;

use SF3D\Plugin\Contracts\NonceProvider;

/**
 * Nonce وردپرس برای درخواست‌های AJAX تغییردهنده (سبد خرید، علاقه‌مندی).
 */
final class WpNonceProvider implements NonceProvider
{
    public const ACTION = 'sf3d_ajax';

    public function create(): string
    {
        return wp_create_nonce(self::ACTION);
    }

    public function verify(string $nonce): bool
    {
        return $nonce !== '' && (bool) wp_verify_nonce($nonce, self::ACTION);
    }

    public function refresh(): string
    {
        return $this->create();
    }
}
