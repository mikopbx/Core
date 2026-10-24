<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Services;

use MikoPBX\PBXCoreREST\Services\PublicEndpointsRegistry;
use PHPUnit\Framework\TestCase;

/**
 * Regression coverage for {@see PublicEndpointsRegistry::isPublicEndpoint()}.
 *
 * Guards GHSA-343m-2899-5qh3: the original matcher used a bare
 * str_starts_with(), so any path sharing a public prefix (e.g.
 * '/pbxcore/api/v3/auth:loginXYZ') was treated as public and skipped auth.
 * Method-level PUBLIC now matches the exact route only; class-level PUBLIC
 * matches the base path and routes strictly beneath it ('<base>/...' CRUD/ids,
 * '<base>:...' custom methods).
 */
class PublicEndpointsRegistryMatchTest extends TestCase
{
    private function registry(): PublicEndpointsRegistry
    {
        return new PublicEndpointsRegistry();
    }

    public function testMethodLevelMatchesExactRouteOnly(): void
    {
        $reg = $this->registry();
        $reg->registerPublicEndpoint('/pbxcore/api/v3/auth:login', PublicEndpointsRegistry::MATCH_EXACT);

        $this->assertTrue($reg->isPublicEndpoint('/pbxcore/api/v3/auth:login'));
    }

    public function testMethodLevelRejectsPrefixExtension(): void
    {
        $reg = $this->registry();
        $reg->registerPublicEndpoint('/pbxcore/api/v3/auth:login', PublicEndpointsRegistry::MATCH_EXACT);

        // The exact bug: a longer method name sharing the public prefix.
        $this->assertFalse($reg->isPublicEndpoint('/pbxcore/api/v3/auth:loginXYZ'));
        $this->assertFalse($reg->isPublicEndpoint('/pbxcore/api/v3/auth:login/extra'));
        $this->assertFalse($reg->isPublicEndpoint('/pbxcore/api/v3/auth:loginAsRoot'));
    }

    public function testMethodLevelDoesNotLeakToSiblingMethods(): void
    {
        $reg = $this->registry();
        $reg->registerPublicEndpoint('/pbxcore/api/v3/system:ping', PublicEndpointsRegistry::MATCH_EXACT);

        $this->assertTrue($reg->isPublicEndpoint('/pbxcore/api/v3/system:ping'));
        $this->assertFalse($reg->isPublicEndpoint('/pbxcore/api/v3/system:executeBashCommand'));
        $this->assertFalse($reg->isPublicEndpoint('/pbxcore/api/v3/system:executeSqlRequest'));
    }

    public function testClassLevelMatchesBaseAndBoundedSubRoutes(): void
    {
        $reg = $this->registry();
        $reg->registerPublicEndpoint('/pbxcore/api/v3/cdr', PublicEndpointsRegistry::MATCH_PREFIX);

        $this->assertTrue($reg->isPublicEndpoint('/pbxcore/api/v3/cdr'), 'base path');
        $this->assertTrue($reg->isPublicEndpoint('/pbxcore/api/v3/cdr:playback'), 'custom method');
        $this->assertTrue($reg->isPublicEndpoint('/pbxcore/api/v3/cdr/123'), 'record id');
        $this->assertTrue($reg->isPublicEndpoint('/pbxcore/api/v3/cdr/123:download'), 'id + custom method');
    }

    public function testClassLevelDoesNotMatchSiblingWithSharedPrefix(): void
    {
        $reg = $this->registry();
        $reg->registerPublicEndpoint('/pbxcore/api/v3/cdr', PublicEndpointsRegistry::MATCH_PREFIX);

        // '/cdr-archive' shares the 'cdr' string prefix but is a different
        // resource segment and must stay protected.
        $this->assertFalse($reg->isPublicEndpoint('/pbxcore/api/v3/cdr-archive'));
        $this->assertFalse($reg->isPublicEndpoint('/pbxcore/api/v3/cdrXYZ'));
    }

    public function testDefaultMatchModeIsExact(): void
    {
        $reg = $this->registry();
        // No explicit mode → exact (fail-safe default).
        $reg->registerPublicEndpoint('/pbxcore/api/v3/auth:login');

        $this->assertTrue($reg->isPublicEndpoint('/pbxcore/api/v3/auth:login'));
        $this->assertFalse($reg->isPublicEndpoint('/pbxcore/api/v3/auth:login/extra'));
    }

    public function testEmptyRegistryMatchesNothing(): void
    {
        $this->assertFalse($this->registry()->isPublicEndpoint('/pbxcore/api/v3/auth:login'));
    }
}
