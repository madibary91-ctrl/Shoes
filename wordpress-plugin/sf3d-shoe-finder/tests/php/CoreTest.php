<?php

declare(strict_types=1);

namespace SF3D\Plugin\Tests;

use PHPUnit\Framework\TestCase;
use SF3D\Plugin\Cache\NullCache;
use SF3D\Plugin\Cache\TransientCache;
use SF3D\Plugin\Contracts\ProductRepository;
use SF3D\Plugin\Data\PayloadBuilder;
use SF3D\Plugin\Support\Container;
use SF3D\Plugin\Support\Settings;

final class FakeRepository implements ProductRepository
{
    public $calls = 0;

    public function all(array $args = array()): array
    {
        $this->calls++;
        return array(array('id' => 1, 'title' => 'Test'));
    }
    public function find(int $id): ?array
    {
        return null;
    }
    public function search(string $query, int $limit = 5): array
    {
        return array();
    }
    public function categories(): array
    {
        return array();
    }
    public function related(int $id, int $limit = 4): array
    {
        return array();
    }
    public function filters(): array
    {
        return array();
    }
}

final class CoreTest extends TestCase
{
    protected function setUp(): void
    {
        $GLOBALS['sf3d_test_transients'] = array();
        $GLOBALS['sf3d_test_options']    = array();
    }

    public function testNullCacheNeverStores(): void
    {
        $cache = new NullCache();
        $cache->set('a', 1);
        $this->assertSame('x', $cache->get('a', 'x'));
    }

    public function testTransientCacheRoundTripAndFlush(): void
    {
        $cache = new TransientCache();
        $cache->set('k', array('v' => 1), 60);
        $this->assertSame(array('v' => 1), $cache->get('k'));
        $cache->flush();
        $this->assertNull($cache->get('k'));
    }

    public function testPayloadIsCachedUntilFlush(): void
    {
        $repo    = new FakeRepository();
        $cache   = new TransientCache();
        $builder = new PayloadBuilder($repo, $cache);

        $builder->build(array('limit' => 5));
        $builder->build(array('limit' => 5));
        $this->assertSame(1, $repo->calls, 'کوئری دوم باید از کش بیاید');

        $cache->flush();
        $builder->build(array('limit' => 5));
        $this->assertSame(2, $repo->calls, 'بعد از flush باید دوباره کوئری شود');
        $this->assertStringContainsString('"products"', $builder->toJson(array('limit' => 5)));
    }

    public function testContainerSingletonAndMissing(): void
    {
        $c = new Container();
        $c->singleton('x', static function () {
            return new \stdClass();
        });
        $this->assertSame($c->make('x'), $c->make('x'));
        $this->expectException(\RuntimeException::class);
        $c->make('missing');
    }

    public function testSettingsNormalize(): void
    {
        $s = Settings::normalize(array('limit' => '9999', 'orderby' => 'bad', 'wishlist' => '', 'columns' => '5', 'height' => array('size' => 80, 'unit' => 'vh')));
        $this->assertSame(300, $s['limit']);
        $this->assertSame('date', $s['orderby']);
        $this->assertFalse($s['features']['wishlist']);
        $this->assertTrue($s['features']['gallery']);
        $this->assertSame(5.0, $s['grid']['gridCols']);
        $this->assertSame('80vh', $s['height']);
    }
}
