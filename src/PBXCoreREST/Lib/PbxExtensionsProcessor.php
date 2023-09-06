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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\RestAPIConfigInterface;
use Phalcon\Di\Injectable;


/**
 * Class PbxExtensionsProcessor delegate REST API processing into external modules
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 * @property \MikoPBX\Common\Providers\MarketPlaceProvider license
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property \Phalcon\Config                               config
 */
class PbxExtensionsProcessor extends Injectable
{
    /**
     * Modules can expose additional REST methods and processors,
     * look at src/Modules/Config/RestAPIConfigInterface.php
     *
     * Every module config class can process requests under root rights,
     * if it is described in the Config class
     *
     * @var array An array of additional processors for modules
     */
    public array $additionalProcessors;

    /**
     * Creates a new instance of PbxExtensionsProcessor.
     */
    public function __construct()
    {
        $additionalModules          = $this->getDI()->getShared(PBXConfModulesProvider::SERVICE_NAME);
        $this->additionalProcessors = [];
        foreach ($additionalModules as $moduleConfigObject) {
            if (method_exists($moduleConfigObject, RestAPIConfigInterface::MODULE_RESTAPI_CALLBACK)) {
                $this->additionalProcessors[] = [
                    $moduleConfigObject->moduleUniqueId,
                    $moduleConfigObject,
                    RestAPIConfigInterface::MODULE_RESTAPI_CALLBACK,
                ];
            }
        }
    }

    /**
     * Processes modules API requests
     *
     * @param array $request The request data
     *   - action: The action to be performed
     *   - module: The module identifier
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];
        $module = $request['module'];

        $res             = new PBXApiResult();
        $res->processor  = __METHOD__;
        $res->messages['error'][] = "Unknown action - $action in ".__CLASS__;
        $res->function   = $action;

        // Try process request over additional modules
        $processor = new PbxExtensionsProcessor();
        foreach ($processor->additionalProcessors as [$moduleUniqueId, $moduleConfigObject, $callBack]) {
            if (stripos($module, $moduleUniqueId) === 0) {
                $res = $moduleConfigObject->$callBack($request);
                break;
            }
        }

        return $res;
    }
}