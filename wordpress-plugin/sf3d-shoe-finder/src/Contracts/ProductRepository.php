<?php

declare(strict_types=1);

namespace SF3D\Plugin\Contracts;

/**
 * قرارداد دسترسی به محصولات.
 */
interface ProductRepository
{
    /**
     * همه‌ی محصولات مطابق آرگومان‌ها.
     *
     * @param array<string,mixed> $args limit, categories, orderby, order, only_in_stock, include, exclude
     * @return array<int,array<string,mixed>>
     */
    public function all(array $args = array()): array;

    /**
     * یک محصول با شناسه.
     *
     * @param int $id شناسه‌ی محصول.
     * @return array<string,mixed>|null
     */
    public function find(int $id): ?array;

    /**
     * جستجوی متنی.
     *
     * @param string $query عبارت جستجو.
     * @param int    $limit حداکثر تعداد نتیجه.
     * @return array<int,array<string,mixed>>
     */
    public function search(string $query, int $limit = 5): array;

    /**
     * دسته‌بندی‌ها (کلکسیون‌ها).
     *
     * @return array<int,array{id:int,slug:string,name:string,count:int}>
     */
    public function categories(): array;

    /**
     * محصولات مرتبط.
     *
     * @param int $id    شناسه‌ی محصول.
     * @param int $limit حداکثر تعداد.
     * @return array<int,array<string,mixed>>
     */
    public function related(int $id, int $limit = 4): array;

    /**
     * فیلترهای قابل‌استفاده (ویژگی‌های سراسری ووکامرس مثل سایز/رنگ).
     *
     * @return array<int,array<string,mixed>>
     */
    public function filters(): array;
}
