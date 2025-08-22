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

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use Phalcon\Di\Injectable;

/**
 * Class CheckSIPPasswords
 * This class is responsible for checking SIP password quality on backend.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckSIPPasswords extends Injectable
{
    /**
     * Prepares an array of sip passwords with representation to check password quality.
     * @return array of weak passwords to reset
     */
    public function process(): array
    {
        $messages = [];

        // Check passwords and save status
        $parameters = [
            'conditions' => 'weakSecret="0"'
        ];

        $sipRecordsToCheck = SIP::find($parameters);
        
        if ($sipRecordsToCheck->count() > 0) {
            // Collect all passwords for batch checking
            $passwords = [];
            $recordMap = [];
            
            foreach ($sipRecordsToCheck as $index => $sipRecord) {
                $passwords[$index] = $sipRecord->secret;
                $recordMap[$index] = $sipRecord;
            }
            
            // Check passwords individually using REST API
            foreach ($passwords as $index => $password) {
                $result = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
                    '/pbxcore/api/v2/passwords/checkDictionary',
                    PBXCoreRESTClientProvider::HTTP_METHOD_POST,
                    ['password' => $password]
                ]);
                
                if ($result && $result->success && isset($result->data['isInDictionary'])) {
                    $sipRecord = $recordMap[$index];
                    if ($result->data['isInDictionary']) {
                        $sipRecord->assign(['weakSecret' => '2']); // Weak password
                    } else {
                        $sipRecord->assign(['weakSecret' => '1']); // OK, it is a strong password
                    }
                    $sipRecord->save();
                }
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
            $key = "$user->username <$user->number>";
            $messages['warning'][] =
                [
                    'messageTpl' => 'adv_SipPasswordWeak',
                    'messageParams' => [
                        'record' => $key,
                        'url' => $this->url->get('extensions/modify/' . $user->id),
                    ]
                ];
        }
        return $messages;
    }

}