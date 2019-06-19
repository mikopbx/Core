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
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Select;


class AsteriskManagerEditForm extends Form {
	public function initialize($entity = NULL, $options = NULL) {
		// Id
		$this->add(new Hidden('id'));

		// Username
		$this->add(new Text('username'));

		// Secret
		$this->add(new Text('secret'));


		foreach ($options['array_of_checkboxes'] as $checkBox) {
			$cheskarr = [];
			$this->add(new Check($checkBox . '_main', $cheskarr));

			if (strpos($entity->$checkBox, 'read') !== FALSE) {
				$cheskarr = ['checked' => 'checked', 'value' => NULL];
			}
			$this->add(new Check($checkBox . '_read', $cheskarr));

			if (strpos($entity->$checkBox, 'write') !== FALSE) {
				$cheskarr = ['checked' => 'checked', 'value' => NULL];
			} else {
				$cheskarr = ['value' => NULL];
			}
			$this->add(new Check($checkBox . '_write', $cheskarr));
		}

		// Networkfilterid
		$networkfilterid = new Select('networkfilterid', $options['network_filters'], [
			'using'    => [
				'id',
				'name',
			],
			'useEmpty' => FALSE,
			'value'    => $entity->networkfilterid,
			'class'    => 'ui selection dropdown network-filter-select',
		]);
		$this->add($networkfilterid);

		// Description
		$this->add(new TextArea('description', ["rows" => 2]));
	}
}