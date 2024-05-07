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

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;

/**
 * Class NetworkEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class NetworkEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        $arrRealInterfaces = [];

        $this->add(new Text('hostname'));
        $this->add(new Text('gateway', ['class' => 'ipaddress']));
        $this->add(new Text('primarydns', ['class' => 'ipaddress']));
        $this->add(new Text('secondarydns', ['class' => 'ipaddress']));
        $this->add(new Text('extipaddr', ['placeholder'=>'123.111.123.111']));
        $this->add(new Text('exthostname', ['placeholder'=>'mikopbx.company.com']));
        $this->add(new Numeric(PbxSettingsConstants::EXTERNAL_SIP_PORT,
            [
                'placeholder'=>PbxSettings::getDefaultArrayValues()[PbxSettingsConstants::EXTERNAL_SIP_PORT],
                'style'=>'width:130px;',
                'value'=>PbxSettings::getValueByKey(PbxSettingsConstants::EXTERNAL_SIP_PORT)
            ]));
        $this->add(new Numeric(PbxSettingsConstants::EXTERNAL_TLS_PORT,
            [
                'placeholder'=>PbxSettings::getDefaultArrayValues()[PbxSettingsConstants::EXTERNAL_TLS_PORT],
                'style'=>'width:130px;',
                'value'=>PbxSettings::getValueByKey(PbxSettingsConstants::EXTERNAL_TLS_PORT)
            ]));

        // topology
        $cheskArr = ['value' => null];
        if ($entity->topology == LanInterfaces::TOPOLOGY_PRIVATE) {
            $cheskArr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('usenat', $cheskArr));

         // AUTO_UPDATE_EXTERNAL_IP
        $autoUpdateExternalIP = PbxSettings::getValueByKey(PbxSettingsConstants::AUTO_UPDATE_EXTERNAL_IP);
        $cheskArr = ['value' => null];
        if ($autoUpdateExternalIP == '1') {
            $cheskArr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check(PbxSettingsConstants::AUTO_UPDATE_EXTERNAL_IP, $cheskArr));

        // interfaces
        $arrInterfaces = [];
        foreach ($options['eths'] as $eth) {
            $this->add(
                new Hidden(
                    'interface_' . $eth->id, [
                        'value' => $eth->interface,
                    ]
                )
            );

            $this->add(
                new Text(
                    'name_' . $eth->id, [
                        'value' => $eth->name,
                    ]
                )
            );

            // DHCP
            $cheskarr = ['value' => null];
            if ($eth->dhcp) {
                $cheskarr = ['checked' => 'checked', 'value' => null];
            }

            $this->add(new Check('dhcp_' . $eth->id, $cheskarr));

            $this->add(
                new Text(
                    'ipaddr_' . $eth->id, [
                        'value' => $eth->ipaddr,
                        'class' => 'ipaddress',
                    ]
                )
            );

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
            $mask = new Select(
                'subnet_' . $eth->id, $arrMasks, [
                    'using' => [
                        'id',
                        'name',
                    ],
                    'useEmpty' => false,
                    'value' => $eth->subnet,
                    'class' => 'ui search selection dropdown',
                ]
            );
            $this->add($mask);

            $this->add(
                new Numeric(
                    'vlanid_' . $eth->id, [
                        'value' => $eth->vlanid,
                    ]
                )
            );

            $arrInterfaces[$eth->id] = $eth->name . ' (' . $eth->interface . (($eth->vlanid > 0) ? '.' . $eth->vlanid : '') . ')';
            if (!in_array($eth->interface, $arrRealInterfaces)) {
                $arrRealInterfaces[$eth->id] = $eth->interface;
            }
        }

        unset($arrInterfaces['0']);
        unset($arrRealInterfaces['0']);

        // Selector the internet interface
        $internetInterface = new Select(
            'internet_interface', $arrInterfaces, [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'value' => $entity->id,
                'class' => 'ui selection dropdown',
            ]
        );
        $this->add($internetInterface);


        // Template for new lan
        $newInterface = new Select(
            'interface_0', $arrRealInterfaces, [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => true,
                'class' => 'ui selection dropdown',
            ]
        );
        $this->add($newInterface);
    }
}