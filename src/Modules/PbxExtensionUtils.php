<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Modules;


use MikoPBX\Common\Models\PbxExtensionModules;
use Phalcon\Di;

class PbxExtensionUtils
{
    /**
     * Check module state by UniqueID
     * @param string $moduleUniqueID
     *
     * @return bool
     */
    public static function isEnabled(string $moduleUniqueID):bool
    {
        $result        = PbxExtensionModules::findFirstByUniqid($moduleUniqueID);
        return ($result!==false && $result->disabled !== '1');
    }

    /**
     * Return module dir by UniqueID
     * @param string $moduleUniqueID
     *
     * @return string
     *
     */
    public static function getModuleDir(string $moduleUniqueID):string
    {
        $di      = Di::getDefault();
        if ($di === null){
            return "/tmp/{$moduleUniqueID}";
        }
        $config  = $di->getShared('config');
        $modulesDir    = $config->path('core.modulesDir');

        return"{$modulesDir}/{$moduleUniqueID}";
    }


}