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

use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;

/**
 * Class IaxProviderEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class IaxProviderEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);
        // ProviderType
        $this->add(new Hidden('providerType', ['value' => 'IAX']));

        // Disabled
        $this->add(new Hidden('disabled'));

        // ID
        $this->add(new Hidden('id'));

        // Uniqid
        $this->add(new Hidden('uniqid'));

        // Type
        $this->add(new Hidden('type'));

        // Description
        $this->add(new Text('description'));

        // Username
        $this->add(new Text('username'));

        // Secret
        $this->add(new Password('secret', [
            'autocomplete' => 'new-password',
            'data-no-password-manager' => 'true'
        ]));

        // Host
        $this->add(new Text('host'));

        // Port
        $this->add(new Numeric('port'));

        // Registration Type
        $regTypeArray = [
            Iax::REGISTRATION_TYPE_OUTBOUND => $this->translation->_('iax_REG_TYPE_OUTBOUND'),
            Iax::REGISTRATION_TYPE_INBOUND => $this->translation->_('iax_REG_TYPE_INBOUND'),
            Iax::REGISTRATION_TYPE_NONE => $this->translation->_('iax_REG_TYPE_NONE'),
        ];

        $regTypeValue = $entity->registration_type;
        if (empty($regTypeValue)) {
            // Legacy support: if registration_type is not set, use noregister field
            $regTypeValue = ($entity->noregister === '0') ? Iax::REGISTRATION_TYPE_OUTBOUND : Iax::REGISTRATION_TYPE_NONE;
        }
        $regType = new Select(
            'registration_type',
            $regTypeArray,
            [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'value' => $regTypeValue,
                'class' => 'ui selection dropdown',
            ]
        );
        $this->add($regType);

        // Receive calls without auth
        $this->addCheckBox('receive_calls_without_auth', intval($entity->receive_calls_without_auth) === 1);

        // Qualify
        $this->addCheckBox(
            'qualify',
            intval($entity->qualify) === 1
        );

        // Noregister (hidden for backward compatibility)
        $this->add(new Hidden('noregister'));

        // Network Filter
        $networkfilterid = new Select(
            'networkfilterid',
            $this->prepareNetworkFilters(),
            [
                'using' => ['id', 'name'],
                'useEmpty' => false,
                'value' => $entity->networkfilterid,
                'class' => 'ui selection dropdown network-filter-select',
            ]
        );
        $this->add($networkfilterid);

        // Manualattributes
        $placeholderText = "language = ru\ncodecpriority = host\ntrunktimestamps = yes\ntrunk = yes";
        $this->addTextArea('manualattributes', $entity->getManualAttributes() ?? '', 80, [
            'placeholder' => $placeholderText
        ]);

        // Note
        $this->addTextArea('note', $options['note'] ?? '', 80, ['class' => 'confidential-field']);
    }

    /**
     * Prepare network filters for the dropdown
     * @return array Array of network filters including 'none' option
     */
    private function prepareNetworkFilters(): array
    {
        $networks = [];
        $networks['none'] = $this->translation->_('pr_NoNetworkFilter');
        
        $arrNetworkFilters = NetworkFilters::find(['order' => 'permit']);
        
        foreach ($arrNetworkFilters as $network) {
            $networks[$network->id] = "{$network->description} ({$network->permit})";
        }
        
        return $networks;
    }
}
