<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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
use Phalcon\Di\Injectable;

/**
 * Class CheckSIPTlsTransport
 * Warns about employees whose SIP transport is still set to the deprecated "tls" value.
 * Such employees should connect via the dedicated "<number>-TLS" username instead.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckSIPTlsTransport extends Injectable
{
    /**
     * Prepares an array of employees with the deprecated TLS transport.
     * @return array
     */
    public function process(): array
    {
        $messages = [];

        $parameters = [
            'models' => [
                'Extensions' => Extensions::class,
            ],
            'conditions' => 'Extensions.is_general_user_number = "1" AND Sip.transport = :transport:',
            'bind' => [
                'transport' => Sip::TRANSPORT_TLS,
            ],
            'columns' => [
                'userid' => 'Extensions.userid',
                'username' => 'Extensions.callerid',
                'number' => 'Extensions.number',
            ],
            'order' => 'number',
            'joins' => [
                'Sip' => [
                    0 => Sip::class,
                    1 => 'Sip.extension=Extensions.number',
                    2 => 'Sip',
                    3 => 'INNER',
                ],
            ],
        ];
        $queryResult = $this->di->get('modelsManager')->createBuilder($parameters)->getQuery()->execute();

        foreach ($queryResult as $user) {
            $messages['warning'][] =
                [
                    'messageTpl' => 'adv_SipTransportTlsDeprecated',
                    'messageParams' => [
                        'record' => "$user->username <$user->number>",
                        'number' => $user->number,
                        'url' => $this->url->get('extensions/modify/' . $user->userid),
                    ]
                ];
        }
        return $messages;
    }
}
