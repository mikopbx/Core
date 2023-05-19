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

namespace MikoPBX\AdminCabinet\Forms;

use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;

/**
 * Class FirewallEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class FirewallEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        $this->add(new Hidden('id'));
        $this->add(new Text('description'));
        $this->add(new Text('network', ['value' => $options['network']]));

        // Makes subnet select
        $arrMasks = [
            "0" => "0 - 0.0.0.0",
            "1" => "1 - 128.0.0.0",
            "2" => "2 - 192.0.0.0",
            "3" => "3 - 224.0.0.0",
            "4" => "4 - 240.0.0.0",
            "5" => "5 - 248.0.0.0",
            "6" => "6 - 252.0.0.0",
            "7" => "7 - 254.0.0.0",
            "8" => "8 - 255.0.0.0",
            "9" => "9 - 255.128.0.0",
            "10" => "10 - 255.192.0.0",
            "11" => "11 - 255.224.0.0",
            "12" => "12 - 255.240.0.0",
            "13" => "13 - 255.248.0.0",
            "14" => "14 - 255.252.0.0",
            "15" => "15 - 255.254.0.0",
            "16" => "16 - 255.255.0.0",
            "17" => "17 - 255.255.128.0",
            "18" => "18 - 255.255.192.0",
            "19" => "19 - 255.255.224.0",
            "20" => "20 - 255.255.240.0",
            "21" => "21 - 255.255.248.0",
            "22" => "22 - 255.255.252.0",
            "23" => "23 - 255.255.254.0",
            "24" => "24 - 255.255.255.0",
            "25" => "25 - 255.255.255.128",
            "26" => "26 - 255.255.255.192",
            "27" => "27 - 255.255.255.224",
            "28" => "28 - 255.255.255.240",
            "29" => "29 - 255.255.255.248",
            "30" => "30 - 255.255.255.252",
            "31" => "31 - 255.255.255.254",
            "32" => "32 - 255.255.255.255",
        ];
        krsort($arrMasks, SORT_NUMERIC);

        $mask = new Select(
            'subnet', $arrMasks, [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'value' => $options['subnet'],
                'class' => 'ui selection dropdown ipaddress',
            ]
        );
        $this->add($mask);

        // Newer_block_ip
        $cheskarr = ['value' => null];
        if ($entity->newer_block_ip) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('newer_block_ip', $cheskarr));


        // Local_network
        $cheskarr = ['value' => null];
        if ($entity->local_network) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('local_network', $cheskarr));
    }
}