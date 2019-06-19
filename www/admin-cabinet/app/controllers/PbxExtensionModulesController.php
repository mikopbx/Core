<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

use Models\PbxExtensionModules;
use Models\PbxExtensionRelationship;
use Phalcon\Text;
use Phalcon\Mvc\Model\Message as Message;
use Models\PbxSettings;

class PbxExtensionModulesController extends BaseController {

	/**
	 * Построение списка модулей
	 */
	public function indexAction() {
		$licKey = PbxSettings::getValueByKey('PBXLicense');
		if (strlen($licKey) !== 28
			|| ! Text::startsWith($licKey, "MIKO-")) {
			return $this->forward('licensing/modify');
		}
		$modules     = PbxExtensionModules::find();
		$modulesList = [];
		foreach ($modules as $module) {

			$unCamelizedControllerName = Text::uncamelize($module->name, '-');
			$modulesList[]             = [
				'uniqid'      => $module->uniqid,
				'description' => $module->description,
				'developer'   => $module->developer,
				'version'     => $module->version,
				'name'        => $unCamelizedControllerName,
				'status'      => ($module->disabled) ? 'disabled' : '',
				'permanent'   => TRUE,
			];
		}
		$this->view->modulelist = $modulesList;

		$licKey                 = PbxSettings::getValueByKey('PBXLicense');
		$this->view->licenseKey = $licKey;
	}

	/**
	 * Включение модуля
	 *
	 * @param string $uniqid Уникальный идентификатор модуля, если мы открываем
	 *                       существующего
	 */
	public function enableAction($uniqid = NULL) {
		$error     = FALSE;
		$mainClass = "Modules\\" . $uniqid . "\Models\\" . $uniqid;
		if ( ! class_exists($mainClass)) {
			$this->flash->error("Class {$mainClass} doesn't exist");
			$this->view->success = FALSE;

			return;
		}
		$elements                 = $mainClass::find();
		$firstElement             = $mainClass::findFirst();
		$needClearExtensionsCache = FALSE;
		foreach ($elements as $element) {
			$relations = $element->_modelsManager->getRelations($mainClass);
			foreach ($relations as $relation) {
				$alias        = $relation->getOption('alias');
				$checkedValue = $element->$alias;
				$foreignKey   = $relation->getOption('foreignKey');
				if (array_key_exists('allowNulls', $foreignKey)
					AND $foreignKey['allowNulls'] === FALSE
					AND $checkedValue === FALSE) {
					$message = new Message(
						$element->t("mo_ModuleSettingsError",
							[
								'modulename' => $element->getRepresent(TRUE),
							])
					);
					$firstElement->appendMessage($message);
					$error = TRUE;
				}
				if ($relation->getReferencedModel() == 'Models\Extensions') {
					$needClearExtensionsCache = TRUE;
				}
			}
		}

		if ($error) {
			$errors = $firstElement->getMessages();
			$this->flash->error(implode('<br>', $errors));
			$this->view->success = FALSE;
		} else {
			$module = PbxExtensionModules::findFirstByUniqid($uniqid);
			if ($module) {
				$module->disabled = "0";
				if ($module->save() === TRUE) {
					$this->view->success = TRUE;
					if ($needClearExtensionsCache) {
						$module->clearCache('Models\Extensions');
					}
				}
			}
		}


	}

	/**
	 * Отключение провайдера
	 *
	 * @param string $uniqid Уникальный идентификатор модуля, если мы открываем
	 *                       существующего
	 */
	public function disableAction($uniqid = NULL) {
		$mainClass = "Modules\\" . $uniqid . "\Models\\" . $uniqid;
		if ( ! class_exists($mainClass)) {
			$this->flash->error("Class {$mainClass} doesn't exist");
			$this->view->success = FALSE;

			return;
		}
		$needClearExtensionsCache = FALSE;
		$result                   = TRUE;
		$elements                 = $mainClass::find();
		// Найдем алиасы, которые подразумевают каскадируемое удаление
		$parameters          = [
			'conditions' => 'moduleUniqid = :moduleUniqid: AND action = "2"',
			'bind'       => [
				'moduleUniqid' => $uniqid,
			],
		];
		$moduleRelationShips = PbxExtensionRelationship::find($parameters);

		// Проверим, нет ли настроенных зависимостей у других модулей
		// Попробуем удалить главную запись модуля
		$this->db->begin();

		foreach ($moduleRelationShips as $relation) {
			foreach ($elements as $element) {
				// Проверим есть ли записи в таблице которая запрещает удаление текущих данных
				$relatedModel             = $relation->model;
				$mappedFields             = $relation->referencedFields;
				$mappedFields             = is_array($mappedFields)
					? $mappedFields : [$mappedFields];
				$referencedFields         = $relation->fields;
				$referencedFields         = is_array($referencedFields)
					? $referencedFields : [$referencedFields];
				$parameters['conditions'] = '';
				$parameters['bind']       = [];
				foreach ($referencedFields as $index => $referencedField) {
					$parameters['conditions'] .= $index > 0
						? ' OR ' : '';
					$parameters['conditions'] .= $referencedField
						. '= :field'
						. $index . ':';
					$bindField
											  = $mappedFields[ $index ];
					$parameters['bind'][ 'field' . $index ]
											  = $element->$bindField;
				}
				$relatedRecords = $relatedModel::find($parameters);
				if ( ! $relatedRecords->delete() and $result) {
					$result = FALSE;
					$errors = $relatedRecords->getMessages();
				}
				if ($relatedModel == 'Models\Extensions') {
					$needClearExtensionsCache = TRUE;
				}
			}
		}

		$this->db->rollback();

		if ($result) {
			$module = PbxExtensionModules::findFirstByUniqid($uniqid);
			if ($module) {
				$module->disabled = "1";
				if ($module->save() === TRUE) {
					$this->view->success = TRUE;
					if ($needClearExtensionsCache) {
						$module->clearCache('Models\Extensions');
					}
				}
			}
		} else {

			$this->flash->error(implode('<br>', $errors));
			$this->view->success = FALSE;
		}

	}
}