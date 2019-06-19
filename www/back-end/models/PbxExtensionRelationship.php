<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 9 2018
 *
 */

namespace Models;

use Phalcon\Mvc\Model\Relation;

/**
 * Class для хранения взаимосвязей между модулями расширений и модулями
 * основной поставки
 *
 * @package Models
 */
class PbxExtensionRelationship extends ModelsBase {

	/**
	 * @var integer
	 */
	public $id;

	/**
	 * Модель для которой создается отношение
	 *
	 * @var string
	 */
	public $model;

	/**
	 * Тип отношения hasMany, hasOne, belongsTo ..
	 *
	 * @var string
	 */
	public $relationship;

	/**
	 * Поля связи у расширяемой модели
	 *
	 * @var string
	 */
	public $fields;

	/**
	 * Модель расширения
	 *
	 * @var string
	 */
	public $referenceModel;

	/**
	 * Поля связи у модели расширения
	 *
	 * @var string
	 */
	public $referencedFields;

	/**
	 * Алиас для доступа к модели расширения из расширяемой модели
	 *
	 * @var string
	 */
	public $alias;

	/**
	 * Если 0 to false если 1 то true
	 *
	 * @var integer
	 */
	public $allowNulls;

	/**
	 * Тип действия при действии над расширяемой моделью
	 * применяемое к расширению если есть ссылка
	 * ACTION_CASCADE, ACTION_RESTRICT, NO_ACTION
	 *
	 * @var integer
	 */
	public $action;


	/**
	 * Ссылка на расширяемую модель в таблице PbxExtensionModules
	 *
	 * @var string
	 */
	public $moduleUniqid;

	public function getSource() {
		return 'm_PbxExtensionRelationship';
	}

	public function initialize() {
		parent::initialize();
		$this->belongsTo(
			'moduleUniqid',
			'Models\PbxExtensionModules',
			'uniqid',
			[
				"alias"      => 'PbxExtensionModules',
				"foreignKey" => [
					"allowNulls" => FALSE,
					"action"     => Relation::NO_ACTION
					// В первую очередь удаляются PbxExtensionModules, а он удалит PbxExtensionRelationship
				],
			]
		);
	}
}