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

use MikoPBX\Common\Models\LanInterfaces;
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
     * Monitors /etc/shadow for unauthorized modifications.
     * The SSH password is now stored as SHA-512 hash in SSH_PASSWORD,
     * so we only check if /etc/shadow was modified outside of MikoPBX.
     *
     * @return array<string, array<int, array<string, mixed>>> An array containing warning messages.
     */
    public function process(): array
    {
        $messages = [];
        $hashFile = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD_HASH_FILE, false);

        // Check if /etc/shadow was modified outside of MikoPBX
        if ($hashFile !== md5_file('/etc/shadow')) {
            // The system password does not match what is set in the configuration file.
            $messages['error'][] = ['messageTpl' => 'adv_SSHPasswordMismatchFilesHash'];
        }

        if (isset($messages['error'])) {
            // Queue notification for async sending via WorkerNotifyByEmail
            $adminEmail = PbxSettings::getValueByKey(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL);

            if (!empty($adminEmail)) {
                $builder = new SshPasswordChangedNotificationBuilder();
                $builder->setRecipient($adminEmail)
                        ->setChangedBy('external')
                        ->setChangeTime(date('Y-m-d H:i:s'))
                        ->setSecurityUrl(LanInterfaces::buildAdminUrl('/admin-cabinet/general-settings/modify/#ssh'));

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

}