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
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Text;

/**
 * Class FirewallEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider $translation
 */
class FirewallEditForm extends BaseForm
{
    /**
     * Initialize form elements
     *
     * All values will be populated by JavaScript after API data loads
     *
     * @param mixed $entity Entity object (unused - values set by JS)
     * @param mixed $options Form options (unused - values set by JS)
     * @return void
     */
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // Hidden fields
        $this->add(new Hidden('id'));

        // Text fields
        $this->add(new Text('description'));

        // IPv4 fields (always visible)
        $this->add(new Text('ipv4_network', [
            'data-inputmask' => "'alias': 'ip'",
            'placeholder' => '192.168.1.0'
        ]));

        $this->addSemanticUIDropdown(
            'ipv4_subnet',
            Cidr::getIPv4NetMasks(),
            32, // Default to /32 (single host) for new records
            [
                'class' => 'ui selection dropdown ipaddress',
                'placeholder' => '',
                'clearable' => false,
                'forceSelection' => true
            ]
        );

        // IPv6 fields (conditional - only shown when IPv6 is enabled)
        if (LanInterfaces::isIpv6Enabled()) {
            $this->add(new Text('ipv6_network', [
                'placeholder' => '2001:db8::'
            ]));

            $this->addSemanticUIDropdown(
                'ipv6_subnet',
                Cidr::getIPv6NetMasks(),
                128, // Default to /128 (single host) for new records
                [
                    'class' => 'ui selection dropdown ipaddress',
                    'placeholder' => '',
                    'clearable' => false,
                    'forceSelection' => true
                ]
            );
        }

        // Checkboxes (values will be set by JavaScript)
        $this->addCheckBox('newer_block_ip', false);
        $this->addCheckBox('local_network', false);
    }
}
