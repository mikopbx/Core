<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PbxCore;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\PBXCoreREST\Config\RegisterDIServices;
use MikoPBX\PBXCoreREST\Http\TrustedRouteResolver;
use Phalcon\Di\FactoryDefault;
use Phalcon\Mvc\Micro;
use Throwable;

class RestAPI extends Micro
{
    public function main()
    {
        // Create Dependency injector
        $di = new FactoryDefault();

        // Auto-loader configuration
        require_once __DIR__ . '/../../src/Common/Config/ClassLoader.php';

        //Load application services
        $application = new Micro();
        $application->setDI($di);
        $di->setShared('application', $application);
        RegisterDIServices::init($di);

        // Start application
        try {
            // GHSA-343m-2899-5qh3: route on the nginx-injected _url, not client input.
            $routedPath = TrustedRouteResolver::resolve($_SERVER['QUERY_STRING'] ?? '', $_POST);
            if ($routedPath === null) {
                // Clean 400, no stack trace or paths; log for forensics.
                if (!headers_sent()) {
                    http_response_code(400);
                    header('Content-Type: application/json');
                }
                error_log('PBXCoreREST: rejected request with client-supplied or missing _url route');
                echo '{"result":false,"messages":{"error":["Bad request"]}}';
                return;
            }

            // Expose the trusted route to the auth middleware / ACL layer.
            if ($di->has('request')) {
                $request = $di->getShared('request');
                if ($request instanceof \MikoPBX\PBXCoreREST\Http\Request) {
                    $request->setRoutedPath($routedPath);
                }
            }

            $application->handle($routedPath);
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleException($e);
        }
    }
}

$restApi = new RestAPI();
$restApi->main();
