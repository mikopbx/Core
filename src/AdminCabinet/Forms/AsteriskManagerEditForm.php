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
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Text;

/**
 * Class AsteriskManagerEditForm
 * This class is responsible for creating the form used for editing Asterisk managers.
 * It extends from BaseForm to inherit common form functionality.
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class AsteriskManagerEditForm extends BaseForm
{
    /**
     * Initialize the form elements
     *
     * @param mixed $entity The entity for which the form is being initialized.
     * @param mixed $options Additional options that may be needed.
     */
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        $this->addHiddenFields();
        $this->addTextFields();
        $this->addPasswordField($entity);
        $this->addPermissionCheckboxes();
        $this->addNetworkFilterDropdown();
        $this->addSpecialFields($entity);
    }
    
    /**
     * Add hidden form fields
     */
    private function addHiddenFields(): void
    {
        $hiddenFields = [
            'id' => [],
        ];
        
        foreach ($hiddenFields as $name => $attributes) {
            $this->add(new Hidden($name, $attributes));
        }
    }
    
    /**
     * Add text input fields
     */
    private function addTextFields(): void
    {
        $this->add(new Text('username', [
            'autocomplete' => 'off',
            'readonly' => 'readonly',
            'onfocus' => "this.removeAttribute('readonly')",
        ]));
    }
    
    /**
     * Add password field with security attributes
     */
    private function addPasswordField($entity): void
    {
        $this->add(new Text('secret', [
            'id' => 'secret',
            'type' => 'password',
            'value' => '',
            'autocomplete' => 'new-password',
            'data-no-password-manager' => 'true'
        ]));
    }
    
    /**
     * Add permission checkboxes
     * Checkboxes will be populated dynamically via JavaScript
     */
    private function addPermissionCheckboxes(): void
    {
        // Define available permissions
        $permissions = [
            'call', 'cdr', 'originate', 'reporting', 'agent', 'config', 
            'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'
        ];
        
        // Add checkbox elements for each permission (read and write)
        foreach ($permissions as $permission) {
            // Add read permission checkbox
            $this->add(new Check($permission . '_read', [
                'value' => '1',
                'id' => $permission . '_read',
                'class' => 'permission-checkbox'
            ]));
            
            // Add write permission checkbox
            $this->add(new Check($permission . '_write', [
                'value' => '1',
                'id' => $permission . '_write',
                'class' => 'permission-checkbox'
            ]));
        }
    }
    
    /**
     * Add network filter dropdown using DynamicDropdownBuilder (built by JavaScript)
     *
     */
    private function addNetworkFilterDropdown(): void
    {
        // Network filter - using DynamicDropdownBuilder (built by JavaScript)
        $this->add(new Hidden('networkfilterid'));
    }
    
    /**
     * Add special form fields
     *
     * @param mixed $entity The entity for which the form is being initialized.
     */
    private function addSpecialFields($entity): void
    {
        // Add text area for Event Filter with auto-resize, 2000 chars limit and placeholder
        $this->addTextArea('eventfilter', '', 65, [
            'maxlength' => 2000,
            'placeholder' => "Event: QueueMemberStatus\n!Event: VarSet"
        ]);

        // Add text area for Description with auto-resize, 2000 chars limit and placeholder
        $this->addTextArea('description', '', 65, [
            'maxlength' => 2000,
            'placeholder' => $this->translation->_('am_DescriptionPlaceholder')
        ]);
    }
}
