<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Controllers\License;

use MikoPBX\PBXCoreREST\Controllers\License\RestController;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * `license:resetKey` erases the license key, so it must not be served over GET.
 *
 * API-key grants are per resource and read/write: `ApiKeyPermissionChecker` strips the `:method` suffix and
 * treats GET as `read`. While `resetKey` was mapped to GET, a key granted only `{"/api/v3/license": "read"}`
 * could wipe the license (issue #1173). Mapped to POST, the same checker requires `write`.
 */
class RestControllerTest extends TestCase
{
    public function testResetKeyIsServedOnlyOverPost(): void
    {
        $controller = new RestController();
        $allowed = (new ReflectionMethod($controller, 'getAllowedCustomMethods'))->invoke($controller);

        $this->assertNotContains('resetKey', $allowed['GET'] ?? [], 'resetKey changes state, GET must answer 405');
        $this->assertContains('resetKey', $allowed['POST'] ?? []);
    }
}
