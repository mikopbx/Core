<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Http;

use MikoPBX\PBXCoreREST\Http\Request;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Regression coverage for {@see Request::getBearerToken()} and
 * {@see Request::hasBearerToken()} — the auth-header entry point for the
 * REST API.
 *
 * Two accepted forms:
 *   - `Authorization: Bearer <token>` (canonical MikoPBX form, used by
 *     the admin UI, JWT sessions, and most external clients).
 *   - `X-Api-Key: <token>` (CrowdSec convention; stock cs-firewall-bouncer
 *     and the rest of the LAPI ecosystem send tokens this way).
 *
 * Tokens are 64-char hex API keys validated via the same `ApiKeys` model,
 * so widening the header surface does not widen the privilege surface —
 * path restrictions and ACLs apply identically.
 */
class RequestBearerTokenTest extends AbstractUnitTest
{
    public function setUp(): void
    {
        parent::setUp();
        unset(
            $_SERVER['HTTP_AUTHORIZATION'],
            $_SERVER['REDIRECT_HTTP_AUTHORIZATION'],
            $_SERVER['HTTP_X_API_KEY']
        );
    }

    public function tearDown(): void
    {
        unset(
            $_SERVER['HTTP_AUTHORIZATION'],
            $_SERVER['REDIRECT_HTTP_AUTHORIZATION'],
            $_SERVER['HTTP_X_API_KEY']
        );
        parent::tearDown();
    }

    public function testExtractsBearerToken(): void
    {
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

        $request = new Request();

        $this->assertTrue($request->hasBearerToken());
        $this->assertSame('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', $request->getBearerToken());
    }

    public function testFallsBackToXApiKey(): void
    {
        $_SERVER['HTTP_X_API_KEY'] = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

        $request = new Request();

        $this->assertTrue($request->hasBearerToken(), 'X-Api-Key alone counts as a bearer-style auth');
        $this->assertSame('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', $request->getBearerToken());
    }

    public function testAuthorizationWinsOverXApiKey(): void
    {
        // If both headers are present, Authorization is canonical and wins.
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer canonical-token';
        $_SERVER['HTTP_X_API_KEY']     = 'fallback-token';

        $request = new Request();

        $this->assertSame('canonical-token', $request->getBearerToken());
    }

    public function testIgnoresEmptyBearerWithFallback(): void
    {
        // A degenerate `Authorization: Bearer ` header (trailing space only)
        // must not block the X-Api-Key fallback — otherwise a misconfigured
        // proxy could lock out cs-firewall-bouncer integrations.
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer    ';
        $_SERVER['HTTP_X_API_KEY']     = 'real-token';

        $request = new Request();

        $this->assertSame('real-token', $request->getBearerToken());
    }

    public function testReturnsNullWhenNeitherHeaderPresent(): void
    {
        $request = new Request();

        $this->assertFalse($request->hasBearerToken());
        $this->assertNull($request->getBearerToken());
    }

    public function testNonBearerSchemeFallsBackToXApiKey(): void
    {
        // A `Basic …` Authorization header is irrelevant to bearer auth.
        // We must not return it as a token, but X-Api-Key should still work.
        $_SERVER['HTTP_AUTHORIZATION'] = 'Basic dXNlcjpwYXNz';
        $_SERVER['HTTP_X_API_KEY']     = 'real-token';

        $request = new Request();

        $this->assertSame('real-token', $request->getBearerToken());
    }
}
