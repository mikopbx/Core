<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\PbxSettings;
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
    public function getGeneralSettings(string $db_key = '')
    {
        if ($db_key === '') {
            $result = PbxSettings::getAllPbxSettings();
        } else {
            $result = PbxSettings::getValueByKey($db_key);
        }

        return $result;
    }

}