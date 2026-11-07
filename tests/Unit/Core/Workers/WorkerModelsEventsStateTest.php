<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use Phalcon\Cache\Adapter\Redis as CacheAdapterRedis;
use Phalcon\Storage\SerializerFactory;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionProperty;

/**
 * Issue #1394 (H-009): restoreStateFromRedis() matched nothing, because the KEYS glob
 * treated the backslashes of the class name as escapes, and get() of a key returned by
 * KEYS added the cache prefix a second time. The reload backlog saved on shutdown was
 * never replayed by the next worker instance.
 */
final class WorkerModelsEventsStateTest extends TestCase
{
    private CacheAdapterRedis $cache;

    protected function setUp(): void
    {
        $redisHost = getenv('MIKOPBX_TEST_REDIS_HOST');
        if ($redisHost === false || $redisHost === '') {
            $this->markTestSkipped('MIKOPBX_TEST_REDIS_HOST must point to a dedicated test Redis server');
        }

        // The same adapter and prefix as ManagedCacheProvider, on a throwaway database
        $this->cache = new CacheAdapterRedis(new SerializerFactory(), [
            'host' => $redisHost,
            'port' => (int)(getenv('MIKOPBX_TEST_REDIS_PORT') ?: 6379),
            'index' => (int)(getenv('MIKOPBX_TEST_REDIS_DATABASE') ?: 15),
            'prefix' => ManagedCacheProvider::CACHE_PREFIX,
            'lifetime' => 3600,
        ]);
        $this->cache->clear();
    }

    protected function tearDown(): void
    {
        if (isset($this->cache)) {
            $this->cache->clear();
        }
    }

    public function testBacklogSavedOnShutdownIsRestoredByNextInstance(): void
    {
        $backlog = ['ReloadDialplanAction' => [['model' => 'Extensions']]];

        $stopping = $this->makeWorker();
        $this->setProperty($stopping, 'plannedReloadActions', $backlog);
        $this->setProperty($stopping, 'modifiedModels', ['Extensions' => true]);
        $this->setProperty($stopping, 'last_change', 1000);
        $this->invoke($stopping, 'saveStateToRedis');

        $next = $this->makeWorker();
        $this->setProperty($next, 'last_change', 0);
        $this->invoke($next, 'restoreStateFromRedis');

        self::assertSame($backlog, $this->getProperty($next, 'plannedReloadActions'));
        self::assertSame(['Extensions' => true], $this->getProperty($next, 'modifiedModels'));
        self::assertSame(1000, $this->getProperty($next, 'last_change'));
    }

    private function makeWorker(): WorkerModelsEvents
    {
        /** @var WorkerModelsEvents $worker */
        $worker = (new ReflectionClass(WorkerModelsEvents::class))->newInstanceWithoutConstructor();
        $this->setProperty($worker, 'redis', $this->cache);
        return $worker;
    }

    private function invoke(WorkerModelsEvents $worker, string $method): void
    {
        $reflection = new \ReflectionMethod(WorkerModelsEvents::class, $method);
        $reflection->setAccessible(true);
        $reflection->invoke($worker);
    }

    private function setProperty(WorkerModelsEvents $worker, string $name, mixed $value): void
    {
        $property = new ReflectionProperty($worker, $name);
        $property->setAccessible(true);
        $property->setValue($worker, $value);
    }

    private function getProperty(WorkerModelsEvents $worker, string $name): mixed
    {
        $property = new ReflectionProperty($worker, $name);
        $property->setAccessible(true);
        return $property->getValue($worker);
    }
}
