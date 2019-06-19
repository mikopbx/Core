<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

use Phalcon\Forms\Form;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Numeric;



class IncomingRouteEditForm extends Form
{
    public function initialize($entity = null, $options = null)
    {
        // ID
        $this->add(new Hidden('id'));

        // Priority
        $this->add(new Hidden('priority'));

        // Action
        $this->add(new Hidden('action', array("value"=>"extension")));

        // Rulename
        $this->add(new Text('rulename'));

        // Number
        $this->add(new Text('number'));

        // Note
        $this->add(new TextArea('note',array("rows"=>2)));

        // Timeout
        $this->add(new Numeric('timeout',array("maxlength"=>2,"style"=>"width: 80px;","defaultValue"=>120)));

        // Providers
        $providers= new Select('provider', $options['providers'], array(
            'using' => array(
                'id',
                'name'
            ),
            'useEmpty' => false,
            'class' => 'ui selection dropdown provider-select'
        ));
        $this->add($providers);

        // Extension
        $extension= new Select('extension', $options['extensions'], array(
            'using' => array(
                'id',
                'name'
            ),
            'useEmpty' => false,
            'class' => 'ui selection dropdown search forwarding-select'
        ));
        $this->add($extension);


    }
}