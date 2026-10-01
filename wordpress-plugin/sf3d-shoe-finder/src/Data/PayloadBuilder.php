<?php

declare(strict_types=1);

namespace SF3D\Plugin\Data;

use SF3D\Plugin\Contracts\CacheInterface;
use SF3D\Plugin\Contracts\PayloadBuilder as PayloadBuilderContract;
use SF3D\Plugin\Contracts\ProductRepository;
use SF3D\Plugin\Hooks\EventRegistry;

/**
 * سازنده‌ی payload با کش یک‌ساعته؛ به Repository و Cache وابسته است.
 */
final class PayloadBuilder implements PayloadBuilderContract
{
    public const VERSION     = 3;
    public const DEFAULT_TTL = 3600; // ۱ ساعت

    /** @var ProductRepository */
    private $repository;

    /** @var CacheInterface */
    private $cache;

    public function __construct(ProductRepository $repository, CacheInterface $cache)
    {
        $this->repository = $repository;
        $this->cache      = $cache;
    }

    /**
     * @param array<string,mixed> $args آرگومان‌های کوئری.
     * @return array<string,mixed>
     */
    public function build(array $args = array()): array
    {
        $key = (string) EventRegistry::apply(
            EventRegistry::F_CACHE_KEY,
            'payload_' . md5((string) wp_json_encode($args) . '|' . get_locale() . '|' . self::VERSION),
            $args
        );

        $cached = $this->cache->get($key);
        if (is_array($cached) && isset($cached['products'])) {
            return $cached;
        }

        $collections = $this->repository->categories();
        array_unshift(
            $collections,
            array('id' => 0, 'slug' => 'all', 'name' => __('همه', 'sf3d-shoe-finder'), 'count' => 0)
        );

        $payload = array(
            'version'      => self::VERSION,
            'generated_at' => gmdate('c'),
            'products'     => $this->repository->all($args),
            'collections'  => EventRegistry::apply(EventRegistry::F_COLLECTIONS, $collections, $args),
            'filters'      => EventRegistry::apply(EventRegistry::F_FILTERS, $this->repository->filters(), $args),
        );
        $payload['collections'][0]['count'] = count($payload['products']);

        /**
         * فیلتر کل payload.
         *
         * @param array $payload payload.
         * @param array $args    آرگومان‌ها.
         */
        $payload = (array) EventRegistry::apply(EventRegistry::F_PAYLOAD, $payload, $args);

        $ttl = (int) EventRegistry::apply(EventRegistry::F_CACHE_TTL, self::DEFAULT_TTL, $key, $args);
        $this->cache->set($key, $payload, $ttl);

        return $payload;
    }

    /**
     * @param array<string,mixed> $args آرگومان‌های کوئری.
     */
    public function toJson(array $args = array()): string
    {
        $json = wp_json_encode($this->build($args), JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
        return is_string($json) ? $json : '{}';
    }
}
