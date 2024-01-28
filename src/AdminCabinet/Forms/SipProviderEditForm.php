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

use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;

/**
 * Class SipProviderEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class SipProviderEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // ProviderType
        $this->add(new Hidden('providerType', ['value' => 'SIP']));

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
        $this->add(new Password('secret'));

        // Host
        $this->add(new Text('host'));

        // Dtmfmode
        $arrDTMFType = [
            'auto' => $this->translation->_('auto'),
            'inband' => $this->translation->_('inband'),
            'info' => $this->translation->_('info'),
            'rfc4733' => $this->translation->_('rfc4733'),
            'auto_info' => $this->translation->_('auto_info'),
        ];

        $dtmfmode = new Select(
            'dtmfmode', $arrDTMFType, [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'value' => $entity->dtmfmode,
                'class' => 'ui selection dropdown',
            ]
        );
        $this->add($dtmfmode);

        $regTypeArray = [
            Sip::REG_TYPE_OUTBOUND => $this->translation->_('sip_REG_TYPE_OUTBOUND'),
            Sip::REG_TYPE_INBOUND => $this->translation->_('sip_REG_TYPE_INBOUND'),
            Sip::REG_TYPE_NONE => $this->translation->_('sip_REG_TYPE_NONE'),
        ];

        $regTypeValue = $entity->registration_type;
        if (empty($regTypeValue)) {
            $regTypeValue = ($entity->noregister === '0') ? Sip::REG_TYPE_OUTBOUND : Sip::REG_TYPE_NONE;
        }
        $regType = new Select(
            'registration_type', $regTypeArray, [
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

        // Transport
        $arrTransport = [
            Sip::TRANSPORT_UDP => Sip::TRANSPORT_UDP,
            Sip::TRANSPORT_TCP => Sip::TRANSPORT_TCP,
            Sip::TRANSPORT_TLS => Sip::TRANSPORT_TLS,
        ];
        $transport = new Select(
            'transport', $arrTransport, [
                'using' => [
                    'id',
                    'name',
                ],
                'emptyText' => 'udp, tcp',
                'emptyValue' => ' ',
                'useEmpty' => true,
                'value' => empty($entity->transport) ? ' ' : $entity->transport,
                'class' => 'ui selection dropdown',
            ]
        );
        $this->add($transport);

        // Port
        $this->add(new Numeric('port'));
        $this->add(new Text('outbound_proxy'));

        // Qualify
        $cheskarr = ['value' => null];
        if ($entity->qualify) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('qualify', $cheskarr));

        // Qualifyfreq
        $this->add(new Numeric('qualifyfreq',["maxlength" => 3,
            "style" => "width: 80px;"]));

        // Fromuser
        $this->add(new Text('fromuser'));

        // Fromdomain
        $this->add(new Text('fromdomain'));

        // Noregister
        $cheskarr = ['value' => null];
        if ($entity->noregister) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('noregister', $cheskarr));

        // Disablefromuser
        $cheskarr = ['value' => null];
        if ($entity->disablefromuser) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('disablefromuser', $cheskarr));

        // Receive_calls_without_auth
        $cheskarr = ['value' => null];
        if ($entity->receive_calls_without_auth) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('receive_calls_without_auth', $cheskarr));

        // Manualattributes
        $this->addTextArea('manualattributes', $entity->getManualAttributes()??'', 65);

        // Note
        $this->addTextArea('note', $options['note']??'', 80, ['class'=>'confidential-field']);
    }
}