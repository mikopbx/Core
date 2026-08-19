<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\PasswordService;
use Phalcon\Config\Config;
use Phalcon\Di\Di;
use Phalcon\Di\FactoryDefault;
use PHPUnit\Framework\TestCase;
use Redis;

/**
 * Regression coverage for memory-efficient password dictionary lookups.
 */
class PasswordServiceDictionaryTest extends TestCase
{
    private const string DICTIONARY_KEY = 'password_service:dictionary';
    private const string DICTIONARY_TEMP_KEY = 'password_service:dictionary:building';
    private const string DICTIONARY_MUTEX_KEY = 'mutex:password-service-dictionary-init';

    private Redis $redis;

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
        $this->clearDictionaryState();

        $di = new FactoryDefault\Cli();
        $di->setShared('config', new Config(['core' => ['debugMode' => false]]));
        $redis = $this->redis;
        $di->setShared(
            RedisClientProvider::SERVICE_NAME,
            function () use ($redis): Redis {
                return $redis;
            }
        );
        (new MutexProvider())->register($di);
        Di::setDefault($di);
    }

    protected function tearDown(): void
    {
        $this->clearDictionaryState();
        $this->redis->close();
        Di::reset();

        parent::tearDown();
    }

    private function clearDictionaryState(): void
    {
        $this->redis->del([
            self::DICTIONARY_KEY,
            self::DICTIONARY_TEMP_KEY,
            self::DICTIONARY_MUTEX_KEY,
        ]);
    }

    /**
     * A negative lookup in an existing dictionary must remain a point query.
     * Reading the complete Redis hash used to create a large temporary PHP
     * array in every worker that checked a strong password.
     */
    public function testMissingPasswordLookupDoesNotReadEntireDictionary(): void
    {
        $this->redis->hSet(self::DICTIONARY_KEY, 'known-compromised-password', '1');
        $this->redis->rawCommand('CONFIG', 'RESETSTAT');

        $isSimple = PasswordService::isSimplePassword('unique-strong-password');

        $commandStats = (string)$this->redis->rawCommand('INFO', 'commandstats');
        preg_match('/^cmdstat_hgetall:calls=(\d+)/m', $commandStats, $matches);

        $this->assertFalse($isSimple);
        $this->assertSame(
            0,
            isset($matches[1]) ? (int)$matches[1] : 0,
            'A missing password must not trigger HGETALL for the dictionary hash'
        );
    }

    /**
     * Initial population must not fetch the empty or newly-created hash back
     * into PHP. The first caller should populate Redis and finish with the
     * same point lookup used by every later caller.
     */
    public function testFirstLookupInitializesDictionaryWithoutHgetall(): void
    {
        $this->redis->rawCommand('CONFIG', 'RESETSTAT');

        $isSimple = PasswordService::isSimplePassword('password');

        $commandStats = (string)$this->redis->rawCommand('INFO', 'commandstats');
        preg_match('/^cmdstat_hgetall:calls=(\d+)/m', $commandStats, $matches);

        $this->assertSame(
            0,
            isset($matches[1]) ? (int)$matches[1] : 0,
            'Dictionary initialization must not trigger HGETALL'
        );
        $this->assertTrue($isSimple, 'The bundled dictionary must contain "password"');
        $this->assertTrue($this->redis->exists(self::DICTIONARY_KEY));
    }

    /**
     * Batch validation must request only the supplied fields instead of
     * materializing the complete Redis hash in the PHP process.
     */
    public function testBatchLookupDoesNotReadEntireDictionary(): void
    {
        $this->redis->hSet(self::DICTIONARY_KEY, 'known-compromised-password', '1');
        $this->redis->rawCommand('CONFIG', 'RESETSTAT');

        $results = PasswordService::batchCheckDictionary([
            'weak' => 'known-compromised-password',
            'strong' => 'unique-strong-password',
        ]);

        $commandStats = (string)$this->redis->rawCommand('INFO', 'commandstats');
        preg_match('/^cmdstat_hgetall:calls=(\d+)/m', $commandStats, $matches);

        $this->assertSame(['weak' => true, 'strong' => false], $results);
        $this->assertSame(
            0,
            isset($matches[1]) ? (int)$matches[1] : 0,
            'Batch password lookup must not trigger HGETALL'
        );
    }

    /**
     * Redis outages must fall back to a bounded-memory scan of the bundled
     * gzip file instead of collecting every line in a PHP array.
     */
    public function testLookupWithoutRedisScansDictionaryWithBoundedMemory(): void
    {
        $di = new FactoryDefault\Cli();
        $di->setShared('config', new Config(['core' => ['debugMode' => false]]));
        Di::setDefault($di);

        $memoryBefore = memory_get_usage(true);
        $isSimple = PasswordService::isSimplePassword('qwerty');
        $memoryGrowth = max(0, memory_get_usage(true) - $memoryBefore);

        $this->assertTrue($isSimple, 'The bundled dictionary must contain "qwerty"');
        $this->assertLessThanOrEqual(
            2 * 1024 * 1024,
            $memoryGrowth,
            'Fallback lookup must not retain the complete dictionary in memory'
        );
    }

    /**
     * Batch fallback should scan the gzip file once and preserve the caller's
     * keys without materializing the complete word list.
     */
    public function testBatchLookupWithoutRedisUsesBoundedMemory(): void
    {
        $di = new FactoryDefault\Cli();
        $di->setShared('config', new Config(['core' => ['debugMode' => false]]));
        Di::setDefault($di);

        $memoryBefore = memory_get_usage(true);
        $results = PasswordService::batchCheckDictionary([
            'weak' => 'qwerty',
            'strong' => 'unique-strong-password',
            'empty' => '',
        ]);
        $memoryGrowth = max(0, memory_get_usage(true) - $memoryBefore);

        $this->assertSame(
            ['weak' => true, 'strong' => false, 'empty' => false],
            $results
        );
        $this->assertLessThanOrEqual(
            2 * 1024 * 1024,
            $memoryGrowth,
            'Batch fallback must not retain the complete dictionary in memory'
        );
    }
}
