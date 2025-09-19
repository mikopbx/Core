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

use MikoPBX\Common\Models\AsteriskRestUsers;
use MikoPBX\Core\System\PasswordService;
use Phalcon\Di\Injectable;

/**
 * Class CheckAriPasswords
 * This class is responsible for checking password quality on backend.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckAriPasswords extends Injectable
{
    /**
     * Check the quality of ARI passwords.
     *
     * @return array An array containing warning and needUpdate messages.
     *
     */
    public function process(): array
    {
        $messages = [];

        // Check passwords and save status
        $parameters = [
            'conditions' => 'weakPassword="0"'
        ];

        $ariUsersToCheck = AsteriskRestUsers::find($parameters);

        if ($ariUsersToCheck->count() > 0) {
            // Collect all passwords for batch checking
            $passwords = [];
            $userMap = [];

            foreach ($ariUsersToCheck as $index => $ariUser) {
                $passwords[$index] = $ariUser->password;
                $userMap[$index] = $ariUser;
            }

            // Check passwords individually
            foreach ($passwords as $index => $password) {
                $isInDictionary = PasswordService::checkDictionary($password);

                $ariUser = $userMap[$index];
                if ($isInDictionary) {
                    $ariUser->assign(['weakPassword' => '2']); // Weak password
                } else {
                    $ariUser->assign(['weakPassword' => '1']); // OK, it is a strong password
                }
                $ariUser->save();
            }
        }

        // Collect weak ARI records
        $parameters = [
            'columns' => 'id, username, password',
            'conditions' => 'weakPassword="2"'
        ];

        $ariUsersData = AsteriskRestUsers::find($parameters);

        foreach ($ariUsersData as $ariUser) {
            $messages['warning'][] =
                [
                    'messageTpl' => 'adv_AriPasswordWeak',
                    'messageParams' => [
                        'record' => $ariUser->username,
                        'url' => $this->url->get('asterisk-rest-users/modify/' . $ariUser->id),
                    ]
                ];
        }

        return $messages;
    }
}