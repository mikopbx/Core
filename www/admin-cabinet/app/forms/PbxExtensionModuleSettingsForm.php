<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2019
 *
 */

use Phalcon\Forms\Form;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Check;


class PbxExtensionModuleSettingsForm extends Form {

    public function initialize($entity = NULL, $options = NULL) {

        // ModuleUniqId
        $this->add(new Hidden('uniqid', ['value' => $options['uniqid']]));

        // Key
        $this->add(new Hidden('key', ['value' => $entity->key]));

        // Href
        $this->add(new Hidden('href', ['value' => $options['href']]));

        // IconClass
        $this->add(new Hidden('iconClass', ['value' => $options['iconClass']]));

        // Show module at left menu
        $cheskarr = ['value' => NULL];
        if ($options['showAtSidebar']) {
            $cheskarr = ['checked' => 'checked', 'value' => NULL];
        }
        $this->add(new Check('show-at-sidebar', $cheskarr));

        // Caption
        $this->add(new Text('caption', [
            'value' => $this->di->get('translation')->_($options['caption']),
        ]));

        // Left sidebar groups
        $menuGroups = $this->di->getElements()->getMenuGroups();

        $groups = new Select('menu-group', $menuGroups, [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => FALSE,
            'value'    => $options['group'],
            'class'    => 'ui selection dropdown',
        ]);
        $this->add($groups);


    }
}