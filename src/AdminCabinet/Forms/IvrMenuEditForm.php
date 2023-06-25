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

use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;

/**
 * Class IvrMenuEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class IvrMenuEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);
        // ID
        $this->add(new Hidden('id'));

        // Name
        $this->add(new Text('name'));

        // Uniqid
        $this->add(new Hidden('uniqid'));

        // Extension
        $this->add(new Text('extension'));

        // Number of repeat
        $this->add(
            new Numeric(
                'number_of_repeat', [
                    "maxlength" => 2,
                    "style" => "width: 80px;",
                    "defaultValue" => 3,
                ]
            )
        );

        // Timeout
        $this->add(
            new Numeric(
                'timeout', [
                    "maxlength" => 2,
                    "style" => "width: 80px;",
                    "defaultValue" => 7,
                ]
            )
        );

        // Timeoutextension
        $extension = new Select(
            'timeout_extension', $options['extensions'], [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'class' => 'ui selection dropdown search forwarding-select',
            ]
        );
        $this->add($extension);

        // Audio_message_id
        $audioMessage = new Select(
            'audio_message_id', $options['soundfiles'], [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'class' => 'ui selection dropdown search audio-message-select',
            ]
        );
        $this->add($audioMessage);

        //Allow_enter_any_internal_extension
        $cheskarr = ['value' => null];
        if ($entity->allow_enter_any_internal_extension) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('allow_enter_any_internal_extension', $cheskarr));

        // Description
        $this->addTextArea('description', $entity->description??'', 65);

    }
}