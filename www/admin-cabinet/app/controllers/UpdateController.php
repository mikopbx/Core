<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

use Models\PbxSettings;
use Phalcon\Text;

class UpdateController extends BaseController {


	/**
	 * Обновление станции до нового релиза
	 *
	 */
	public function indexAction() {
		$licKey = PbxSettings::getValueByKey( 'PBXLicense' );
		if ( strlen( $licKey ) !== 28
		     || ! Text::startsWith( $licKey, "MIKO-" ) ) {
			return $this->forward( 'licensing/modify/update' );
		}

		$licKey                 = PbxSettings::getValueByKey( 'PBXLicense' );
		$this->view->licenseKey = $licKey;
		$this->view->submitMode = NULL;
	}
}