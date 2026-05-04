<?php

/*
 * Standalone unit test for AuthenticationMiddleware ACL "unknown component → 404" path.
 *
 * Exercises the private helpers checkAclPermission()/aclKnowsComponent() via reflection
 * with a real Phalcon ACL adapter so we don't depend on Phalcon HTTP/DI plumbing.
 *
 * Run inside the MikoPBX container (Phalcon extension required):
 *   php /offload/rootfs/usr/www/tests/PBXCoreREST/Middleware/test_acl_resource_lookup.php
 */

declare(strict_types=1);

require_once '/offload/rootfs/usr/www/src/Common/Config/ClassLoader.php';

use MikoPBX\PBXCoreREST\Middleware\AuthenticationMiddleware;
use Phalcon\Acl\Adapter\Memory as AclList;
use Phalcon\Acl\Component;
use Phalcon\Acl\Enum as AclEnum;
use Phalcon\Acl\Role as AclRole;
use Phalcon\Di\FactoryDefault;
use Phalcon\Mvc\Micro;

// Bootstrap a real DI + Micro so logAuthFailure() reaches the LoggerAuth service
// when we exercise the try/catch branches (Round 2 review).
$di = new FactoryDefault();
$application = new Micro();
$application->setDI($di);
$di->setShared('application', $application);
require_once '/offload/rootfs/usr/www/src/Common/Config/ClassLoader.php';
\MikoPBX\Common\Config\ClassLoader::init();
\MikoPBX\PBXCoreREST\Config\RegisterDIServices::init($di);

$failures = 0;
$asserts  = 0;

function assertSame(mixed $expected, mixed $actual, string $label): void
{
    global $failures, $asserts;
    $asserts++;
    if ($expected !== $actual) {
        $failures++;
        $exp = var_export($expected, true);
        $act = var_export($actual, true);
        echo "FAIL: {$label}\n  expected={$exp}\n  actual  ={$act}\n";
        return;
    }
    echo "PASS: {$label}\n";
}

function buildAcl(): AclList
{
    $acl = new AclList();
    $acl->setDefaultAction(AclEnum::DENY);
    $acl->addRole(new AclRole('admins', 'Admins'));
    $acl->addRole(new AclRole('limited', 'Limited'));
    $acl->allow('admins', '*', '*');

    // Mimic the kind of components ModuleUsersUI registers.
    $acl->addComponent(new Component('/pbxcore/api/v3/extensions'), ['getList', 'getRecord']);
    $acl->allow('limited', '/pbxcore/api/v3/extensions', ['getList']);

    return $acl;
}

$middleware = new AuthenticationMiddleware();
$ref = new ReflectionClass($middleware);
$aclKnows = $ref->getMethod('aclKnowsComponent');
$aclKnows->setAccessible(true);

$acl = buildAcl();

assertSame(true,  $aclKnows->invoke($middleware, $acl, '/pbxcore/api/v3/extensions', $application),
    'known component returns true');

assertSame(false, $aclKnows->invoke($middleware, $acl, '/pbxcore/api/v3/totally-bogus', $application),
    'unknown component returns false');

// Fallback safety: anonymous adapter without introspection methods → conservative true.
$dummyAcl = new class {
    // intentionally no isComponent / getComponents
};
assertSame(true, $aclKnows->invoke($middleware, $dummyAcl, '/whatever', $application),
    'adapter without introspection → safe true');

// Adapter exposing only getComponents (returning plain strings) – iterate path.
$stringAcl = new class {
    public function getComponents(): array { return ['/pbxcore/api/v3/extensions', '/pbxcore/api/v3/cdr']; }
};
assertSame(true,  $aclKnows->invoke($middleware, $stringAcl, '/pbxcore/api/v3/cdr', $application),
    'string-array adapter recognises known component');
assertSame(false, $aclKnows->invoke($middleware, $stringAcl, '/pbxcore/api/v3/missing', $application),
    'string-array adapter rejects unknown component');

// Throwing adapter (custom DB-backed) — must NOT propagate, must return safe true,
// and must produce an audit log line so an exploding ACL stays observable.
$throwingAcl = new class {
    public function isComponent(string $name): bool {
        throw new \RuntimeException('simulated DB outage');
    }
};
assertSame(true, $aclKnows->invoke($middleware, $throwingAcl, '/pbxcore/api/v3/x', $application),
    'throwing isComponent → safe true (graceful degradation)');

$throwingGet = new class {
    public function getComponents(): array {
        throw new \RuntimeException('simulated iteration error');
    }
};
assertSame(true, $aclKnows->invoke($middleware, $throwingGet, '/pbxcore/api/v3/y', $application),
    'throwing getComponents → safe true (graceful degradation)');

echo "\n{$asserts} assertions, {$failures} failures\n";
exit($failures === 0 ? 0 : 1);
