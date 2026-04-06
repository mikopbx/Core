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
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Text;

/**
 * Class TimeFrameEditForm
 * This class is responsible for creating the form used for editing out-of-work time conditions.
 * It extends from BaseForm to inherit common form functionality.
 * All dropdowns are dynamically populated via JavaScript and REST API.
 * 
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class TimeFrameEditForm extends BaseForm
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

        $this->addHiddenFields($entity);
        $this->addTextFields($entity);
        $this->addSpecialFields($entity);
    }
    
    /**
     * Add hidden form fields
     * These fields store values that will be populated by JavaScript
     *
     * @param mixed $entity The entity for which the form is being initialized.
     */
    private function addHiddenFields($entity): void
    {
        // Basic hidden fields
        $this->add(new Hidden('id'));
        $this->add(new Hidden('uniqid'));
        $this->add(new Hidden('priority'));
        
        // Hidden fields for dropdown values (populated by JS)
        $this->addSemanticUIDropdown(
            'action',
            [
                'playmessage' => $this->translation->_('tf_SelectActionPlayMessage'),
                'extension' => $this->translation->_('tf_SelectActionRedirectToExtension'),
            ],
            'playmessage', // Default value, actual value will come from REST API
            [
                'clearable' => false,
                'forceSelection' => true,
                'placeholder' => $this->translation->_('tf_SelectAction')
            ]
        );


        $this->add(new Hidden('extension'));
        $this->add(new Hidden('audio_message_id'));
        $this->add(new Hidden('calType', ['value' => $entity?->calType ?? 'timeframe']));
        $this->add(new Hidden('weekday_from'));
        $this->add(new Hidden('weekday_to'));
        
        // Date and time fields (text inputs for calendar widgets)
        $this->add(new Text('date_from'));
        $this->add(new Text('date_to'));
        $this->add(new Text('time_from'));
        $this->add(new Text('time_to'));
    }
    
    /**
     * Add text input fields
     *
     * @param mixed $entity The entity for which the form is being initialized.
     */
    private function addTextFields($entity): void
    {
        // Basic text fields
        $this->add(new Text('calUrl', [
            'autocomplete' => 'off',
            'placeholder' => 'https://caldav.example.com/calendars/user@example.com/calendar/'
        ]));
        $this->add(new Text('calUser', ['autocomplete' => 'off']));
        
        // Password field for calendar secret
        $this->add(new Password('calSecret', [
            'value' => $entity?->calSecret ?? '',
            'autocomplete' => 'new-password',
            'data-no-password-manager' => 'true',
        ]));
    }
    
    /**
     * Add special form fields
     *
     * @param mixed $entity The entity for which the form is being initialized.
     */
    private function addSpecialFields($entity): void
    {
        // Add text area for description with 2000 character limit
        $this->addTextArea('description', $entity?->description ?? '', 65, ['maxlength' => '2000']);
        
        // Add checkbox for allowRestriction
        // Note: The checkbox value will be converted to boolean in JavaScript
        // before sending to REST API
        $this->addCheckBox('allowRestriction', 
            ($entity?->allowRestriction ?? '0') === '1'
        );
    }
}
