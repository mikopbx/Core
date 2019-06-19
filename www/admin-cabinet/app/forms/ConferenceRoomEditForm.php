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



class ConferenceRoomEditForm extends Form
{
    public function initialize($entity = null, $options = null)
    {
        // ID
        $this->add(new Hidden('id'));

        // Uniqid
        $this->add(new Hidden('uniqid'));

        // Name
        $this->add(new Text('name'));

        // Extension
        $this->add(new Text('extension'));

    }
}