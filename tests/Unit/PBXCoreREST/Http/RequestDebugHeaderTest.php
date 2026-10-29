<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Http;

use MikoPBX\Common\Providers\AclProvider;
use MikoPBX\PBXCoreREST\Http\Request;
use PHPUnit\Framework\TestCase;

/**
 * #1324: `X-Debug-The-Request` lifts the controller wait to 9999 s and
 * exempts the job from the stale check, so only localhost and admin JWT
 * sessions may turn it on.
 */
class RequestDebugHeaderTest extends TestCase
{
    public function setUp(): void
    {
        parent::setUp();
        unset($_SERVER['HTTP_X_DEBUG_THE_REQUEST'], $_SERVER['REMOTE_ADDR']);
    }

    public function tearDown(): void
    {
        unset($_SERVER['HTTP_X_DEBUG_THE_REQUEST'], $_SERVER['REMOTE_ADDR']);
        parent::tearDown();
    }

    public function testNoHeaderIsNotDebug(): void
    {
        $_SERVER['REMOTE_ADDR'] = '127.0.0.1';

        $this->assertFalse((new Request())->isDebugRequest());
    }

    /**
     * @dataProvider localAddressProvider
     */
    public function testLocalhostMayDebug(string $address): void
    {
        $_SERVER['REMOTE_ADDR'] = $address;
        $_SERVER['HTTP_X_DEBUG_THE_REQUEST'] = '1';

        $this->assertTrue((new Request())->isDebugRequest());
    }

    /**
     * @return array<string, array{string}>
     */
    public static function localAddressProvider(): array
    {
        return ['ipv4' => ['127.0.0.1'], 'ipv6' => ['::1']];
    }

    public function testAnonymousRemoteClientIsIgnored(): void
    {
        $_SERVER['REMOTE_ADDR'] = '203.0.113.7';
        $_SERVER['HTTP_X_DEBUG_THE_REQUEST'] = '1';

        $this->assertFalse((new Request())->isDebugRequest());
    }

    public function testRemoteAdminSessionMayDebug(): void
    {
        $_SERVER['REMOTE_ADDR'] = '203.0.113.7';
        $_SERVER['HTTP_X_DEBUG_THE_REQUEST'] = '1';

        $request = new Request();
        $request->setJwtPayload(['role' => AclProvider::ROLE_ADMINS]);

        $this->assertTrue($request->isDebugRequest());
    }

    public function testRemoteNonAdminSessionIsIgnored(): void
    {
        $_SERVER['REMOTE_ADDR'] = '203.0.113.7';
        $_SERVER['HTTP_X_DEBUG_THE_REQUEST'] = '1';

        $request = new Request();
        $request->setJwtPayload(['role' => 'operators']);

        $this->assertFalse($request->isDebugRequest());
    }
}
