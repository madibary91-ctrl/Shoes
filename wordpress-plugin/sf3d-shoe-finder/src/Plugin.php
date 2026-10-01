<?php

declare(strict_types=1);

namespace SF3D\Plugin;

use SF3D\Plugin\Ajax\AjaxController;
use SF3D\Plugin\Assets\Assets;
use SF3D\Plugin\Cache\TransientCache;
use SF3D\Plugin\Contracts\CacheInterface;
use SF3D\Plugin\Contracts\NonceProvider;
use SF3D\Plugin\Contracts\PayloadBuilder as PayloadBuilderContract;
use SF3D\Plugin\Contracts\ProductRepository;
use SF3D\Plugin\Contracts\RendererInterface;
use SF3D\Plugin\Data\PayloadBuilder;
use SF3D\Plugin\Data\WooCommerceProductRepository;
use SF3D\Plugin\Hooks\EventRegistry;
use SF3D\Plugin\Renderer\Renderer;
use SF3D\Plugin\Renderer\Shortcode;
use SF3D\Plugin\Security\WpNonceProvider;
use SF3D\Plugin\Support\Container;
use SF3D\Plugin\Widget\Block;
use SF3D\Plugin\Widget\ElementorIntegration;

/**
 * نقطه‌ی مرکزی افزونه: ثبت سرویس‌ها و هوک‌ها.
 */
final class Plugin
{
    public const VERSION = '2.0.0';

    /** @var Plugin|null */
    private static $instance = null;

    /** @var string */
    private $file;

    /** @var Container */
    private $container;

    private function __construct(string $file)
    {
        $this->file      = $file;
        $this->container = new Container();
    }

    /**
     * راه‌اندازی افزونه (idempotent).
     */
    public static function boot(string $file): self
    {
        if (self::$instance === null) {
            self::$instance = new self($file);
            self::$instance->registerServices();
            self::$instance->init();
        }
        return self::$instance;
    }

    public static function instance(): self
    {
        if (self::$instance === null) {
            throw new \RuntimeException('SF3D: plugin is not booted yet.');
        }
        return self::$instance;
    }

    public function container(): Container
    {
        return $this->container;
    }

    /**
     * ثبت bindingها؛ Widget و Shortcode فقط از Container سرویس می‌گیرند.
     */
    private function registerServices(): void
    {
        $c    = $this->container;
        $dir  = plugin_dir_path($this->file);
        $url  = plugin_dir_url($this->file);

        $c->singleton(EventRegistry::class, static function (): EventRegistry {
            return new EventRegistry();
        });
        $c->singleton(CacheInterface::class, static function (): CacheInterface {
            return new TransientCache();
        });
        $c->singleton(ProductRepository::class, static function (): ProductRepository {
            return new WooCommerceProductRepository();
        });
        $c->singleton(NonceProvider::class, static function (): NonceProvider {
            return new WpNonceProvider();
        });
        $c->singleton(PayloadBuilderContract::class, static function (Container $c): PayloadBuilderContract {
            return new PayloadBuilder($c->make(ProductRepository::class), $c->make(CacheInterface::class));
        });
        $c->singleton(Assets::class, static function () use ($dir, $url): Assets {
            return new Assets($dir, $url);
        });
        $c->singleton(RendererInterface::class, static function (Container $c) use ($dir): RendererInterface {
            return new Renderer(
                $c->make(PayloadBuilderContract::class),
                $c->make(NonceProvider::class),
                $c->make(Assets::class),
                $dir . 'templates'
            );
        });
        $c->singleton(Shortcode::class, static function (Container $c): Shortcode {
            return new Shortcode($c->make(RendererInterface::class));
        });
        $c->singleton(AjaxController::class, static function (Container $c): AjaxController {
            return new AjaxController($c->make(ProductRepository::class), $c->make(NonceProvider::class));
        });
        $c->singleton(ElementorIntegration::class, static function (Container $c): ElementorIntegration {
            return new ElementorIntegration($c);
        });
        $c->singleton(Block::class, static function (Container $c) use ($dir, $url): Block {
            return new Block($c->make(RendererInterface::class), $dir, $url);
        });
    }

    private function init(): void
    {
        $c      = $this->container;
        $events = $c->make(EventRegistry::class);

        $events->listen('init', array($c->make(Assets::class), 'register'));
        $c->make(Shortcode::class)->register();
        $c->make(AjaxController::class)->register();
        $c->make(Block::class)->register();
        $c->make(ElementorIntegration::class)->register();

        $this->registerCacheInvalidation($events, $c->make(CacheInterface::class));

        /**
         * بعد از bootstrap کامل.
         *
         * @param Plugin $plugin نمونه‌ی افزونه.
         */
        EventRegistry::fire(EventRegistry::A_LOADED, $this);
    }

    /**
     * با هر ذخیره/ویرایش محصول (و تغییر موجودی/دسته) کش پاک می‌شود.
     */
    private function registerCacheInvalidation(EventRegistry $events, CacheInterface $cache): void
    {
        $flushed = false;
        $flush   = static function () use ($cache, &$flushed): void {
            if ($flushed || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)) {
                return;
            }
            $flushed = true; // در هر درخواست فقط یک‌بار
            $cache->flush();
        };

        foreach (array(
            'save_post_product',
            'woocommerce_new_product',
            'woocommerce_update_product',
            'woocommerce_product_set_stock',
            'woocommerce_variation_set_stock',
            'created_product_cat',
            'edited_product_cat',
            'delete_product_cat',
            'edited_term',
        ) as $hook) {
            $events->listen($hook, $flush, 10, 0);
        }

        $on_post = static function ($post_id) use ($flush): void {
            if (get_post_type((int) $post_id) === 'product') {
                $flush();
            }
        };
        $events->listen('deleted_post', $on_post);
        $events->listen('trashed_post', $on_post);
        $events->listen('untrashed_post', $on_post);
    }
}
