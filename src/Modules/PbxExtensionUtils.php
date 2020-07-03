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

class PbxExtensionUtils
{
    public static function isEnabled(string $moduleUniqueID):bool
    {
        $result        = PbxExtensionModules::findFirstByUniqid($moduleUniqueID);
        return ($result!==false && $result->disabled !== '1');
    }
}