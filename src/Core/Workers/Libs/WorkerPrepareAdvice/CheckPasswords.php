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

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * Class CheckPasswords
 * This class is responsible for checking password quality on backend.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckPasswords extends Injectable
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

        $this->checkWebPassword($messages);

        $this->checkSSHPassword($messages);

        $this->checkSipSecrets($messages);

        $this->checkAmiSecrets($messages);

        return $messages;
    }

    /**
     * Checks WEB password quality.
     *
     * @param array $messages
     */
    private function checkWebPassword(array &$messages): void
    {
        $passwords = $this->getPasswordCollection();

        if ($passwords->web === $passwords->cloudInstanceId) {
            return; // It is OK
        }

        $messageParams = [
            'name' => 'WEB password',
            'url' => $this->url->get('general-settings/modify/#/passwords')
        ];

        if ($passwords->webByDefault === $passwords->web) {
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
        $passwords->ssh = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PASSWORD);
        $passwords->sshByDefault = $arrOfDefaultValues[PbxSettingsConstants::SSH_PASSWORD];
        $passwords->sshHashFile = PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PASSWORD_HASH_FILE);
        $passwords->cloudInstanceId = PbxSettings::getValueByKey(PbxSettingsConstants::CLOUD_INSTANCE_ID);
        return $passwords;
    }

    /**
     * Checks SSH password quality and /etc/shadow integrity
     *
     * @param array $messages
     */
    private function checkSSHPassword(array &$messages): void
    {
        $passwords = $this->getPasswordCollection();

        $messageParams = [
            'name' => 'SSH password',
            'url' => $this->url->get('general-settings/modify/#/ssh')
        ];

        if ($passwords->sshByDefault === $passwords->ssh) {
            // Check for default password
            $messages['error'][] = [
                'messageTpl' => 'adv_YouUseDefaultSSHPassword',
                'messageParams' => $messageParams
            ];
            $messages['needUpdate'][] = PbxSettingsConstants::SSH_PASSWORD;
        } elseif ($passwords->ssh === $passwords->cloudInstanceId) {
            // It Is ok
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
    }

    /**
     * Prepares an array of sip passwords with representation to check password quality.
     * @param array $messages
     * @return void
     */
    private function checkSipSecrets(array &$messages): void
    {

        // Check passwords and save status
        $parameters = [
            'conditions' => 'weakSecret="0"'
        ];

        $sipRecordsToCheck = SIP::find($parameters);
        foreach ($sipRecordsToCheck as $sipRecord) {
            if (Util::isSimplePassword($sipRecord->secret)) {
                $sipRecord->assign(['weakSecret' => '2']); // Weak password
            } else {
                $sipRecord->assign(['weakSecret' => '1']); // OK, it is a strong password
            }
        }

        // Collect weak Extensions records
        $parameters = [
            'models' => [
                'Extensions' => Extensions::class,
            ],
            'conditions' => 'Extensions.is_general_user_number = "1" AND Sip.weakSecret="2"',
            'columns' => [
                'id' => 'Extensions.id',
                'username' => 'Extensions.callerid',
                'number' => 'Extensions.number',
                'secret' => 'Sip.secret',
            ],
            'order' => 'number',
            'joins' => [
                'Sip' => [
                    0 => Sip::class,
                    1 => 'Sip.extension=Extensions.number',
                    2 => 'Sip',
                    3 => 'INNER',
                ],
                'Users' => [
                    0 => Users::class,
                    1 => 'Users.id = Extensions.userid',
                    2 => 'Users',
                    3 => 'INNER',
                ],
            ],
        ];
        $queryResult = $this->di->get('modelsManager')->createBuilder($parameters)->getQuery()->execute();

        foreach ($queryResult as $user) {
            $key = "{$user->username} <{$user->number}>";
            $messages['warning'][] =
                [
                    'messageTpl' => 'adv_SipPasswordWeak',
                    'messageParams' => [
                        'record' => $key,
                        'url' => $this->url->get('extensions/modify/' . $user->id),
                    ]
                ];
        }
    }

    /**
     * Prepares an array of ami passwords with representation to check password weakness.
     * @param array $messages
     * @return void
     */
    private function checkAmiSecrets(array &$messages): void
    {
        // Check passwords and save status
        $parameters = [
            'conditions' => 'weakSecret="0"'
        ];

        $amiUsersToCheck = AsteriskManagerUsers::find($parameters);
        foreach ($amiUsersToCheck as $amiUser) {
            if (Util::isSimplePassword($amiUser->secret)) {
                $amiUser->assign(['weakSecret' => '2']); // Weak password
            } else {
                $amiUser->assign(['weakSecret' => '1']); // OK, it is a strong password
            }
        }

        // Collect weak AMI records
        $parameters = [
            'columns' => 'id, username, secret',
            'conditions' => 'weakSecret="2"'
        ];

        $amiUsersData = AsteriskManagerUsers::find($parameters);

        foreach ($amiUsersData as $amiUser) {
            $messages['warning'][] =
                [
                    'messageTpl' => 'adv_AmiPasswordWeak',
                    'messageParams' => [
                        'record' => $amiUser->username,
                        'url' => $this->url->get('asterisk-managers/modify/' . $amiUser->id),
                    ]
                ];
        }
    }
}