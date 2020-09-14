<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;

/**
 * Class IncomingRouteEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class IncomingRouteEditForm extends Form
{
    public function initialize(/** @scrutinizer ignore-unused */ $entity = null, $options = null): void
    {
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
        $this->add(new TextArea('note', ['rows' => 2]));

        // Timeout
        $this->add(new Numeric('timeout', ['maxlength' => 3, 'style' => 'width: 80px;', 'defaultValue' => 120]));

        // Providers
        $providers = new Select(
            'provider', $options['providers'], [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'class'    => 'ui selection dropdown provider-select',
        ]
        );
        $this->add($providers);

        // Extension
        $extension = new Select(
            'extension', $options['extensions'], [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'class'    => 'ui selection dropdown search forwarding-select',
        ]
        );
        $this->add($extension);
    }
}