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

use MikoPBX\AdminCabinet\Library\Cidr;
use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\TranslationProvider;
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
        $this->add(new Text('extipaddr', ['placeholder' => '123.111.123.111']));
        $this->add(new Text('exthostname', ['placeholder' => 'mikopbx.company.com']));
        $this->add(new Numeric(
            PbxSettings::EXTERNAL_SIP_PORT,
            [
                'placeholder' => PbxSettings::getDefaultArrayValues()[PbxSettings::EXTERNAL_SIP_PORT],
                'style' => 'width:130px;',
                'value' => PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_PORT)
            ]
        ));
        $this->add(new Numeric(
            PbxSettings::EXTERNAL_TLS_PORT,
            [
                'placeholder' => PbxSettings::getDefaultArrayValues()[PbxSettings::EXTERNAL_TLS_PORT],
                'style' => 'width:130px;',
                'value' => PbxSettings::getValueByKey(PbxSettings::EXTERNAL_TLS_PORT)
            ]
        ));

        // topology
        $this->addCheckBox('usenat', $entity->topology == LanInterfaces::TOPOLOGY_PRIVATE);

        // AUTO_UPDATE_EXTERNAL_IP
        $this->addCheckBox(
            PbxSettings::AUTO_UPDATE_EXTERNAL_IP,
            intval(PbxSettings::getValueByKey(PbxSettings::AUTO_UPDATE_EXTERNAL_IP)) === 1
        );

        // interfaces
        $arrInterfaces = [];
        foreach ($options['eths'] as $eth) {
            $this->add(
                new Hidden(
                    'interface_' . $eth->id,
                    [
                        'value' => $eth->interface,
                    ]
                )
            );

            $this->add(
                new Text(
                    'name_' . $eth->id,
                    [
                        'value' => $eth->name,
                    ]
                )
            );

            // DHCP
            $this->addCheckBox('dhcp_' . $eth->id, intval($eth->dhcp) === 1);

            // IP ADDRESS
            $this->add(
                new Text(
                    'ipaddr_' . $eth->id,
                    [
                        'value' => $eth->ipaddr,
                        'class' => 'ipaddress',
                    ]
                )
            );

            // Makes subnet select
            $arrMasks = Cidr::getNetMasks();
            $mask = new Select(
                'subnet_' . $eth->id,
                $arrMasks,
                [
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

            // VLANS
            $this->add(
                new Numeric(
                    'vlanid_' . $eth->id,
                    [
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
            'internet_interface',
            $arrInterfaces,
            [
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
            'interface_0',
            $arrRealInterfaces,
            [
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
