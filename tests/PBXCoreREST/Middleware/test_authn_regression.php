<?php

/*
 * Regression matrix for AuthenticationMiddleware after the 403/404 split.
 *
 * Confirms unchanged behavior for the four pre-existing channels:
 *   - Anonymous (no token, non-localhost)              → 401 (paranoia preserved)
 *   - Anonymous on unknown URI (non-localhost)         → 401 (no info-leak)
 *   - Public endpoint without token                    → 200 (system:ping)
 *   - Admin JWT on unknown URI                         → 200 (admin bypass; handler/notFound owns 404)
 *
 * Localhost bypass is covered separately (env-dependent), it short-circuits
 * before any of these branches.
 *
 * Run inside the container:
 *   php /offload/rootfs/usr/www/tests/PBXCoreREST/Middleware/test_authn_regression.php
 */

declare(strict_types=1);

use Phalcon\Di\FactoryDefault;
use Phalcon\Mvc\Micro;

$di = new FactoryDefault();
$application = new Micro();
$application->setDI($di);
$di->setShared('application', $application);

require_once '/offload/rootfs/usr/www/src/Common/Config/ClassLoader.php';
\MikoPBX\Common\Config\ClassLoader::init();

use MikoPBX\PBXCoreREST\Config\RegisterDIServices;
use MikoPBX\PBXCoreREST\Lib\Auth\JWTHelper;
use MikoPBX\PBXCoreREST\Middleware\AuthenticationMiddleware;
use MikoPBX\PBXCoreREST\Providers\RequestProvider;

RegisterDIServices::init($di);

$failures = 0;
$asserts = 0;

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

$run = static function (string $uri, array $headers = [], string $method = 'GET') use ($di, $application): int {
    if ($di->has(RequestProvider::SERVICE_NAME)) {
        $di->remove(RequestProvider::SERVICE_NAME);
    }
    (new \MikoPBX\PBXCoreREST\Providers\RequestProvider())->register($di);

    $_SERVER = [
        'REQUEST_URI'    => $uri,
        'REQUEST_METHOD' => $method,
        'REMOTE_ADDR'    => '203.0.113.7',
        'HTTP_USER_AGENT' => 'regression-bench',
    ] + $headers;
    $_GET = $_POST = $_REQUEST = [];

    /** @var \MikoPBX\PBXCoreREST\Http\Response $response */
    $response = $di->getShared('response');
    $response->setStatusCode(200, 'OK');

    try {
        (new AuthenticationMiddleware())->call($application);
    } catch (\Throwable $e) {
        // halt() may throw — capture status from response
    }

    return (int) $response->getStatusCode();
};

// 1. Anonymous on a real protected endpoint → 401 (paranoia preserved)
check(401, $run('/pbxcore/api/v3/extensions'),
    'anonymous on protected endpoint → 401 paranoia preserved');

// 2. Anonymous on unknown endpoint → still 401 (we deliberately do NOT leak existence)
check(401, $run('/pbxcore/api/v3/totally-unknown-endpoint'),
    'anonymous on unknown endpoint → 401 (no info leak)');

// 3. Public endpoint without token → 200 (middleware passes, handler responds)
check(200, $run('/pbxcore/api/v3/system:ping'),
    'public endpoint without token → middleware passes (200)');

// 4. Admin JWT on unknown endpoint → 200 (middleware passes, RouterProvider::notFound or BaseRestController will 404)
$adminJwt = JWTHelper::generate(['userId' => 'admin', 'role' => 'admins', 'language' => 'en']);
check(200, $run('/pbxcore/api/v3/totally-unknown-endpoint',
    ['HTTP_AUTHORIZATION' => 'Bearer ' . $adminJwt]),
    'admin JWT on unknown endpoint → middleware passes (handler owns 404)');

// 5. Admin JWT on real endpoint → 200 (sanity)
check(200, $run('/pbxcore/api/v3/extensions',
    ['HTTP_AUTHORIZATION' => 'Bearer ' . $adminJwt]),
    'admin JWT on real endpoint → 200');

echo "\n{$asserts} assertions, {$failures} failures\n";
exit($failures === 0 ? 0 : 1);
