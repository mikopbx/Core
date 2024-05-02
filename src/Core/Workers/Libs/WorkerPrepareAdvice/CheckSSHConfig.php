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
use MikoPBX\Core\System\Notifications;
use Phalcon\Di\Injectable;

/**
 * Class CheckSSHConfig
 * This class is responsible for checking external changes ssh root password.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckSSHConfig extends Injectable
{

    /**
     * Checks the password in case it was changed by an unauthorized means.
     *
     * @return array An array containing warning messages.
     *
     */
    public function process(): array
    {
        $messages   = [];
        $password   = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PASSWORD);
        $hashString = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PASSWORD_HASH_STRING);
        $hashFile   = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PASSWORD_HASH_FILE);
        if($hashString !== md5($password)){
            // The password has been changed in an unusual way.
            $messages['error'][] =  ['messageTpl'=>'adv_SSHPasswordMismatchStringsHash'];
        }
        if($hashFile   !== md5_file('/etc/shadow')){
            // The system password does not match what is set in the configuration file.
            $messages['error'][] =  ['messageTpl'=>'adv_SSHPasswordMismatchFilesHash'];
        }
        if(isset($messages['error'])){
            Notifications::sendAdminNotification('adv_SSHPasswordWasChangedSubject', ['adv_SSHPasswordWasChangedBody'], true);
        }
        return $messages;
    }

}