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
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;
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
        $this->add(new Text('network', [
            'value' => $options['network'],
            'data-inputmask' => "'alias': 'ip'",
            'placeholder' => '192.168.1.0'
        ]));

        // Makes subnet dropdown
        $arrMasks = Cidr::getNetMasks();
        
        // Use SemanticUIDropdown for proper REST API compatibility
        // getNetMasks() already returns array in correct format: ['0' => '0 - 0.0.0.0', ...]
        $this->addSemanticUIDropdown(
            'subnet',
            $arrMasks,
            $options['subnet'],
            [
                'class' => 'ui selection dropdown ipaddress',
                'placeholder' => '',
                'clearable' => false,
                'forceSelection' => true
            ]
        );

        // Newer_block_ip
        $this->addCheckBox(
            'newer_block_ip',
            intval($entity->newer_block_ip) === 1
        );

        // Local_network
        $this->addCheckBox(
            'local_network',
            intval($entity->local_network) === 1
        );
    }
}
