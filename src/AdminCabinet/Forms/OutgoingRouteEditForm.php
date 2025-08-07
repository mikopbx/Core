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
use Phalcon\Forms\Element\Text;

/**
 * Class OutgoingRouteEditForm
 * This class is responsible for creating the form used for editing outgoing routes.
 * It extends from BaseForm to inherit common form functionality.
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider $translation
 */
class OutgoingRouteEditForm extends BaseForm
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
        $this->addNumericFields();
        $this->addSpecialFields($entity);
    }
    
    /**
     * Add hidden form fields
     */
    private function addHiddenFields(): void
    {
        $hiddenFields = [
            'id' => [],
            'priority' => [],
            'providerid' => ['id' => 'providerid'],
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
        // Rule name
        $this->add(new Text('rulename'));
        
        // Number begins with pattern
        $this->add(new Text('numberbeginswith'));
        
        // Prepend digits
        $this->add(new Text('prepend'));
        
        // Trim from begin
        $this->add(new Numeric('trimfrombegin', [
            'maxlength' => 2,
            'style' => 'width: 80px;',
            'min' => 0,
            'max' => 30
        ]));
    }
    
    /**
     * Add numeric input fields
     */
    private function addNumericFields(): void
    {
        // Rest numbers field
        $this->add(new Numeric('restnumbers', [
            'maxlength' => 2,
            'style' => 'width: 80px;',
            'min' => -1,
            'max' => 20
        ]));
    }
    
    /**
     * Add special form fields
     *
     * @param mixed $entity The entity for which the form is being initialized.
     */
    private function addSpecialFields($entity): void
    {
        // Add text area for Note
        $this->addTextArea('note', $entity?->note ?? '', 65);
    }
}