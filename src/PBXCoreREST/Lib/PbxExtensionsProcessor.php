<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

namespace MikoPBX\PBXCoreREST\Lib;

use Phalcon\Di\Injectable;


/**
 * Class PbxExtensionsProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 * @property \MikoPBX\Common\Providers\LicenseProvider license
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
     * if it described in Config class
     */
    public array $additionalProcessors;

    public function __construct()
    {
        $additionalModules          = $this->getDI()->getShared('pbxConfModules');
        $this->additionalProcessors = [];
        foreach ($additionalModules as $moduleConfigObject) {
            if ($moduleConfigObject->moduleUniqueId !== 'InternalConfigModule'
                && method_exists($moduleConfigObject, 'moduleRestAPICallback')
            ) {
                $this->additionalProcessors[] = [
                    $moduleConfigObject->moduleUniqueId,
                    $moduleConfigObject,
                    'moduleRestAPICallback',
                ];
            }
        }
    }

    /**
     *  Processes modules API requests
     *
     * @param array       $request
     *
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];
        $module = $request['module'];

        $res             = new PBXApiResult();
        $res->processor  = __METHOD__;
        $res->messages[] = "Unknown action - {$action} in modulesCallBack";
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