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
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * Class CheckAMIPasswords
 * This class is responsible for checking password quality on backend.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckAmiPasswords extends Injectable
{
    /**
     * Check the quality of AMI passwords.
     *
     * @return array An array containing warning and needUpdate messages.
     *
     */
    public function process(): array
    {
        $messages = [];

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

        return $messages;
    }
}