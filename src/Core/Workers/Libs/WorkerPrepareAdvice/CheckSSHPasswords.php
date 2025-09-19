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
 * Class CheckSSHPasswords
 * This class is responsible for checking SSH password quality using REST API.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckSSHPasswords extends Injectable
{
    /**
     * Checks SSH password quality using REST API and /etc/shadow integrity
     *
     * @return array An array containing warning and needUpdate messages.
     */
    public function process(): array
    {
        $messages = [];
        
        // Check if SSH password authentication is disabled
        $disableSSHPassword = PbxSettings::getValueByKey(PbxSettings::SSH_DISABLE_SSH_PASSWORD);
        if ($disableSSHPassword === '1') {
            return $messages; // SSH password authentication is disabled, no need to check
        }
        
        $passwords = $this->getPasswordCollection();

        $messageParams = [
            'name' => 'SSH password',
            'url' => $this->url->get('general-settings/modify/#/ssh')
        ];

        // Check for default password first
        if ($passwords->sshByDefault === $passwords->ssh
            || $passwords->ssh === $passwords->cloudInstanceId
        ) {
            $messages['error'][] = [
                'messageTpl' => 'adv_YouUseDefaultSSHPassword',
                'messageParams' => $messageParams
            ];
            $messages['needUpdate'][] = PbxSettings::SSH_PASSWORD;
            return $messages; // No need to check further if using default
        }
        
        // Check for shadow file integrity
        if ($passwords->sshHashFile !== md5_file('/etc/shadow')) {
            $messages['error'][] = [
                'messageTpl' => 'adv_SSHPPasswordCorrupt',
                'messageParams' => $messageParams
            ];
            $messages['needUpdate'][] = PbxSettings::SSH_PASSWORD;
            return $messages; // Shadow file corrupted, need to reset password
        }

        // Check password against dictionary
        $isInDictionary = PasswordService::checkDictionary($passwords->ssh);

        if ($isInDictionary) {
            $messages['warning'][] = [
                'messageTpl' => 'adv_SshPasswordWeak',
                'messageParams' => $messageParams
            ];
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
        $passwords->ssh = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD, false);
        $passwords->sshByDefault = $arrOfDefaultValues[PbxSettings::SSH_PASSWORD];
        $passwords->sshHashFile = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD_HASH_FILE, false);
        $passwords->cloudInstanceId = PbxSettings::getValueByKey(PbxSettings::CLOUD_INSTANCE_ID, false);
        return $passwords;
    }

}