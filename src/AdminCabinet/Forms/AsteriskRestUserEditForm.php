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

use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Check;

/**
 * Form for editing Asterisk REST Interface (ARI) users
 */
class AsteriskRestUserEditForm extends BaseForm
{
    /**
     * Initialize the form
     * 
     * @param mixed $entity
     * @param array $options
     */
    public function initialize($entity = null, $options = []): void
    {
        parent::initialize($entity, $options);
        
        // Hidden ID field
        $this->add(new Hidden('id'));
        
        // Username field
        $this->add(new Text('username', [
            'placeholder' => $this->translation->_('ari_UsernamePlaceholder'),
            'autocomplete' => 'off',
            'readonly' => 'readonly',
            'onfocus' => "this.removeAttribute('readonly')",
        ]));
        
        // Password field
        $this->add(new Text('password', [
            'id' => 'password',
            'type' => 'password',
            'value' => '',
            'autocomplete' => 'new-password',
            'data-no-password-manager' => 'true',
            'placeholder' => $this->translation->_('ari_PasswordPlaceholder'),
        ]));
        
        // Description field
        $this->addTextArea(
            'description', 
            $entity->description ?? '',
            80,
            ['placeholder' => $this->translation->_('ari_DescriptionPlaceholder')]
        );
        
        // Applications field (for multi-select dropdown)
        $this->add(new Text('applications', [
            'placeholder' => $this->translation->_('ari_ApplicationsPlaceholder'),
        ]));
    }
}