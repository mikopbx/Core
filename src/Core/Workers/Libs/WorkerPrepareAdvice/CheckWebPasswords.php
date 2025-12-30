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
use MikoPBX\Core\System\PasswordService;
use Phalcon\Di\Injectable;

/**
 * Class CheckWebPasswords
 * This class is responsible for checking if WEB admin password is still at default value.
 *
 * Note: Dictionary-based password strength checking is performed at password change time
 * in SaveSettingsAction, not here. Hashed passwords cannot be checked against dictionaries.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckWebPasswords extends Injectable
{
    /**
     * Check if WEB admin password is still at default value.
     *
     * Supports multiple password formats:
     * - Plain text (legacy)
     * - SHA-512 crypt hash (new format)
     * - bcrypt hash (existing installations) - limited detection
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

        // Check if password is default
        if ($this->isDefaultPassword($passwords)) {
            $messages['error'][] = [
                'messageTpl' => 'adv_YouUseDefaultWebPassword',
                'messageParams' => $messageParams
            ];
            $messages['needUpdate'][] = PbxSettings::WEB_ADMIN_PASSWORD;
        }

        return $messages;
    }

    /**
     * Check if the stored password is the default password
     *
     * @param \stdClass $passwords Password collection
     * @return bool True if password is default
     */
    private function isDefaultPassword(\stdClass $passwords): bool
    {
        $storedPassword = $passwords->web;
        $defaultPassword = $passwords->webByDefault;

        // 1. Plain text match (legacy)
        if ($storedPassword === $defaultPassword) {
            return true;
        }

        // 2. SHA-512 hash of default password
        if (PasswordService::isSha512Hash($storedPassword)) {
            return PasswordService::verifySha512Hash($defaultPassword, $storedPassword);
        }

        // 3. Check if password equals cloud instance ID (auto-provisioned default)
        if (!empty($passwords->cloudInstanceId) && $storedPassword === $passwords->cloudInstanceId) {
            return true;
        }

        // Note: bcrypt hashes cannot be verified without knowing the original password
        // This is acceptable since new passwords will be SHA-512

        return false;
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