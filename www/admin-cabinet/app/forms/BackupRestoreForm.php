<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use Phalcon\Forms\Form;
use Phalcon\Forms\Element\File;


class BackupRestoreForm extends Form {

	public function initialize( $entity = NULL, $options = NULL ) {
		$this->add( new File( 'restore-file' ) );
	}
}