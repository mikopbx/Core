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
 * Class CheckSSHPasswords
 * This class is responsible for checking password quality on backend.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckSSHPasswords extends Injectable
{
    /**
     * Checks SSH password quality and /etc/shadow integrity
     *
     * @return array An array containing warning and needUpdate messages.
     *
     */
    public function process(): array
    {
        $messages = [];
        $passwords = $this->getPasswordCollection();

        $messageParams = [
            'name' => 'SSH password',
            'url' => $this->url->get('general-settings/modify/#/ssh')
        ];

        if ($passwords->sshByDefault === $passwords->ssh
            || $passwords->ssh === $passwords->cloudInstanceId
        ) {
            // Check for default password
            $messages['error'][] = [
                'messageTpl' => 'adv_YouUseDefaultSSHPassword',
                'messageParams' => $messageParams
            ];
            $messages['needUpdate'][] = PbxSettingsConstants::SSH_PASSWORD;
        } elseif (Util::isSimplePassword($passwords->ssh)) {
            // Check for weak password
            $messages['warning'][] = [
                'messageTpl' => 'adv_SshPasswordWeak',
                'messageParams' => $messageParams
            ];
        } elseif ($passwords->sshHashFile !== md5_file('/etc/shadow')) {
            // Check for shadow file integrity
            $messages['error'][] = [
                'messageTpl' => 'adv_SSHPPasswordCorrupt',
                'messageParams' => $messageParams
            ];
            $messages['needUpdate'][] = PbxSettingsConstants::SSH_PASSWORD;
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
        $passwords->ssh = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PASSWORD);
        $passwords->sshByDefault = $arrOfDefaultValues[PbxSettingsConstants::SSH_PASSWORD];
        $passwords->sshHashFile = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PASSWORD_HASH_FILE);
        $passwords->cloudInstanceId = PbxSettings::getValueByKey(PbxSettingsConstants::CLOUD_INSTANCE_ID);
        return $passwords;
    }

}