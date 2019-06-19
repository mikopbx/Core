<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use Phalcon\Forms\Form;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\Password;

class LoginForm extends Form
{
    public function initialize($entity = null, $options = null)
    {
	    $login = new Text( 'login' );
	    $this->add( $login );

        // Password
        $password = new Password('password');
        $this->add($password);

    }
}