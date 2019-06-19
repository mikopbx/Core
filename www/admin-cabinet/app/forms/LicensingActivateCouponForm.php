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

class LicensingActivateCouponForm extends Form {

	public function initialize( $entity = NULL, $options = NULL ) {
		$this->add( new Text( 'coupon' ) );
	}
}