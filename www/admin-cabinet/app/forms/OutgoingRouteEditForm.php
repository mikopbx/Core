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


class OutgoingRouteEditForm extends Form {
	public function initialize($entity = NULL, $options = NULL) {

		// ID
		$this->add(new Hidden('id'));

		// Priority
		$this->add(new Hidden('priority'));

		// Rulename
		$this->add(new Text('rulename'));

		// Note
		$rows = max(round(strlen($entity->note) / 95), 2);
		$this->add(new TextArea('note', ["rows" => $rows]));

		// Numberbeginswith
		$this->add(new Text('numberbeginswith'));

		// Prepend
		$this->add(new Text('prepend'));

		// Restnumbers
		$this->add(new Numeric('restnumbers', ["maxlength" => 2, "style" => "width: 80px;", 'min' => 0]));

		// Trimfrombegin
		$this->add(new Text('trimfrombegin', ["maxlength" => 2, "style" => "width: 80px;", 'min' => 0]));

		// Providers
		$providers = new Select('providerid', $options, [
			'using'    => [
				'id',
				'name',
			],
			'useEmpty' => FALSE,
			'class'    => 'ui selection dropdown providerselect',
		]);
		$this->add($providers);

	}
}