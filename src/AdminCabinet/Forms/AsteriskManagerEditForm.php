<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;


class AsteriskManagerEditForm extends Form
{
    public function initialize($entity = null, $options = null): void
    {
        // Id
        $this->add(new Hidden('id'));

        // Username
        $this->add(new Text('username'));

        // Secret
        $this->add(new Text('secret'));


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
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'value'    => $entity->networkfilterid,
            'class'    => 'ui selection dropdown network-filter-select',
        ]
        );
        $this->add($networkfilterid);

        // Description
        $this->add(new TextArea('description', ["rows" => 2]));
    }
}