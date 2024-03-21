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

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;


/**
 * Class ExtensionEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class ExtensionEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // EXTENSION

        // ID
        $this->add(new Hidden('id'));

        // Number
        // Limit the length of internal extension based on settings
        $extensionsLength = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_INTERNAL_EXTENSION_LENGTH);
        $this->add(
            new Text(
                'number', [
                    "data-inputmask" => "'mask': '9{2,$extensionsLength}'",
                ]
            )
        );

        // Type
        $this->add(new Hidden('type'));

        // Is_general_user_number
        $this->add(new Hidden('is_general_user_number'));

        // Show_in_phonebook
        $cheskarr = ['value' => null];
        if ($entity->show_in_phonebook) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('show_in_phonebook', $cheskarr));

        // Public_access
        $cheskarr = ['value' => null];
        if ($entity->public_access) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('public_access', $cheskarr));

        // USER ID
        $this->add(new Hidden('user_id', ["value" => $entity->user_id]));

        // USER Username
        $this->add(new Text('user_username', ["value" => $entity->user_username, 'autocomplete' => 'off']));

        // USER Email
        $this->add(
            new Text(
                'user_email', ["value" => $entity->user_email, 'autocomplete' => 'off']
            )
        );

        // USER Picture
        $this->add(new Hidden('user_avatar', ["value" => $entity->user_avatar]));

        // SIP Uniqid
        $this->add(new Hidden('sip_uniqid', ["value" => $entity->sip_uniqid]));

        // SIP extension
        $this->add(new Hidden('sip_extension', ["value" => $entity->number]));

        // SIP Type
        $this->add(new Hidden('sip_type', ["value" => $entity->type]));

        // SIP Secret
        $this->add(
            new Text(
                'sip_secret', [
                    "value" => $entity->sip_secret,
                    "class" => "confidential-field",
                    'autocomplete' => 'off'
                ]
            )
        );

        // SIP Dtmfmode
        $arrDTMFType = [
            'auto' => $this->translation->_('auto'),
            'inband' => $this->translation->_('inband'),
            'info' => $this->translation->_('info'),
            'rfc4733' => $this->translation->_('rfc4733'),
            'auto_info' => $this->translation->_('auto_info'),
        ];

        $dtmfmode = new Select(
            'sip_dtmfmode', $arrDTMFType, [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'value' => $entity->sip_dtmfmode,
                'class' => 'ui selection dropdown',
            ]
        );
        $this->add($dtmfmode);

        // SIP EnableRecording
        $checkArr = ['value' => null];
        if ($entity->sip_enableRecording !== '0') {
            $checkArr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('sip_enableRecording', $checkArr));

        // SIP Transport
        $arrTransport = [
            Sip::TRANSPORT_UDP => Sip::TRANSPORT_UDP,
            Sip::TRANSPORT_TCP => Sip::TRANSPORT_TCP,
            Sip::TRANSPORT_TLS => Sip::TRANSPORT_TLS,
        ];

        $transport = new Select(
            'sip_transport', $arrTransport, [
                'using' => [
                    'id',
                    'name',
                ],
                'emptyText' => 'udp, tcp',
                'emptyValue' => ' ',
                'useEmpty' => true,
                'value' => $entity->sip_transport,
                'class' => 'ui selection dropdown',
            ]
        );
        $this->add($transport);

        // SIP Networkfilterid
        $networkfilterid = new Select(
            'sip_networkfilterid', $this->prepareNetworkFilters(), [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'value' => $entity->sip_networkfilterid,
                'class' => 'ui selection dropdown network-filter-select',
            ]
        );
        $this->add($networkfilterid);

        // SIP Manualattributes
        $this->addTextArea('sip_manualattributes', base64_decode($entity->sip_manualattributes)??'', 80);

        // EXTERNAL Extension
        $this->add(new Text('mobile_number', ["value" => $entity->mobile_number, 'autocomplete' => 'off']));

        // EXTERNAL Uniqid
        $this->add(new Hidden('mobile_uniqid', ["value" => $entity->mobile_uniqid]));

        // EXTERNAL Dialstring
        $this->add(
            new Text(
                'mobile_dialstring',
                ["value" => $entity->mobile_dialstring, 'autocomplete' => 'off']
            )
        );

        // Routing tab
        $forwardingExtensions = $this->prepareForwardingExtensions($entity);

        // Forwarding
        $this->add(
            new Select(
                'fwd_forwarding', $forwardingExtensions, [
                    'using' => [
                        'id',
                        'name',
                    ],
                    'useEmpty' => true,
                    'value' => $entity->fwd_forwarding,
                    'class' => 'ui selection dropdown search forwarding-select',
                ]
            )
        );

        // Forwardingonbusy
        $this->add(
            new Select(
                'fwd_forwardingonbusy', $forwardingExtensions, [
                    'using' => [
                        'id',
                        'name',
                    ],
                    'useEmpty' => true,
                    'value' => $entity->fwd_forwardingonbusy,
                    'class' => 'ui selection dropdown search forwarding-select',
                ]
            )
        );

        // Forwardingonunavailable
        $this->add(
            new Select(
                'fwd_forwardingonunavailable', $forwardingExtensions, [
                    'using' => [
                        'id',
                        'name',
                    ],
                    'useEmpty' => true,
                    'value' => $entity->fwd_forwardingonunavailable,
                    'class' => 'ui selection dropdown search forwarding-select',
                ]
            )
        );

        // RingLength
        $ringDuration = (int)$entity->fwd_ringlength;
        $this->add(
            new Numeric(
                'fwd_ringlength', [
                    "maxlength" => 2,
                    "style" => "width: 80px;",
                    "defaultValue" => 120,
                    "value" => ($ringDuration > 0) ? $ringDuration : 0,
                    'autocomplete' => 'off'
                ]
            )
        );
    }

    /**
     * Prepare an array of forwarding extensions based on the provided extension.
     *
     * @param object $entity extensions request structure.
     * @return array An array of forwarding extensions with their numbers and representations.
     */
    private function prepareForwardingExtensions(object $entity): array
    {
        $forwardingExtensions = [];
        $forwardingExtensions[''] = $this->translation->_('ex_SelectNumber');

        $parameters = [
            'conditions' => 'number IN ({ids:array})',
            'bind' => [
                'ids' => [
                    $entity->fwd_forwarding,
                    $entity->fwd_forwardingonbusy,
                    $entity->fwd_forwardingonunavailable
                ],
            ],
        ];
        $extensions = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $forwardingExtensions[$record->number] = $record->getRepresent();
        }
        return $forwardingExtensions;
    }

    /**
     * Get an array of prepared network filters for SIP type.
     *
     * @return array An array of network filters with their IDs and representations.
     */
    private function prepareNetworkFilters(): array
    {
        $arrNetworkFilters = [];
        $networkFilters = NetworkFilters::getAllowedFiltersForType(['SIP']);
        $arrNetworkFilters['none'] = $this->translation->_('ex_NoNetworkFilter');
        foreach ($networkFilters as $filter) {
            $arrNetworkFilters[$filter->id] = $filter->getRepresent();
        }
        return $arrNetworkFilters;
    }
}