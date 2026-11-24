<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

/*
 * One racer of UtilMkdirRaceTest (#1348).
 *
 * Calls Util::mwMkdir() on the same paths as the other racers at the same instants, with
 * the error handling a worker has: Whoops registered by the project provider plus the
 * error_reporting level of WorkerBase::setResourceLimits(). Globals.php is deliberately
 * not used for bootstrapping: the racer must stay a process without the DI container.
 * The outcome of every call is counted and written to the result file as JSON.
 *
 * Usage: php mwmkdir-race-child.php <projectRoot> <baseDir> <goFile> <iterations> <resultFile>
 */

use MikoPBX\Common\Providers\WhoopsErrorHandlerProvider;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Di;

[, $projectRoot, $baseDir, $goFile, $iterations, $resultFile] = $argv;
$iterations = (int)$iterations;

require $projectRoot . '/vendor/autoload.php';

$di = new Di();
(new WhoopsErrorHandlerProvider())->register($di);
$di->get(WhoopsErrorHandlerProvider::SERVICE_NAME);
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

$result = ['ok' => 0, 'failed' => 0, 'threw' => []];

// Announce readiness, then wait for the parent to arm the shared start instant.
file_put_contents($resultFile . '.ready', '1');
$startNs = 0;
while ($startNs === 0) {
    clearstatcache();
    if (is_file($goFile)) {
        $startNs = (int) file_get_contents($goFile);
    } else {
        usleep(1000);
    }
}
while (hrtime(true) < $startNs) {
    // Spin: every racer starts at the same instant.
}
for ($i = 0; $i < $iterations; $i++) {
    $deadline = $startNs + $i * 250000;
    while (hrtime(true) < $deadline) {
        // Spin: the racers enter each iteration together and race for the same path.
    }
    try {
        if (Util::mwMkdir("$baseDir/$i/a/b")) {
            $result['ok']++;
        } else {
            $result['failed']++;
        }
    } catch (Throwable $e) {
        $key = get_class($e) . ': ' . $e->getMessage();
        $result['threw'][$key] = ($result['threw'][$key] ?? 0) + 1;
    }
}
file_put_contents($resultFile, json_encode($result, JSON_THROW_ON_ERROR));
