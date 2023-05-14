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

use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;

/**
 * Class IncomingRouteEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class IncomingRouteEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // ID
        $this->add(new Hidden('id'));

        // Priority
        $this->add(new Hidden('priority'));

        // Action
        $this->add(new Hidden('action', ['value' => 'extension']));

        // Rulename
        $this->add(new Text('rulename'));

        // Number
        $this->add(new Text('number'));

        // Note
        $this->addTextArea('note', $entity->note, 65);

        // Timeout
        $this->add(new Numeric('timeout', ['maxlength' => 3, 'style' => 'width: 80px;', 'defaultValue' => 120]));

        // Providers
        $providers = new Select(
            'provider', $options['providers'], [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'class' => 'ui selection dropdown provider-select',
            ]
        );
        $this->add($providers);

        // Extension
        $extension = new Select(
            'extension', $options['extensions'], [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'class' => 'ui selection dropdown search forwarding-select',
            ]
        );
        $this->add($extension);
    }
}