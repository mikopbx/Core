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
use MikoPBX\Core\System\Notifications;
use MikoPBX\Core\System\Mail\Builders\SshPasswordChangedNotificationBuilder;
use MikoPBX\Core\System\Mail\NotificationQueueHelper;
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
     * @return array<string, array<int, array<string, mixed>>> An array containing warning messages.
     *
     */
    public function process(): array
    {
        $messages   = [];
        $password   = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD, false);
        $hashString = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD_HASH_STRING, false);
        $hashFile   = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD_HASH_FILE, false);
        if($hashString !== md5($password)){
            // The password has been changed in an unusual way.
            $messages['error'][] =  ['messageTpl'=>'adv_SSHPasswordMismatchStringsHash'];
        }
        if($hashFile   !== md5_file('/etc/shadow')){
            // The system password does not match what is set in the configuration file.
            $messages['error'][] =  ['messageTpl'=>'adv_SSHPasswordMismatchFilesHash'];
        }
        if(isset($messages['error'])){
            // Queue notification for async sending via WorkerNotifyByEmail
            $adminEmail = PbxSettings::getValueByKey(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL);

            if (!empty($adminEmail)) {
                $builder = new SshPasswordChangedNotificationBuilder();
                $builder->setRecipient($adminEmail)
                        ->setChangedBy('external')
                        ->setChangeTime(date('Y-m-d H:i:s'))
                        ->setSecurityUrl(self::buildAdminUrl('/admin-cabinet/general-settings/modify/#ssh'));

                // Queue with critical priority (security alert is critical)
                NotificationQueueHelper::queueOrSend(
                    $builder,
                    async: true,
                    priority: NotificationQueueHelper::PRIORITY_CRITICAL
                );
            } else {
                // Fallback to legacy if no admin email configured
                Notifications::sendAdminNotification(['messageTpl' => 'adv_SSHPasswordWasChangedSubject'], ['messageTpl' => 'adv_SSHPasswordWasChangedBody'], true);
            }
        }
        return $messages;
    }

    /**
     * Build admin panel URL using network settings
     *
     * @param string $path Path to append to base URL
     * @return string Full URL to admin panel
     */
    private static function buildAdminUrl(string $path = ''): string
    {
        // Get HTTPS port from settings
        $httpsPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT) ?: '443';

        // Try to get external IP first, then local IP
        $host = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_IP_ADDR);
        if (empty($host)) {
            $host = gethostname() ?: 'localhost';
        }

        // Build URL
        $portSuffix = ($httpsPort === '443') ? '' : ':' . $httpsPort;
        return 'https://' . $host . $portSuffix . $path;
    }

}