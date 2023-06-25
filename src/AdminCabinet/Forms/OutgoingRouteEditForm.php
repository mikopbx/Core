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
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;

/**
 * Class OutgoingRouteEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class OutgoingRouteEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // ID
        $this->add(new Hidden('id'));

        // Priority
        $this->add(new Hidden('priority'));

        // Rulename
        $this->add(new Text('rulename'));

        // Note
        $this->addTextArea('note', $entity->note??'', 65);

        // Numberbeginswith
        $this->add(new Text('numberbeginswith'));

        // Prepend
        $this->add(new Text('prepend'));

        // Restnumbers
        $this->add(new Numeric('restnumbers', ["maxlength" => 2, "style" => "width: 80px;", 'min' => 0]));

        // Trimfrombegin
        $this->add(new Text('trimfrombegin', ["maxlength" => 2, "style" => "width: 80px;", 'min' => 0]));

        // Providers
        $providers = new Select(
            'providerid', $options, [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'class' => 'ui selection dropdown providerselect',
            ]
        );
        $this->add($providers);
    }
}