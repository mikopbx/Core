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
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;

/**
 * Class AsteriskManagerEditForm
 * @property TranslationProvider translation
 * @package MikoPBX\AdminCabinet\Forms
 */
class AsteriskManagerEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // Id
        $this->add(new Hidden('id'));

        // Username
        $this->add(new Text('username'));

        // Secret
        $this->add(new Text('secret', ["class" => "confidential-field"]));


        foreach ($options['array_of_checkboxes'] as $checkBox) {
            $cheskarr = [];
            $this->add(new Check($checkBox . '_main', $cheskarr));

            if (strpos($entity->$checkBox, 'read') !== false) {
                $cheskarr = ['checked' => 'checked', 'value' => null];
            }
            $this->add(new Check($checkBox . '_read', $cheskarr));

            if (strpos($entity->$checkBox, 'write') !== false) {
                $cheskarr = ['checked' => 'checked', 'value' => null];
            } else {
                $cheskarr = ['value' => null];
            }
            $this->add(new Check($checkBox . '_write', $cheskarr));
        }

        // Networkfilterid
        $networkfilterid = new Select(
            'networkfilterid', $options['network_filters'], [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'value' => $entity->networkfilterid,
                'class' => 'ui selection dropdown network-filter-select',
            ]
        );
        $this->add($networkfilterid);

        // Description
        $this->addTextArea('description', $entity->description??'', 65);

    }
}