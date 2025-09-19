<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

        // DTMF Mode - Universal Dropdown
        $this->addSemanticUIDropdown(
            'dtmfmode',
            [
                'auto' => $this->translation->_('auto'),
                'rfc4733' => $this->translation->_('rfc4733'),
                'info' => $this->translation->_('info'),
                'inband' => $this->translation->_('inband'),
                'auto_info' => $this->translation->_('auto_info')
            ],
            $entity->dtmfmode ?? 'auto',
            [
                'clearable' => false,
                'forceSelection' => true
            ]
        );

        // Registration type - Universal Dropdown
        $this->addSemanticUIDropdown(
            'registration_type',
            [
                'outbound' => $this->translation->_('pr_RegistrationTypeTooltip_outbound'),
                'inbound' => $this->translation->_('pr_RegistrationTypeTooltip_inbound'),
                'none' => $this->translation->_('pr_RegistrationTypeTooltip_none')
            ],
            $entity->registration_type ?? 'outbound',
            [
                'clearable' => false,
                'forceSelection' => true
            ]
        );

        // Transport protocol - Universal Dropdown
        $this->addSemanticUIDropdown(
            'transport',
            [
                Sip::TRANSPORT_UDP => Sip::TRANSPORT_UDP,
                Sip::TRANSPORT_TCP => Sip::TRANSPORT_TCP,
                Sip::TRANSPORT_TLS => Sip::TRANSPORT_TLS,
            ],
            $entity->transport ?? Sip::TRANSPORT_UDP,
            [
                'clearable' => false,
                'forceSelection' => true
            ]
        );

        // Port
        $this->add(new Numeric('port'));
        $this->add(new Text('outbound_proxy'));

        // Qualify
        $this->addCheckBox('qualify', intval($entity->qualify) === 1, '1');

        // Qualifyfreq
        $this->add(new Numeric('qualifyfreq', ["maxlength" => 3,
            "style" => "width: 80px;"]));

        // Fromuser
        $this->add(new Text('fromuser', [
            'placeholder' => $this->translation->_('pr_FromUserPlaceholder')
        ]));

        // Fromdomain
        $this->add(new Text('fromdomain', [
            'placeholder' => $this->translation->_('pr_FromDomainPlaceholder')
        ]));

        // Noregister
        $cheskarr = ['value' => null];
        if ($entity->noregister) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('noregister', $cheskarr));

        // Disablefromuser
        $this->addCheckBox('disablefromuser', intval($entity->disablefromuser) === 1, '1');

        // Receive_calls_without_auth
        $this->addCheckBox('receive_calls_without_auth', intval($entity->receive_calls_without_auth) === 1, '1');

        // Network Filter - using DynamicDropdownBuilder (built by JavaScript)
        $this->add(new Hidden('networkfilterid'));

        // Manualattributes
        $placeholderText = "[registration-auth]\nusername=962xxxxx030@ip.beeline.ru\n\n[endpoint-auth]\nusername=962xxxxx030@ip.beeline.ru";
        $this->addTextArea('manualattributes', $placeholderText, 65, [
            'placeholder' => $placeholderText,
            'skipEscaping' => true  // Technical configuration field - preserve special characters
        ]);

        // Note
        $this->addTextArea('note', $options['note'] ?? '', 80, ['class' => 'confidential-field']);
        
        // CallerID/DID Source Settings
        // CallerID Source - Universal Dropdown
        $this->addSemanticUIDropdown(
            'cid_source',
            [
                'default' => $this->translation->_('pr_CallerIdSourceDefault'),
                'from' => $this->translation->_('pr_CallerIdSourceFrom'),
                'rpid' => $this->translation->_('pr_CallerIdSourceRpid'),
                'pai' => $this->translation->_('pr_CallerIdSourcePai'),
                'custom' => $this->translation->_('pr_CallerIdSourceCustom')
            ],
            $entity->cid_source ?? 'default',
            [
                'clearable' => false,
                'forceSelection' => true
            ]
        );
        
        // DID Source - Universal Dropdown
        $this->addSemanticUIDropdown(
            'did_source',
            [
                'default' => $this->translation->_('pr_DidSourceDefault'),
                'to' => $this->translation->_('pr_DidSourceTo'),
                'diversion' => $this->translation->_('pr_DidSourceDiversion'),
                'custom' => $this->translation->_('pr_DidSourceCustom')
            ],
            $entity->did_source ?? 'default',
            [
                'clearable' => false,
                'forceSelection' => true
            ]
        );
        
        // CallerID Custom Settings
        $this->add(new Text('cid_custom_header', [
            'placeholder' => 'X-Caller-ID'
        ]));
        
        $this->add(new Text('cid_parser_start', [
            'placeholder' => '<'
        ]));
        
        $this->add(new Text('cid_parser_end', [
            'placeholder' => '>'
        ]));
        
        $this->add(new Text('cid_parser_regex', [
            'placeholder' => '([0-9]+)'
        ]));
        
        // DID Custom Settings
        $this->add(new Text('did_custom_header', [
            'placeholder' => 'X-DID'
        ]));
        
        $this->add(new Text('did_parser_start', [
            'placeholder' => '['
        ]));
        
        $this->add(new Text('did_parser_end', [
            'placeholder' => ']'
        ]));
        
        $this->add(new Text('did_parser_regex', [
            'placeholder' => '(?<=DID=)\\+?\\d+'
        ]));
        
        // Debug checkbox
        $this->addCheckBox('cid_did_debug', intval($entity->cid_did_debug) === 1, '1');
    }
}