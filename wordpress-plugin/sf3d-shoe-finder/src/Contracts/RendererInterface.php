<?php

declare(strict_types=1);

namespace SF3D\Plugin\Contracts;

/**
 * قرارداد رندر HTML ویجت.
 */
interface RendererInterface
{
    /**
     * @param array<string,mixed> $settings تنظیمات نرمال‌شده (Support\Settings::normalize).
     * @return string HTML نهایی.
     */
    public function render(array $settings = array()): string;

    /**
     * پیکربندی نهایی ارسالی به جاوااسکریپت.
     *
     * @param array<string,mixed> $settings تنظیمات نرمال‌شده.
     * @return array<string,mixed>
     */
    public function config(array $settings = array()): array;
}
