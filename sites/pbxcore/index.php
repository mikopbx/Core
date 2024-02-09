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
            $requestUri = sprintf('/pbxcore%s',$_REQUEST['_url']);
            $application->handle($requestUri);
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleException($e);
        }
    }
}

$restApi = new RestAPI();
$restApi->main();