<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Services;

use MikoPBX\PBXCoreREST\Services\ApiKeyPermissionChecker;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Regression coverage for {@see ApiKeyPermissionChecker::checkPermission()}'s
 * path-ascend lookup.
 *
 * Background: the original implementation did an exact-match lookup of the
 * normalised base path against `allowed_paths`. That worked for the standard
 * `/resource/{id}` shape because `extractBasePath()` strips the trailing ID.
 * It silently rejected MULTI-SEGMENT routes that live under a resource —
 * notably the firewall-bouncer LAPI surface at
 *   `/api/v3/firewall-bouncer/v1/decisions/stream`
 * granted via the standard preset
 *   `{"/api/v3/firewall-bouncer": "read"}`.
 *
 * The fix walks the path one `/`-segment at a time and accepts the first
 * ancestor that appears in `allowed_paths`. Walk is strictly on segment
 * boundaries — a permission on `/api/v3/cdr` cannot grant access to
 * `/api/v3/cdr-archive` (different segment, different resource).
 *
 * These tests are also the regression net for that no-over-grant property.
 */
class ApiKeyPermissionCheckerPathAscendTest extends AbstractUnitTest
{
    private function key(string $allowedPathsJson): object
    {
        $key = new \stdClass();
        $key->id = 99;
        $key->full_permissions = '0';
        $key->allowed_paths = $allowedPathsJson;
        return $key;
    }

    public function testDeepLapiRouteUnderResourceBaseIsAllowed(): void
    {
        $chk = new ApiKeyPermissionChecker();
        $apiKey = $this->key(json_encode(['/api/v3/firewall-bouncer' => 'read']));

        $this->assertTrue(
            $chk->checkPermission($apiKey, '/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream', 'GET'),
            'A `read` permission on /api/v3/firewall-bouncer must cover the deeper LAPI route — '
            . 'cs-firewall-bouncer polls /v1/decisions/stream, not the base.'
        );

        $this->assertTrue(
            $chk->checkPermission($apiKey, '/pbxcore/api/v3/firewall-bouncer/v1/whitelist', 'GET'),
            'Sibling /v1/whitelist endpoint must inherit the same grant.'
        );
    }

    public function testExactBaseStillWorks(): void
    {
        $chk = new ApiKeyPermissionChecker();
        $apiKey = $this->key(json_encode(['/api/v3/firewall-bouncer' => 'read']));

        $this->assertTrue(
            $chk->checkPermission($apiKey, '/pbxcore/api/v3/firewall-bouncer', 'GET'),
            'No regression: exact match on the resource base must still pass.'
        );
    }

    public function testActionHierarchyIsPreservedAcrossAscend(): void
    {
        $chk = new ApiKeyPermissionChecker();
        $apiKey = $this->key(json_encode(['/api/v3/firewall-bouncer' => 'read']));

        $this->assertFalse(
            $chk->checkPermission($apiKey, '/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream', 'POST'),
            'A `read` grant must still reject POST even though the path matches via ascend — '
            . 'ascend only relaxes the path lookup, never the action check.'
        );
    }

    public function testSiblingPrefixDoesNotInheritGrant(): void
    {
        $chk = new ApiKeyPermissionChecker();
        $apiKey = $this->key(json_encode(['/api/v3/cdr' => 'read']));

        $this->assertFalse(
            $chk->checkPermission($apiKey, '/pbxcore/api/v3/cdr-archive', 'GET'),
            'String-prefix overgrant: a token on /api/v3/cdr must NOT cover /api/v3/cdr-archive. '
            . 'The ascend walks on `/` boundaries so different segments stay isolated.'
        );
    }

    public function testUnrelatedResourceIsRejected(): void
    {
        $chk = new ApiKeyPermissionChecker();
        $apiKey = $this->key(json_encode(['/api/v3/firewall-bouncer' => 'read']));

        $this->assertFalse(
            $chk->checkPermission($apiKey, '/pbxcore/api/v3/extensions/123', 'GET'),
            'Different resource trees stay isolated — no path under /extensions inherits a grant on /firewall-bouncer.'
        );
    }

    /**
     * Non-whitelisted resources MUST NOT cover their deep sub-trees.
     *
     * Third-party modules may register their own REST controllers nested under
     * `/api/v3/modules/<module>/<resource>`. If the ascend walk were applied
     * universally, a key granted ONLY the built-in `/api/v3/modules` collection
     * (Modules CRUD: list/install/uninstall) would silently inherit access to
     * every module's API surface. The whitelist in
     * {@see ApiKeyPermissionChecker::ASCEND_ALLOWED_RESOURCES} keeps that
     * scope-widening opt-in.
     */
    public function testModulesGrantDoesNotCoverNestedModuleControllers(): void
    {
        $chk = new ApiKeyPermissionChecker();
        $apiKey = $this->key(json_encode(['/api/v3/modules' => 'read']));

        $this->assertTrue(
            $chk->checkPermission($apiKey, '/pbxcore/api/v3/modules', 'GET'),
            'Exact match on the granted resource base must still pass.'
        );

        $this->assertFalse(
            $chk->checkPermission($apiKey, '/pbxcore/api/v3/modules/SomeModule/tasks', 'GET'),
            'A read grant on /api/v3/modules MUST NOT inherit access to nested module-owned controllers — '
            . 'modules can mount arbitrary REST surfaces and a parent grant must not silently widen into them.'
        );

        $this->assertFalse(
            $chk->checkPermission($apiKey, '/pbxcore/api/v3/modules/SomeModule/tasks/42', 'GET'),
            'Same protection applies to record-level paths under nested module controllers.'
        );
    }

    /**
     * Non-whitelisted resources lose their broad ascend even for the
     * resource-owner itself. /api/v3/cdr does not own multi-segment routes,
     * so a grant on it must not reach into `/api/v3/cdr/recordings/files`
     * (a hypothetical deep route a future module might mount).
     */
    public function testNonWhitelistedDeepRouteIsRejected(): void
    {
        $chk = new ApiKeyPermissionChecker();
        $apiKey = $this->key(json_encode(['/api/v3/cdr' => 'read']));

        $this->assertFalse(
            $chk->checkPermission($apiKey, '/pbxcore/api/v3/cdr/recordings/files', 'GET'),
            'Ascend is whitelist-gated: deep sub-routes under non-whitelisted resources stay denied.'
        );
    }
}
