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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\PbxSettings;
use Phalcon\Di\Injectable;

/**
 * Class MikoPBXConfig
 *
 * Provides methods to manage MikoPBX general settings.
 *
 * @package MikoPBX\Core\System
 */
class MikoPBXConfig extends Injectable
{

    /**
     * Saves a value for a general setting.
     * @deprecated Use PbxSettings::setValueByKey instead
     *
     * @param string $db_key The key of the general setting.
     * @param mixed $value The value to be saved.
     *
     * @return bool True if the value was successfully saved, false otherwise.
     */
    public function setGeneralSettings(string $db_key, mixed $value): bool
    {
        return PbxSettings::setValueByKey($db_key, $value);
    }

    /**
     * Resets a general setting value.
     * @deprecated Use PbxSettings::resetValueToDefault instead
     * 
     * @param string $db_key The key of the general setting to be reset.
     *
     * @return bool True if the value was successfully reset to default, false otherwise.
     */
    public function resetGeneralSettings(string $db_key): bool
    {
        return PbxSettings::resetValueToDefault($db_key);
    }

    /**
     * Returns the array of general settings or the value of a specific key.
     * @deprecated Use PbxSettings::getAllPbxSettings or PbxSettings::getValueByKey instead
     * 
     *
     * @param string $db_key The key of the general setting. If empty, returns all settings.
     *
     * @return array|string The array of general settings or the value of the specified key.
     */
    public function getGeneralSettings(string $db_key = ''): array|string
    {
        if ($db_key === '') {
            $result = PbxSettings::getAllPbxSettings();
        } else {
            $result = PbxSettings::getValueByKey($db_key);
        }

        return $result;
    }

}