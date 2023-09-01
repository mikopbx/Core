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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvices;

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
 * This class is responsible for checking passwords quality on backend.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvices
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
        $fields = [];

        // WebAdminPassword and SSHPassword
        $messages = $this->preparePasswordFields($fields);

        // SIP passwords
        $this->prepareSipFields($fields);

        // AMI Passwords
        $this->prepareAmiFields($fields);

        $cloudInstanceId = PbxSettings::getValueByKey('CloudInstanceId');
        foreach ($fields as $key => $value) {
            if ($cloudInstanceId !== $value['record'] && !Util::isSimplePassword($value['record'])) {
                continue;
            }

            if (in_array($key, ['WebAdminPassword', PbxSettingsConstants::SSH_PASSWORD], true)) {
                $messages['needUpdate'][] = $key;
            }
            $messages['warning'][] =
                [
                    'messageTpl'=>$value['message'],
                    'messageParams'=> [
                        'record' => $value['name'],
                        'url' => $this->url->get($value['urlTemplate']),
                    ]
                ];
        }

        return $messages;
    }


    /**
     * Prepares array of system passwords with representation to check password quality.
     *
     * @param array $fields
     * @return array
     */
    private function preparePasswordFields(array &$fields): array
    {
        $messages = [];

        $arrOfDefaultValues = PbxSettings::getDefaultArrayValues();
        $fields = [
            'WebAdminPassword' => [
                'urlTemplate' => 'general-settings/modify/#/passwords',
                'message' => 'adv_WebPasswordWeak',
                'name'  => 'WEB password',
                'record' => PbxSettings::getValueByKey('WebAdminPassword')
            ],
            PbxSettingsConstants::SSH_PASSWORD => [
                'urlTemplate' => 'general-settings/modify/#/ssh',
                'message' => 'adv_SshPasswordWeak',
                'name'  => 'SSH password',
                'record' => PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PASSWORD)
            ],
        ];
        if ($arrOfDefaultValues['WebAdminPassword'] === PbxSettings::getValueByKey('WebAdminPassword')) {
            $messages['error'][] = [
                'messageTpl'=>'adv_YouUseDefaultWebPassword',
                'messageParams'=>[
                    'url'=>$this->url->get('general-settings/modify/#/passwords')
                ]
            ];
            unset($fields['WebAdminPassword']);
            $messages['needUpdate'][] = 'WebAdminPassword';
        }
        if ($arrOfDefaultValues[PbxSettingsConstants::SSH_PASSWORD] === PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PASSWORD)) {
            $messages['error'][] = [
                'messageTpl'=>'adv_YouUseDefaultSSHPassword',
                'messageParams'=>[
                    'url'=>$this->url->get('general-settings/modify/#/ssh')
                ]
            ];
            unset($fields[PbxSettingsConstants::SSH_PASSWORD]);
            $messages['needUpdate'][] = PbxSettingsConstants::SSH_PASSWORD;
        } elseif (PbxSettings::getValueByKey(PbxSettingsConstants::SSH_PASSWORD_HASH_FILE) !== md5_file('/etc/shadow')) {
            $messages['warning'][] = [
                'messageTpl'=>'adv_SSHPPasswordCorrupt',
                'messageParams'=>[
                    'url'=>$this->url->get('general-settings/modify/#/ssh')
                ]
            ];
        }
        return $messages;
    }

    /**
     * Prepares array of ami passwords with representation to check password quality.
     * @param array $fields
     * @return void
     */
    private function prepareAmiFields(array &$fields): void
    {
        $amiUsersData = AsteriskManagerUsers::find([
                'columns' => 'id, username, secret']
        );
        foreach ($amiUsersData as $amiUser) {
            $fields[$amiUser->username] = [
                'urlTemplate' => 'asterisk-managers/modify/' . $amiUser->id,
                'message' => 'adv_AmiPasswordWeak',
                'name'  => $amiUser->username,
                'record' => $amiUser->secret
            ];
        }
    }

    /**
     * Prepares array of sip passwords with representation to check password quality.
     * @param array $fields
     * @return void
     */
    private function prepareSipFields(array &$fields): void
    {
        $parameters = [
            'models' => [
                'Extensions' => Extensions::class,
            ],
            'conditions' => 'Extensions.is_general_user_number = "1"',
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
            $fields[$key] = [
                'urlTemplate' => 'extensions/modify/' . $user->id,
                'message' => 'adv_SipPasswordWeak',
                'name'  => $key,
                'record' => $user->secret
            ];
        }
    }

}