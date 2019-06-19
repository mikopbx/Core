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
use Phalcon\Forms\Element\Check;


class BackupCreateForm extends Form {

	public function initialize( $entity = NULL, $options = NULL ) {
		foreach ( $options as $name => $value ) {
			$cheskarr = [ 'value' => NULL ];
			if ( $value ) {
				$cheskarr = [ 'checked' => 'checked', 'value' => NULL ];
			}
			$this->add( new Check( $name, $cheskarr ) );
		}

	}
}