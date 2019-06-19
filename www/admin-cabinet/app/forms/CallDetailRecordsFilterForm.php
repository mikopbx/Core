<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

use Phalcon\Forms\Form;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\TextArea;


class CallDetailRecordsFilterForm extends Form {

	public function initialize( $entity = NULL, $options = NULL ) {

		$this->add( new Text( 'extension',
			[ 'value' => $options['extension'] ] ) );
		$this->add( new Text( 'date_from',
			[ 'value' => $options['date_from'] ] ) );
		$this->add( new Text( 'date_to', [ 'value' => $options['date_to'] ] ) );

	}
}