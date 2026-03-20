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

        // Type
        $this->add(new Hidden('type'));

        // Description
        $this->add(new Text('description'));

        // Username (autocomplete="new-password" works better than "off" for browsers)
        $this->add(new Text('username', [
            'autocomplete' => 'new-password',
            'readonly' => 'readonly',
            'onfocus' => "this.removeAttribute('readonly')",
        ]));

        // Secret
        $this->add(new Password('secret', [
            'autocomplete' => 'new-password',
            'data-no-password-manager' => 'true'
        ]));

        // Host
        $this->add(new Text('host'));

        // Port
        $this->add(new Numeric('port'));

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

        // Qualify
        $this->addCheckBox(
            'qualify',
            intval($entity->qualify) === 1
        );

        // Noregister (hidden for backward compatibility)
        $this->add(new Hidden('noregister'));

        // Network Filter - using DynamicDropdownBuilder (built by JavaScript)
        $this->add(new Hidden('networkfilterid'));

        // Manualattributes
        $placeholderText = "language = ru\ncodecpriority = host\ntrunktimestamps = yes\ntrunk = yes";
        $this->addTextArea('manualattributes', $placeholderText, 80, [
            'placeholder' => $placeholderText,
            'skipEscaping' => true  // Technical configuration field - preserve special characters
        ]);

        // Note
        $this->addTextArea('note', $options['note'] ?? '', 80, ['class' => 'confidential-field']);
    }
}