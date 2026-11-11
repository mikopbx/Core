<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Middleware;

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\PBXCoreREST\Middleware\AuthenticationMiddleware;
use Phalcon\Di\Di;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * Regression coverage for GHSA-22j3-qrgc-8hgv.
 *
 * The legacy, unversioned module routes /pbxcore/api/modules/{Module}/{action} are not
 * matched by the versioned REST ACL parser. Before the fix they fell through
 * checkAclPermission() to ACL_ALLOWED, letting any non-admin role reach every module
 * callback (ModuleBackup -> mikopbx.db -> JWTSecret -> root).
 *
 * The fix maps such a route to the ACL component ModuleUsersUI registers for the module
 * (/pbxcore/api/modules/<uncamelize(moduleUniqueId, '-')>) so the ACL is actually
 * evaluated, resolves the module name case-insensitively against the installed-modules
 * list, and fails closed (null -> deny) when the module is unknown.
 *
 * These tests exercise the private parser directly; the end-to-end deny/allow behaviour is
 * covered on a live stand.
 */
class LegacyModuleRouteAclTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Di::setDefault(new Di());
        $this->givenInstalledModules([]);
    }

    protected function tearDown(): void
    {
        Di::reset();
        parent::tearDown();
    }

    /**
     * Expose the given module ids through the registry the parser consults.
     *
     * Registered as a closure returning the list (mirroring the real provider). Phalcon
     * treats a bare array as a service descriptor, so the list is captured by value in a
     * `use` clause instead; the closure's rebinding to the DI container does not affect it.
     *
     * @param array<string> $uniqueIds
     */
    private function givenInstalledModules(array $uniqueIds): void
    {
        $objects = [];
        foreach ($uniqueIds as $uniqueId) {
            $obj = new \stdClass();
            $obj->moduleUniqueId = $uniqueId;
            $objects[] = $obj;
        }
        Di::getDefault()->setShared(PBXConfModulesProvider::SERVICE_NAME, fn() => $objects);
    }

    /**
     * @return array{0: string|null, 1: string|null}
     */
    private function parse(string $uri): array
    {
        $method = new ReflectionMethod(AuthenticationMiddleware::class, 'parseLegacyModuleRoute');
        $method->setAccessible(true);
        $result = $method->invoke(new AuthenticationMiddleware(), $uri);
        return $result ?? [null, null];
    }

    public function testCanonicalLegacyRouteMapsToModuleComponent(): void
    {
        $this->givenInstalledModules(['ModuleBackup']);

        [$component, $action] = $this->parse('/pbxcore/api/modules/ModuleBackup/list');

        $this->assertSame('/pbxcore/api/modules/module-backup', $component);
        $this->assertSame('list', $action);
    }

    public function testAcronymModuleNameUncamelizesLikeModuleUsersUi(): void
    {
        // ModuleUsersUI's ModuleExtendedCDRsACL registers /pbxcore/api/modules/module-extended-c-d-rs.
        $this->givenInstalledModules(['ModuleExtendedCDRs']);

        [$component] = $this->parse('/pbxcore/api/modules/ModuleExtendedCDRs/records');

        $this->assertSame('/pbxcore/api/modules/module-extended-c-d-rs', $component);
    }

    public function testFirstSegmentIsUsedAsActionForMultiSegmentPath(): void
    {
        $this->givenInstalledModules(['ModuleSpeechRecognize']);

        [$component, $action] = $this->parse('/pbxcore/api/modules/ModuleSpeechRecognize/asr/status');

        $this->assertSame('/pbxcore/api/modules/module-speech-recognize', $component);
        $this->assertSame('asr', $action);
    }

    public function testNonCanonicalCaseResolvesToCanonicalComponent(): void
    {
        // Dispatch (PbxExtensionsProcessor) matches case-insensitively, so the ACL must map
        // the same request to the canonical component rather than a different, ungoverned one.
        $this->givenInstalledModules(['ModuleBackup']);

        [$component, $action] = $this->parse('/pbxcore/api/modules/modulebackup/download');

        $this->assertSame('/pbxcore/api/modules/module-backup', $component);
        $this->assertSame('download', $action);
    }

    public function testUnknownModuleFailsClosed(): void
    {
        $this->givenInstalledModules(['ModuleBackup']);

        $this->assertSame([null, null], $this->parse('/pbxcore/api/modules/ModuleEvil/start'));
    }

    public function testEmptyModuleRegistryFailsClosed(): void
    {
        $this->givenInstalledModules([]);

        $this->assertSame([null, null], $this->parse('/pbxcore/api/modules/ModuleBackup/list'));
    }

    public function testVersionedRestRouteIsNotTreatedAsLegacy(): void
    {
        $this->givenInstalledModules(['ModuleBackup']);

        // v3 paths must be left to the versioned parser (returns null here).
        $this->assertSame([null, null], $this->parse('/pbxcore/api/v3/extensions'));
    }

    public function testCustomPrefixModuleRouteIsNotTreatedAsLegacy(): void
    {
        $this->givenInstalledModules(['ModuleAutoDialer']);

        // Pattern-2 custom prefixes are not /pbxcore/api/modules/... and are handled (denied)
        // by the fail-closed default, not by this mapper.
        $this->assertSame([null, null], $this->parse('/pbxcore/api/module-dialer/v1/task'));
    }
}
