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
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Element\Check;


class IvrMenuEditForm extends Form
{
    public function initialize($entity = null, $options = null)
    {
        // ID
        $this->add(new Hidden('id'));

        // Name
        $this->add(new Text('name'));

        // Uniqid
        $this->add(new Hidden('uniqid'));

        // Extension
        $this->add(new Text('extension'));

	    // Number of repeat
	    $this->add( new Numeric( 'number_of_repeat', [
		    "maxlength"    => 2,
		    "style"        => "width: 80px;",
		    "defaultValue" => 3,
	    ] ) );

		// Timeout
		$this->add( new Numeric( 'timeout', [
			"maxlength"    => 2,
			"style"        => "width: 80px;",
			"defaultValue" => 7,
		] ) );

	    // Timeoutextension
        $extension= new Select('timeout_extension', $options['extensions'], array(
            'using' => array(
                'id',
                'name'
            ),
            'useEmpty' => false,
            'class' => 'ui selection dropdown search forwarding-select'
        ));
        $this->add($extension);

        // Audio_message_id
        $audioMessage= new Select('audio_message_id', $options['soundfiles'], array(
            'using' => array(
                'id',
                'name'
            ),
            'useEmpty' => false,
            'class' => 'ui selection dropdown search audio-message-select',
        ));
        $this->add($audioMessage);

        //Allow_enter_any_internal_extension
        $cheskarr=array('value'=>null);
        if ($entity->allow_enter_any_internal_extension) {
            $cheskarr = array('checked' => 'checked','value'=>null);
        }

        $this->add(new Check('allow_enter_any_internal_extension',$cheskarr));

        // Description
	    $rows = max( round( strlen( $entity->description ) / 95 ), 2 );
	    $this->add( new TextArea( 'description', [ "rows" => $rows ] ) );
    }
}