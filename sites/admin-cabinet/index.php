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

use MikoPBX\Common\Config\RegisterDIServices as RegisterCommonDIServices;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\RegistryProvider;
use MikoPBX\Common\Providers\SentryErrorHandlerProvider;
use MikoPBX\Common\Providers\WhoopsErrorHandlerProvider;
use MikoPBX\Modules\PbxExtensionUtils;
use Phalcon\Mvc\Application as BaseApplication;

class Application extends BaseApplication
{
    /**
     * Register the services here to make them general or register in the ModuleDefinition to make them module-specific
     */
    protected function registerServices()
    {

        $di = new Phalcon\Di\FactoryDefault();

        /**
         * Auto-loader configuration
         */
        require_once __DIR__ . '/../../src/Common/Config/ClassLoader.php';

        RegisterCommonDIServices::init($di);

        $this->setDI($di);
    }

    public function main()
    {
        $this->registerServices();

        // Register the default modules
        $this->registerModules([
            'admin-cabinet' => [
                "className" => "MikoPBX\AdminCabinet\Module",
                "path"      => __DIR__ . '/../../src/AdminCabinet/Module.php',
            ],
        ]);
        $this->setDefaultModule('admin-cabinet');

        // Register additional app modules from external enabled modules
        PbxExtensionUtils::registerEnabledModulesInApp($this);

        try {
            echo $this->handle($_SERVER['REQUEST_URI'])->getContent();
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleException($e);
        }
    }
}

$application = new Application();
$application->main();