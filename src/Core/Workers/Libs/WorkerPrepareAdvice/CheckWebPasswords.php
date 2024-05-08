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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * Class CheckWebPasswords
 * This class is responsible for checking password quality on backend.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckWebPasswords extends Injectable
{
    /**
     * Check the quality of passwords.
     *
     * @return array An array containing warning and needUpdate messages.
     *
     */
    public function process(): array
    {
        $messages = [];

        $passwords = $this->getPasswordCollection();

        $messageParams = [
            'name' => 'WEB password',
            'url' => $this->url->get('general-settings/modify/#/passwords')
        ];

        if ($passwords->webByDefault === $passwords->web
            || $passwords->web === $passwords->cloudInstanceId) {
            // Check for default password
            $messages['error'][] = [
                'messageTpl' => 'adv_YouUseDefaultWebPassword',
                'messageParams' => $messageParams
            ];
            $messages['needUpdate'][] = PbxSettingsConstants::WEB_ADMIN_PASSWORD;
        } elseif (Util::isSimplePassword($passwords->web)) {
            // Check for weak password
            $messages['error'][] = [
                'messageTpl' => 'adv_WebPasswordWeak',
                'messageParams' => $messageParams
            ];
            $messages['needUpdate'][] = PbxSettingsConstants::WEB_ADMIN_PASSWORD;
        }

        return $messages;
    }

    /**
     * Prepare a password collection object
     *
     * @return \stdClass
     */
    public function getPasswordCollection(): \stdClass
    {
        $arrOfDefaultValues = PbxSettings::getDefaultArrayValues();

        $passwords = new \stdClass();
        $passwords->web = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_PASSWORD);
        $passwords->webByDefault = $arrOfDefaultValues[PbxSettingsConstants::WEB_ADMIN_PASSWORD];
        $passwords->cloudInstanceId = PbxSettings::getValueByKey(PbxSettingsConstants::CLOUD_INSTANCE_ID);
        return $passwords;
    }
}