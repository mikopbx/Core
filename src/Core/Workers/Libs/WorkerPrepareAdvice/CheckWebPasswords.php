<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use MikoPBX\Core\System\PasswordService;
use Phalcon\Di\Injectable;

/**
 * Class CheckWebPasswords
 * This class is responsible for checking password quality on backend using REST API.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckWebPasswords extends Injectable
{
    /**
     * Check the quality of passwords using REST API.
     *
     * @return array An array containing warning and needUpdate messages.
     */
    public function process(): array
    {
        $messages = [];

        $passwords = $this->getPasswordCollection();

        $messageParams = [
            'name' => 'WEB password',
            'url' => $this->url->get('general-settings/modify/#/passwords')
        ];

        // Check for default password first
        if (
            $passwords->webByDefault === $passwords->web
            || $passwords->web === $passwords->cloudInstanceId
        ) {
            $messages['error'][] = [
                'messageTpl' => 'adv_YouUseDefaultWebPassword',
                'messageParams' => $messageParams
            ];
            $messages['needUpdate'][] = PbxSettings::WEB_ADMIN_PASSWORD;
            return $messages; // No need to check further if using default
        }

        // Check password against dictionary
        $isInDictionary = PasswordService::checkDictionary($passwords->web);

        if ($isInDictionary) {
            $messages['error'][] = [
                'messageTpl' => 'adv_WebPasswordWeak',
                'messageParams' => $messageParams
            ];
            $messages['needUpdate'][] = PbxSettings::WEB_ADMIN_PASSWORD;
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
        $passwords->web = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_PASSWORD, false);
        $passwords->webByDefault = $arrOfDefaultValues[PbxSettings::WEB_ADMIN_PASSWORD];
        $passwords->cloudInstanceId = PbxSettings::getValueByKey(PbxSettings::CLOUD_INSTANCE_ID, false);
        return $passwords;
    }
}