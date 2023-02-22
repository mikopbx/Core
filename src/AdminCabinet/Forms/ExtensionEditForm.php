<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\ExtensionForwardingRights;
use MikoPBX\Common\Models\ExternalPhones;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;
use Phalcon\Mvc\Model;

/**
 * Class ExtensionEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class ExtensionEditForm extends Form
{
    public function initialize($entity = null, $options = null): void
    {
        // EXTENSION

        // ID
        $this->add(new Hidden('id'));

        // Number
        $this->add(
            new Text(
                'number', [
                "data-inputmask" => "'mask': '" . $options["internalextension_mask"] . "'",
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

        // USER
        $user = $entity->Users??new Users();
        // ID
        $this->add(new Hidden('user_id', ["value" => $user->id]));

        // User role
        $this->add(new Hidden('user_role', ["value" => $user->role]));

        // Username
        $this->add(new Text('user_username', ["value" => $user->username, 'autocomplete' => 'off']));

        // Email
        $this->add(
            new Text(
                'user_email', [ "value" => $user->email, 'autocomplete' => 'off']
            )
        );

        // Picture
        $this->add(new Hidden('user_avatar', ["value" => $user->avatar]));

        // SIP
        $sip = $entity->Sip??new Sip();
        $this->add(new Hidden('sip_id', ["value" => $sip->id]));

        // Disabled
        $this->add(new Hidden('sip_disabled', ["value" => $sip->disabled]));

        // Extension
        $this->add(new Hidden('sip_extension', ["value" => $sip->extension]));

        // ID
        $this->add(new Hidden('sip_id', ["value" => $sip->id]));

        // Uniqid
        $this->add(new Hidden('sip_uniqid', ["value" => $sip->uniqid]));

        // Type
        $this->add(new Hidden('sip_type', ["value" => $sip->type]));

        // Secret
        $this->add(
            new Text(
                'sip_secret', [
                "value" => $sip->secret,
                "class"=>"confidential-field",
                'autocomplete' => 'off'
            ]
            )
        );

        // Busylevel
        $this->add(new Numeric('sip_busylevel', ["value" => $sip->busylevel, 'autocomplete' => 'off']));

        // Dtmfmode
        $arrDTMFType = [
            'auto'      => $this->translation->_('auto'),
            'inband'    => $this->translation->_('inband'),
            'info'      => $this->translation->_('info'),
            'rfc4733'   => $this->translation->_('rfc4733'),
            'auto_info' => $this->translation->_('auto_info'),
        ];

        $dtmfmode = new Select(
            'sip_dtmfmode', $arrDTMFType, [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'value'    => $sip->dtmfmode,
            'class'    => 'ui selection dropdown',
        ]
        );
        $this->add($dtmfmode);

        // Transport
        $arrTransport = [
            Sip::TRANSPORT_UDP    => Sip::TRANSPORT_UDP,
            Sip::TRANSPORT_TCP    => Sip::TRANSPORT_TCP,
            Sip::TRANSPORT_TLS    => Sip::TRANSPORT_TLS,
        ];

        $transport = new Select(
            'sip_transport', $arrTransport, [
            'using'    => [
                'id',
                'name',
            ],
           'emptyText'  => 'udp, tcp',
           'emptyValue' => ' ',
            'useEmpty' => true,
            'value'    => empty($sip->transport)?' ':$sip->transport,
            'class'    => 'ui selection dropdown',
        ]
        );
        $this->add($transport);

        // Networkfilterid
        $networkfilterid = new Select(
            'sip_networkfilterid', $options['network_filters'], [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'value'    => $sip->networkfilterid,
            'class'    => 'ui selection dropdown network-filter-select',
        ]
        );
        $this->add($networkfilterid);

        // Qualify
        $cheskarr = ['value' => null];
        if ($sip->qualify) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('qualify', $cheskarr));

        // Qualifyfreq
        $this->add(new Numeric('qualifyfreq', ["value" => $sip->qualifyfreq, 'autocomplete' => 'off']));

        // Manualattributes
        $rows = max(
            round(strlen($sip->getManualAttributes()) / 95),
            2
        );
        $this->add(
            new TextArea(
                'sip_manualattributes',
                ["value" => $sip->getManualAttributes(), "rows" => $rows]
            )
        );

        // Description
        $this->add(new Text('sip_description', ["value" => $sip->description, 'autocomplete' => 'off']));

        // EXTERNAL Extension
        $this->add(new Text('mobile_number', ["value" => $options['external_extension']->number, 'autocomplete' => 'off']));
        // Uniqid
        $externalPhones = $options['external_extension']->ExternalPhones??new ExternalPhones();
        $this->add(new Hidden('mobile_uniqid', ["value" => $externalPhones->uniqid]));
        // Disabled
        $this->add(
            new Hidden(
                'mobile_disabled',
                ["value" => $externalPhones->disabled]
            )
        );
        // Dialstring
        $this->add(
            new Text(
                'mobile_dialstring',
                ["value" => $externalPhones->dialstring, 'autocomplete' => 'off']
            )
        );


        // Routing
        // Forwarding
        $extensionForwardingRights = $entity->ExtensionForwardingRights??new ExtensionForwardingRights();
        $this->add(
            new Select(
                'fwd_forwarding', $options['forwarding_extensions'], [
                'using'    => [
                    'id',
                    'name',
                ],
                'useEmpty' => true,
                'value'    => $extensionForwardingRights->forwarding,
                'class'    => 'ui selection dropdown search forwarding-select',
            ]
            )
        );

        // Forwardingonbusy
        $this->add(
            new Select(
                'fwd_forwardingonbusy', $options['forwarding_extensions'], [
                'using'    => [
                    'id',
                    'name',
                ],
                'useEmpty' => true,
                'value'    => $extensionForwardingRights->forwardingonbusy,
                'class'    => 'ui selection dropdown search forwarding-select',
            ]
            )
        );
        // Forwardingonunavailable
        $this->add(
            new Select(
                'fwd_forwardingonunavailable', $options['forwarding_extensions'], [
                'using'    => [
                    'id',
                    'name',
                ],
                'useEmpty' => true,
                'value'    => $extensionForwardingRights->forwardingonunavailable,
                'class'    => 'ui selection dropdown search forwarding-select',
            ]
            )
        );
        // RingLength
        $ringDuration = (int)$extensionForwardingRights->ringlength;
        $this->add(
            new Numeric(
                'fwd_ringlength', [
                "maxlength"    => 2,
                "style"        => "width: 80px;",
                "defaultValue" => 120,
                "value"        => ($ringDuration > 0) ? $ringDuration : '',
                'autocomplete' => 'off'
            ]
            )
        );

        $checkArr = ['value' => null];
        if ($sip->enableRecording !== '0') {
            $checkArr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('sip_enableRecording', $checkArr));
    }
}