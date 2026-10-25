<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Library\Auth;

use MikoPBX\Common\Library\Auth\RedisTokenStorage;
use PHPUnit\Framework\TestCase;
use Redis;

/**
 * SCAN may return an empty batch before the cursor reaches 0; the loops in
 * RedisTokenStorage used to stop there and skip keys (#1228). Unrelated keys
 * far outnumber the tokens, so most SCAN batches (COUNT 100) hold no token.
 */
class RedisTokenStorageTest extends TestCase
{
    private const int TOKENS_PER_USER = 20;
    private const int UNRELATED_KEYS = 20000;

    private Redis $redis;
    private RedisTokenStorage $storage;

    protected function setUp(): void
    {
        parent::setUp();

        $redisHost = getenv('MIKOPBX_TEST_REDIS_HOST');
        if ($redisHost === false || $redisHost === '') {
            $this->markTestSkipped('MIKOPBX_TEST_REDIS_HOST must point to a dedicated test Redis server');
        }

        $redisPort = (int)(getenv('MIKOPBX_TEST_REDIS_PORT') ?: 6379);
        $redisDatabase = (int)(getenv('MIKOPBX_TEST_REDIS_DATABASE') ?: 15);

        $this->redis = new Redis();
        $this->redis->connect($redisHost, $redisPort);
        $this->redis->select($redisDatabase);
        // Default mode: an empty batch is returned to the caller, not retried
        $this->redis->setOption(Redis::OPT_SCAN, Redis::SCAN_NORETRY);
        $this->redis->flushDB();

        $pipe = $this->redis->multi(Redis::PIPELINE);
        for ($i = 0; $i < self::UNRELATED_KEYS; $i++) {
            $pipe->set('unrelated:' . $i, '1');
        }
        $pipe->exec();

        $this->storage = new RedisTokenStorage($this->redis);
        foreach (['alice', 'bob'] as $userId) {
            for ($i = 0; $i < self::TOKENS_PER_USER; $i++) {
                $this->storage->save("$userId-token-$i", ['userId' => $userId]);
            }
        }
    }

    protected function tearDown(): void
    {
        if (isset($this->redis)) {
            $this->redis->flushDB();
            $this->redis->close();
        }
        parent::tearDown();
    }

    public function testCountSeesEveryToken(): void
    {
        $this->assertSame(2 * self::TOKENS_PER_USER, $this->storage->count());
    }

    public function testGetAllForUserReturnsEveryToken(): void
    {
        $this->assertCount(self::TOKENS_PER_USER, $this->storage->getAllForUser('alice'));
    }

    public function testDeleteAllForUserRemovesEveryToken(): void
    {
        $this->assertSame(self::TOKENS_PER_USER, $this->storage->deleteAllForUser('alice'));
        $this->assertSame([], $this->storage->getAllForUser('alice'));
        $this->assertCount(self::TOKENS_PER_USER, $this->storage->getAllForUser('bob'));
    }
}
