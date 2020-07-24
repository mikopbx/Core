<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\PbxSettings;
use Phalcon\Di;
use Phalcon\Di\Injectable;

/**
 * Class Config
 */
class MikoPBXConfig extends Injectable
{

    /**
     * Saves GeneralSettings value
     *
     * @param $db_key
     * @param $value
     *
     * @return mixed
     */
    public function setGeneralSettings($db_key, $value)
    {
        $data = PbxSettings::findFirst("key = '$db_key'");
        if (null === $data) {
            $data = new PbxSettings();
            $data->writeAttribute("key", $db_key);
        }

        $data->writeAttribute("value", $value);

        return $data->save();
    }

    /**
     * Deletes GeneralSettings value
     *
     * @param $db_key
     *
     * @return bool
     */
    public function deleteGeneralSettings($db_key): bool
    {
        $data = PbxSettings::findFirstByKey($db_key);
        if (null === $data) {
            return true;
        }

        return $data->delete();
    }

    /**
     * Returns general settings array or value, if key was set
     *
     * @param string $db_key
     *
     * @return array|string
     */
    public function getGeneralSettings($db_key = '')
    {
        if ($db_key === '') {
            $cacheKey     = 'PbxSettings.getGeneralSettings';
            $managedCache = $this->di->getShared('managedCache');
            $settings     = $managedCache->get($cacheKey);
            if ($settings !== null && is_array($settings)) {
                return $settings;
            }
            $result = PbxSettings::getAllPbxSettings();
            if ($cacheKey && $this->di->getShared('registry')->booting !== true) {
                $managedCache->set($cacheKey, $result, 3600);
            }
        } else {
            $result = PbxSettings::getValueByKey($db_key);
        }

        return $result;
    }

}