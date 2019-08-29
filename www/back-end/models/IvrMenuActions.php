<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

use Phalcon\Mvc\Model\Relation;

class IvrMenuActions extends ModelsBase {

    /**
     * @var integer
     */
	public $id;

    /**
     * @var string
     */
	public $ivr_menu_id;

    /**
     * @var string
     */
	public $digits;

    /**
     * @var string
     */
	public $extension;

	public function getSource()  :string
    {
		return 'm_IvrMenuActions';
	}

	public function initialize() :void
    {
		parent::initialize();
		$this->belongsTo(
			'extension',
			'Models\Extensions',
			'number',
			[
				'alias'      => 'Extensions',
				'foreignKey' => [
					'allowNulls' => FALSE,
					'action'     => Relation::NO_ACTION,
				],
			]
		);
		$this->belongsTo(
			'ivr_menu_id',
			'Models\IvrMenu',
			'uniqid',
			[
				'alias'      => 'IvrMenu',
				'foreignKey' => [
					'allowNulls' => FALSE,
					'action'     => Relation::NO_ACTION,
				],
			]
		);
	}

}