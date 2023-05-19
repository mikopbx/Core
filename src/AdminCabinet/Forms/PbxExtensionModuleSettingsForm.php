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
 * Class PbxExtensionModuleSettingsForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class PbxExtensionModuleSettingsForm extends BaseForm
{

    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // ModuleUniqId
        $this->add(new Hidden('uniqid', ['value' => $options['uniqid']]));

        // Key
        $this->add(new Hidden('key', ['value' => $entity->key]));

        // Href
        $this->add(new Hidden('href', ['value' => $options['href']]));

        // IconClass
        $this->add(new Hidden('iconClass', ['value' => $options['iconClass']]));

        // Show module at left menu
        $cheskarr = ['value' => null];
        if ($options['showAtSidebar']) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('show-at-sidebar', $cheskarr));

        // Caption
        $this->add(
            new Text(
                'caption', [
                    'value' => $this->di->get('translation')->_($options['caption']),
                ]
            )
        );

        // Left sidebar groups
        $menuGroups = $this->di->getElements()->getMenuGroups();

        $groups = new Select(
            'menu-group', $menuGroups, [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'value' => $options['group'],
                'class' => 'ui selection dropdown',
            ]
        );
        $this->add($groups);
    }
}