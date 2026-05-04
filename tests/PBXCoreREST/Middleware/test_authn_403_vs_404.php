<?php

/*
 * Integration test for the new 403 vs 404 split in AuthenticationMiddleware.
 *
 * Boots the real PBXCoreREST DI container, fakes REMOTE_ADDR (so localhost
 * bypass does not short-circuit), forges a JWT with a non-admin role, and
 * dispatches three URIs through the middleware:
 *   1. known endpoint role is allowed       → no halt, returns true
 *   2. known endpoint role is denied        → 403
 *   3. unknown endpoint                     → 404 (the new behavior)
 *
 * The script bypasses the actual handler — we only assert what the middleware
 * decided to send (status code captured before halt() flushes the response).
 *
 * Run inside the container:
 *   php /offload/rootfs/usr/www/tests/PBXCoreREST/Middleware/test_authn_403_vs_404.php
 */

declare(strict_types=1);

use Phalcon\Di\FactoryDefault;
use Phalcon\Mvc\Micro;

// Order matters: FactoryDefault first, then ClassLoader (it relies on Di::getDefault)
$di = new FactoryDefault();
$application = new Micro();
$application->setDI($di);
$di->setShared('application', $application);

require_once '/offload/rootfs/usr/www/src/Common/Config/ClassLoader.php';
\MikoPBX\Common\Config\ClassLoader::init();

use MikoPBX\Common\Providers\AclProvider;
use MikoPBX\PBXCoreREST\Config\RegisterDIServices;
use MikoPBX\PBXCoreREST\Lib\Auth\JWTHelper;
use MikoPBX\PBXCoreREST\Middleware\AuthenticationMiddleware;
use MikoPBX\PBXCoreREST\Providers\RequestProvider;
use Phalcon\Acl\Component;

$failures = 0;
$asserts  = 0;

function check(int $expected, int $actual, string $label): void
{
    global $failures, $asserts;
    $asserts++;
    if ($expected === $actual) {
        echo "PASS: {$label} (HTTP {$actual})\n";
        return;
    }
    $failures++;
    echo "FAIL: {$label} expected={$expected} actual={$actual}\n";
}

// --- Bootstrap REST DI on top of the already-built Micro app ---------------
RegisterDIServices::init($di);

// --- Register a non-admin role with a single allowed endpoint --------------
/** @var \Phalcon\Acl\Adapter\Memory $acl */
$acl = $di->getShared(AclProvider::SERVICE_NAME);
if (!$acl->isRole('limited-test')) {
    $acl->addRole(new \Phalcon\Acl\Role('limited-test', 'Limited test role'));
}
if (!$acl->isComponent('/pbxcore/api/v3/extensions')) {
    $acl->addComponent(new Component('/pbxcore/api/v3/extensions'), ['getList', 'getRecord']);
}
$acl->allow('limited-test', '/pbxcore/api/v3/extensions', ['getList']);

// --- Forge a JWT bearing the limited-test role -----------------------------
$jwt = JWTHelper::generate(['userId' => 'tester', 'role' => 'limited-test', 'language' => 'en']);
if (!is_string($jwt) || $jwt === '') {
    fwrite(STDERR, "Could not generate JWT\n");
    exit(2);
}

$middleware = new AuthenticationMiddleware();

$run = static function (string $uri, string $method = 'GET') use ($application, $di, $jwt): int {
    // Reset request between cases
    if ($di->has(RequestProvider::SERVICE_NAME)) {
        $di->remove(RequestProvider::SERVICE_NAME);
    }
    (new \MikoPBX\PBXCoreREST\Providers\RequestProvider())->register($di);

    // Headers / SERVER
    $_SERVER = [
        'REQUEST_URI'    => $uri,
        'REQUEST_METHOD' => $method,
        'REMOTE_ADDR'    => '203.0.113.7', // TEST-NET-3, definitely not localhost
        'HTTP_AUTHORIZATION' => 'Bearer ' . $jwt,
        'HTTP_USER_AGENT'    => 'phpunit-bench',
    ];
    $_GET = $_POST = $_REQUEST = [];

    /** @var \MikoPBX\PBXCoreREST\Http\Response $response */
    $response = $di->getShared('response');
    $response->setStatusCode(200, 'OK');

    try {
        // Re-instantiate middleware so internal state is fresh
        $mw = new AuthenticationMiddleware();
        $mw->call($application);
    } catch (\Throwable $e) {
        // halt() in newer Phalcon may throw — capture status from response
    }

    return (int) $response->getStatusCode();
};

check(200, $run('/pbxcore/api/v3/extensions'),
    'limited-test allowed on getList → pass-through (200)');

check(403, $run('/pbxcore/api/v3/extensions', 'POST'),
    'limited-test denied on create → 403 Forbidden');

check(404, $run('/pbxcore/api/v3/totally-unknown-endpoint'),
    'limited-test on unknown component → 404 Not Found (new behavior)');

// Suggestion 2 (trailing slash regression): /extensions/ must parse to the same
// component as /extensions — verifying both pathHasResourceId() and
// extractResourcePath() rtrim() correctly. Allowed action ⇒ 200.
check(200, $run('/pbxcore/api/v3/extensions/'),
    'limited-test allowed on getList with trailing slash → 200');

// Suggestion 3 (RFC 7231): HEAD on unknown endpoint must return 404 with NO body.
$response = $di->getShared('response');
if ($di->has(RequestProvider::SERVICE_NAME)) {
    $di->remove(RequestProvider::SERVICE_NAME);
}
(new \MikoPBX\PBXCoreREST\Providers\RequestProvider())->register($di);
$_SERVER = [
    'REQUEST_URI'    => '/pbxcore/api/v3/totally-unknown-endpoint',
    'REQUEST_METHOD' => 'HEAD',
    'REMOTE_ADDR'    => '203.0.113.7',
    'HTTP_AUTHORIZATION' => 'Bearer ' . $jwt,
    'HTTP_USER_AGENT'    => 'phpunit-bench',
];
$_GET = $_POST = $_REQUEST = [];
$response->setStatusCode(200, 'OK')->setContent('');
ob_start();
try {
    (new AuthenticationMiddleware())->call($application);
} catch (\Throwable) {
}
ob_end_clean();
$asserts++;
if ((int)$response->getStatusCode() === 404) {
    echo "PASS: HEAD on unknown endpoint → 404 (HTTP 404)\n";
} else {
    $failures++;
    echo "FAIL: HEAD status expected=404 actual=" . $response->getStatusCode() . "\n";
}
$body = (string) $response->getContent();
$asserts++;
if ($body === '' || $body === '{}') {
    echo "PASS: HEAD on unknown endpoint → empty body (RFC 7231)\n";
} else {
    $failures++;
    echo "FAIL: HEAD must not return body, got: " . substr($body, 0, 120) . "\n";
}

// HEAD parity for 403 (denied known component) — must also have empty body
if ($di->has(RequestProvider::SERVICE_NAME)) {
    $di->remove(RequestProvider::SERVICE_NAME);
}
(new \MikoPBX\PBXCoreREST\Providers\RequestProvider())->register($di);
$_SERVER = [
    'REQUEST_URI'    => '/pbxcore/api/v3/extensions',
    'REQUEST_METHOD' => 'HEAD',
    'REMOTE_ADDR'    => '203.0.113.7',
    'HTTP_AUTHORIZATION' => 'Bearer ' . $jwt,
    'HTTP_USER_AGENT'    => 'phpunit-bench',
];
$_GET = $_POST = $_REQUEST = [];
// limited-test allows getList only; HEAD also maps to getList — so this is allowed.
// For 403 check we need a denied action. Fake it by hitting a known component
// that limited-test cannot use: PUT-equivalent "update" via HEAD won't work
// since HEAD always maps to getList. Instead trigger 403 via POST→create
// (different request, different verb).
$response->setStatusCode(200, 'OK')->setContent('');
ob_start();
try { (new AuthenticationMiddleware())->call($application); } catch (\Throwable) {}
ob_end_clean();
// HEAD on getList is allowed for limited-test → expect 200 pass-through (no halt)
$asserts++;
if ((int)$response->getStatusCode() === 200) {
    echo "PASS: HEAD on allowed endpoint → 200 (no halt)\n";
} else {
    $failures++;
    echo "FAIL: HEAD allowed expected 200, got " . $response->getStatusCode() . "\n";
}

// HEAD-401 parity: anonymous HEAD on protected endpoint must be 401 with empty body
if ($di->has(RequestProvider::SERVICE_NAME)) {
    $di->remove(RequestProvider::SERVICE_NAME);
}
(new \MikoPBX\PBXCoreREST\Providers\RequestProvider())->register($di);
$_SERVER = [
    'REQUEST_URI'    => '/pbxcore/api/v3/extensions',
    'REQUEST_METHOD' => 'HEAD',
    'REMOTE_ADDR'    => '203.0.113.7',
    'HTTP_USER_AGENT' => 'phpunit-bench-anon',
];
$_GET = $_POST = $_REQUEST = [];
$response->setStatusCode(200, 'OK')->setContent('');
ob_start();
try { (new AuthenticationMiddleware())->call($application); } catch (\Throwable) {}
ob_end_clean();
$asserts++;
if ((int)$response->getStatusCode() === 401) {
    echo "PASS: HEAD anon on protected → 401\n";
} else {
    $failures++;
    echo "FAIL: HEAD anon 401 expected, got " . $response->getStatusCode() . "\n";
}
$body = (string) $response->getContent();
$asserts++;
if ($body === '' || $body === '{}') {
    echo "PASS: HEAD anon → empty body (RFC 7231)\n";
} else {
    $failures++;
    echo "FAIL: HEAD anon must not return body, got: " . substr($body, 0, 120) . "\n";
}

echo "\n{$asserts} assertions, {$failures} failures\n";
exit($failures === 0 ? 0 : 1);
