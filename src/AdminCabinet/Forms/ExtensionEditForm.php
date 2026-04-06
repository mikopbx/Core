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
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Password;
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
    /**
     * List of checkbox fields that should be automatically converted to boolean.
     * This is used by JavaScript to properly handle form submission.
     * 
     * @var array
     */
    public array $checkboxFields = [
        'sip_enableRecording'
    ];
    
    public function initialize($entity = null, $options = null): void
    {
        // Entity is not used anymore - all data comes from REST API
        parent::initialize(null, $options);

        // EXTENSION

        // ID
        $this->add(new Hidden('id'));

        // Number
        // Input mask will be initialized dynamically from REST API data in JavaScript
        $this->add(new Text('number'));

        
        // USER Username (readonly + onfocus hack prevents browser autofill)
        $this->add(new Text('user_username', [
            'autocomplete' => 'off',
            'readonly' => 'readonly',
            'onfocus' => "this.removeAttribute('readonly')",
        ]));

        // USER Email
        $this->add(
            new Text(
                'user_email',
                ['autocomplete' => 'off']
            )
        );

        // USER Picture
        $this->add(new Hidden('user_avatar'));


        // SIP extension
        $this->add(new Hidden('sip_extension'));

        // SIP Secret
        $this->add(
            new Password(
                'sip_secret',
                [
                    'autocomplete' => 'new-password',
                    'data-no-password-manager' => 'true'
                ]
            )
        );

         // DTMF Mode - Universal Dropdown
         $this->addSemanticUIDropdown(
            'sip_dtmfmode',
            [
                'auto' => $this->translation->_('auto'),
                'rfc4733' => $this->translation->_('rfc4733'),
                'info' => $this->translation->_('info'),
                'inband' => $this->translation->_('inband'),
                'auto_info' => $this->translation->_('auto_info')
            ],
            'auto', // Default value, actual value will come from REST API
            [
                'clearable' => false,
                'forceSelection' => true
            ]
        );

        // SIP EnableRecording
        $this->addCheckBox('sip_enableRecording', false); // Default value, actual value will come from REST API


        // SIP Transport
        $this->addSemanticUIDropdown(
            'sip_transport',
            [
                Sip::TRANSPORT_AUTO => Sip::TRANSPORT_AUTO,
                Sip::TRANSPORT_UDP => Sip::TRANSPORT_UDP,
                Sip::TRANSPORT_TCP => Sip::TRANSPORT_TCP,
                Sip::TRANSPORT_TLS => Sip::TRANSPORT_TLS,
            ],
            Sip::TRANSPORT_AUTO, // Default value, actual value will come from REST API
            [
                'clearable' => false,
                'forceSelection' => true
            ]
        );

        // SIP Networkfilterid - V5.0 Universal Dropdown Architecture
        // JavaScript will initialize DynamicDropdownBuilder with API data
        $this->add(new Hidden('sip_networkfilterid'));

        // SIP Manualattributes
        $placeholderText = "[endpoint]\ndevice_state_busy_at = 10\n\n[aor]\nmax_contacts = 5";
        $this->addTextArea('sip_manualattributes', $placeholderText, 80, [
            'placeholder' => $placeholderText,
            'skipEscaping' => true  // Technical configuration field - preserve special characters
        ]);

        // EXTERNAL Extension
        $this->add(new Text('mobile_number', ['autocomplete' => 'off']));

        // EXTERNAL Dialstring
        $this->add(
            new Text(
                'mobile_dialstring',
                ['autocomplete' => 'off']
            )
        );

        // Routing tab - V5.0 Universal Dropdown Architecture
        // JavaScript will initialize ExtensionSelector with clean data from REST API
        $this->add(new Hidden('fwd_forwarding'));

        $this->add(new Hidden('fwd_forwardingonbusy'));

        $this->add(new Hidden('fwd_forwardingonunavailable'));

        // RingLength
        $this->add(
            new Numeric(
                'fwd_ringlength',
                [
                    "maxlength" => 2,
                    "style" => "width: 80px;",
                    "defaultValue" => 120,
                    "value" => 0, // Default value, actual value will come from REST API
                    'autocomplete' => 'off'
                ]
            )
        );
    }

    // V5.0 Architecture: Dropdown preparation methods removed
    // Data loading and dropdown creation moved to JavaScript using:
    // - ExtensionSelector for forwarding extensions
    // - DynamicDropdownBuilder for network filters
    // - Clean data from REST API with represent fields

    /**
     * Helper method to determine if a value should be considered "true"
     * Works with both boolean values (from REST API v2) and string values (from legacy)
     *
     * @param mixed $value The value to check (bool, string, int, or null)
     * @return bool True if the value should be considered "true", false otherwise
     */
    private function isTrueValue($value): bool
    {
        // Handle null or empty values
        if ($value === null || $value === '') {
            return false;
        }
        
        // Handle boolean values (from REST API v2)
        if (is_bool($value)) {
            return $value;
        }
        
        // Handle string values (from legacy API)
        if (is_string($value)) {
            return $value === '1' || strtolower($value) === 'true';
        }
        
        // Handle integer values
        if (is_int($value)) {
            return $value !== 0;
        }
        
        // For any other type, convert to int and check
        return intval($value) === 1;
    }
}
