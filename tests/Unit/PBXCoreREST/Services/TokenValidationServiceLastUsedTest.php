<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Services;

use MikoPBX\Common\Providers\LoggerProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\PBXCoreREST\Http\Request;
use MikoPBX\PBXCoreREST\Services\TokenValidationService;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Phalcon\Cache\Adapter\Stream;
use Phalcon\Di\Di;
use Phalcon\Storage\SerializerFactory;

/**
 * Regression coverage for mikopbx/Core#1120.
 *
 * TokenValidationService used to write `last_used_at` straight into the main
 * database from php-fpm. On LXC installs php-fpm (user www) cannot write
 * /cf/conf/mikopbx.db, the PDOException escaped validate() and every Bearer
 * API-key request answered HTTP 500. Because the ":sync" throttle marker was
 * written only after a successful save, the failing write was retried on
 * every request.
 *
 * Now the write is queued for WorkerApiCommands. The equivalent fault is a
 * queue push that throws (here: Redis on a closed port, a real RedisException),
 * and it must neither fail authentication nor defeat the throttle.
 */
class TokenValidationServiceLastUsedTest extends AbstractUnitTest
{
    private string $token;
    private const int KEY_ID = 7;

    private Stream $cache;
    private string $cacheDir;

    public function setUp(): void
    {
        parent::setUp();

        $this->token = bin2hex(random_bytes(32));

        $di = Di::getDefault();
        // Stream, not Memory: Memory::get() of a missing key raises a notice in Phalcon 5.9,
        // which PHPUnit turns into an exception the service swallows before writing the marker
        $this->cacheDir = sys_get_temp_dir() . '/token-cache-' . bin2hex(random_bytes(4)) . '/';
        mkdir($this->cacheDir);
        $this->cache = new Stream(new SerializerFactory(), ['storageDir' => $this->cacheDir]);
        $di->setShared(ManagedCacheProvider::SERVICE_NAME, $this->cache);
        // Nothing listens on port 1: rpush() throws RedisException "went away"
        $di->setShared(
            RedisClientProvider::SERVICE_NAME,
            new \Redis(['host' => '127.0.0.1', 'port' => 1, 'connectTimeout' => 0.2])
        );

        // Cached valid token, as validate() stores it after a database lookup
        $this->cache->set('bearer_tokens:' . md5($this->token), [
            'id' => self::KEY_ID,
            'full_permissions' => '1',
            'allowed_paths' => '',
            'networkfilterid' => 'none',
        ], 300);

        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $this->token;
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_SERVER['REQUEST_URI'] = '/pbxcore/api/v3/employees';
        $_SERVER['REMOTE_ADDR'] = '192.0.2.10';
    }

    public function tearDown(): void
    {
        unset(
            $_SERVER['HTTP_AUTHORIZATION'],
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR']
        );
        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($this->cacheDir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($files as $file) {
            $file->isDir() ? rmdir($file->getPathname()) : unlink($file->getPathname());
        }
        rmdir($this->cacheDir);
        parent::tearDown();
    }

    /**
     * Request carrying the routed path index.php sets; permission checks deny without it
     */
    private function routedRequest(): Request
    {
        $request = new Request();
        $request->setRoutedPath($_SERVER['REQUEST_URI']);
        return $request;
    }

    public function testFailedLastUsedSyncDoesNotBreakAuthentication(): void
    {
        $service = new TokenValidationService(Di::getDefault());

        $result = $service->validate($this->routedRequest());

        $this->assertTrue($result->isValid(), 'last_used_at is informational: its sync must never fail authentication');
        $this->assertNull($result->getError());
        $this->assertSame(self::KEY_ID, $result->getTokenInfo()['id'] ?? null);
    }

    public function testSyncMarkerIsSetEvenWhenSyncFails(): void
    {
        $service = new TokenValidationService(Di::getDefault());
        $syncKey = 'bearer_tokens:last_used:' . self::KEY_ID . ':sync';
        $this->assertFalse($this->cache->has($syncKey));

        $before = time();
        $service->validate($this->routedRequest());

        $this->assertTrue($this->cache->has($syncKey), 'throttle marker must be written before the sync attempt, or a failing sync is retried on every request');
        $this->assertGreaterThanOrEqual($before, $this->cache->get($syncKey));
    }

    private function serviceWithUnavailableMetadataCache(): TokenValidationService
    {
        Di::getDefault()->setShared(
            ManagedCacheProvider::SERVICE_NAME,
            new \Phalcon\Cache\Adapter\Redis(new SerializerFactory(), [
                'host' => '127.0.0.1',
                'port' => 1,
                'persistent' => false,
            ])
        );
        return new TokenValidationService(Di::getDefault());
    }

    public function testMetadataCacheFailurePreservesSuccessfulPermissionCheck(): void
    {
        $keyData = $this->cache->get('bearer_tokens:' . md5($this->token));
        $service = $this->serviceWithUnavailableMetadataCache();

        // Token lookup has already succeeded; only the optional metadata cache is unavailable.
        $result = $this->invokeMethod($service, 'validatePermissions', [$keyData, $this->routedRequest()]);

        $this->assertTrue($result->isValid());
        $this->assertSame(self::KEY_ID, $result->getTokenInfo()['id']);
    }

    public function testMetadataCacheFailureDoesNotBypassPermissions(): void
    {
        $keyData = $this->cache->get('bearer_tokens:' . md5($this->token));
        $keyData['full_permissions'] = '0';
        $keyData['allowed_paths'] = '{"/api/v3/extensions":"read"}';
        $service = $this->serviceWithUnavailableMetadataCache();

        $result = $this->invokeMethod($service, 'validatePermissions', [$keyData, $this->routedRequest()]);

        $this->assertFalse($result->isValid());
        $this->assertSame('Access denied: insufficient permissions for this endpoint', $result->getError());
    }

    public function testMetadataCacheAndLoggerFailureDoesNotEscapeOptionalUpdate(): void
    {
        $service = $this->serviceWithUnavailableMetadataCache();
        // sysLogMsg() resolves this service without guarding against a missing/broken logger.
        Di::getDefault()->remove(LoggerProvider::SERVICE_NAME);

        // Isolate the optional update: permission checks have their own mandatory logger calls.
        $this->assertNull($this->invokeMethod($service, 'updateLastUsedBuffer', [self::KEY_ID]));
    }

    public function testMandatoryTokenCacheFailureIsNotSuppressed(): void
    {
        $service = $this->serviceWithUnavailableMetadataCache();

        $this->expectException(\Phalcon\Storage\Exception::class);
        $service->validate($this->routedRequest());
    }

}
