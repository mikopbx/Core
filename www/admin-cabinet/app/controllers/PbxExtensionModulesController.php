<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

use Models\PbxExtensionModules;
use Models\NetworkFilters;
use Models\FirewallRules;
use Phalcon\Text;
use Phalcon\Mvc\Model\Message as Message;
use Models\PbxSettings;

class PbxExtensionModulesController extends BaseController
{

    /**
     * Построение списка модулей
     */
    public function indexAction()
    {
        $licKey = PbxSettings::getValueByKey('PBXLicense');
        if (strlen($licKey) !== 28
            || ! Text::startsWith($licKey, 'MIKO-')) {
            return $this->forward('licensing/modify/pbx-extension-modules');
        }
        // Очистим кеш хранилища для получения актульной информации о свободном месте
        $this->session->remove('checkStorage');

        $modules     = PbxExtensionModules::find();
        $modulesList = [];
        foreach ($modules as $module) {

            $unCamelizedControllerName = Text::uncamelize($module->uniqid, '-');
            $modulesList[]             = [
                'uniqid'      => $module->uniqid,
                'name'        => $module->name,
                'description' => $module->description,
                'developer'   => $module->developer,
                'version'     => $module->version,
                'classname'   => $unCamelizedControllerName,
                'status'      => ($module->disabled==='1') ? 'disabled' : '',
                'permanent'   => true,
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
    public function enableAction($uniqid): void
    {
        $error                    = false;
        $errors                   = [];
        $needClearExtensionsCache = false;
        $mainClass                = "Modules\\{$uniqid}\Models\\{$uniqid}";
        if ( ! class_exists($mainClass)) {
            $this->flash->error("Class {$mainClass} doesn't exist");
            $this->view->success = false;

            return;
        }

        $setupClass = "\\Modules\\{$uniqid}\\setup\\PbxExtensionSetup";
        if (class_exists($setupClass)) {
            $setup    = new $setupClass();
            if ($setup->lic_feature_id > 0){
                // Пробуем захватить фичу
                $result = $this->licenseWorker->captureFeature($setup->lic_feature_id);
                if ($result['success']===false){
                    $this->flash->error($this->licenseWorker->translateLicenseErrorMessage($result['error']));
                    $this->view->success = false;
                    return;
                }
            }
        }
        $this->db->begin();
        // $controllerClass = "{$uniqid}Controller";
        // if (class_exists($controllerClass)
        // 	&& method_exists($controllerClass,'disableAction')){
        // 	$controller = new $controllerClass();
        // 	$controller->enableAction();
        // }

        // Проверим нет ли битых ссылок перед включением модуля
        // например удалили сотрудника, а модуль на него ссылался
        //
        $record = $mainClass::findFirst();
        if ($record) {
            $relations = $record->_modelsManager->getRelations($mainClass);
            foreach ($relations as $relation) {
                $alias        = $relation->getOption('alias');
                $checkedValue = $record->$alias;
                $foreignKey   = $relation->getOption('foreignKey');
                if ($checkedValue === false
                    && array_key_exists('allowNulls', $foreignKey)
                    && $foreignKey['allowNulls'] === false
                ) {
                    $message = new Message(
                        $record->t('mo_ModuleSettingsError',
                            [
                                'modulename' => $record->getRepresent(true),
                            ])
                    );
                    $record->appendMessage($message);
                    $error    = true;
                    $errors[] = $record->getMessages();
                }
                if ($relation->getReferencedModel() === 'Models\Extensions') {
                    $needClearExtensionsCache = true;
                }
            }
        }
        $this->db->rollback();
        if ( ! $error && ! $this->enableFirewallSettings($uniqid)) {
            $error    = true;
            $errors[] = ['Error on enable firewall settings'];
        }
        if ($error) {
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;
        } else {
            $module = PbxExtensionModules::findFirstByUniqid($uniqid);
            if ($module) {
                $module->disabled = '0';
                if ($module->save() === true) {
                    $this->view->success = true;
                    if ($needClearExtensionsCache) {
                        $module->clearCache('Models\Extensions');
                    }
                    $controllerClass = "{$uniqid}Controller";
                    if (class_exists($controllerClass)
                        && method_exists($controllerClass, 'disableAction')) {
                        $controller = new $controllerClass();
                        $controller->enableAction();
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
    public function disableAction($uniqid = null): void
    {
        $mainClass = "Modules\\" . $uniqid . "\Models\\" . $uniqid;
        if ( ! class_exists($mainClass)) {
            $this->flash->error("Class {$mainClass} doesn't exist");
            $this->view->success = false;

            return;
        }
        $needClearExtensionsCache = false;
        $result                   = true;

        // Проверим, нет ли настроенных зависимостей у других модулей
        // Попробуем удалить главную запись модуля
        $this->db->begin();

        $controllerClass = "{$uniqid}Controller";
        if (class_exists($controllerClass)
            && method_exists($controllerClass, 'disableAction')) {
            $controller = new $controllerClass();
            $controller->disableAction();
        }

        // Попытаемся удалить текущий модуль, если ошибок не будет, значит можно выклчать
        $element = $mainClass::findFirst();
        if ($element) {
            $mainRelations = $element->_modelsManager->getRelations($mainClass);

            foreach ($mainRelations as $subRelation) {
                $relatedModel = $subRelation->getReferencedModel();
                $element->_modelsManager->load($relatedModel);
                $relations = $element->_modelsManager->getRelationsBetween($relatedModel, $mainClass);

                foreach ($relations as $relation) {
                    // Проверим есть ли записи в таблице которая запрещает удаление текущих данных
                    $mappedFields             = $relation->getFields();
                    $mappedFields             = is_array($mappedFields)
                        ? $mappedFields : [$mappedFields];
                    $referencedFields         = $relation->getReferencedFields();
                    $referencedFields         = is_array($referencedFields)
                        ? $referencedFields : [$referencedFields];
                    $parameters['conditions'] = '';
                    $parameters['bind']       = [];
                    foreach ($mappedFields as $index => $mappedField) {
                        $parameters['conditions']             .= $index > 0 ? ' OR ' : '';
                        $parameters['conditions']             .= $mappedField . '= :field' . $index . ':';
                        $bindField                            = $referencedFields[$index];
                        $parameters['bind']['field' . $index] = $element->$bindField;
                    }
                    $relatedRecords = $relatedModel::find($parameters);
                    if ( ! $relatedRecords->delete() && $result) {
                        $result = false;
                        $errors = $relatedRecords->getMessages();
                    } elseif ($relatedModel === 'Models\Extensions') {
                        $needClearExtensionsCache = true;
                    }
                }

            }
        }

        $this->db->rollback();

        if ($result && ! $this->disableFirewallSettings($uniqid)) {
            $result = false;
        }
        if ($result) {
            $module = PbxExtensionModules::findFirstByUniqid($uniqid);
            if ($module) {
                $module->disabled = '1';
                if ($module->save() === true) {
                    $this->view->success = true;
                    if ($needClearExtensionsCache) {
                        $module->clearCache('Models\Extensions');
                    }
                    $controllerClass = "{$uniqid}Controller";
                    if (class_exists($controllerClass)
                        && method_exists($controllerClass, 'disableAction')) {
                        $controller = new $controllerClass();
                        $controller->disableAction();
                    }
                }
            }
        } else {

            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;
        }

    }

    /**
     * При включении модуля устанавливает настройки Firewall по-умолчаниию
     * или по состоянию на момент выключения
     *
     * @param $uniqid
     *
     * @return bool
     */
    protected function enableFirewallSettings($uniqid): bool
    {
        $class = "\\Modules\\{$uniqid}\\setup\\FirewallRules";
        if ( ! class_exists($class)) {
            return true;
        }
        $this->db->begin();
        $defaultRules         = $class::getDefaultRules();
        $previousRuleSettings = PbxSettings::findFirstByKey("{$uniqid}FirewallSettings");
        $previousRules        = [];
        if ($previousRuleSettings) {
            $previousRules = json_decode($previousRuleSettings->value, true);
            $previousRuleSettings->delete();
        }
        $errors   = [];
        $networks = NetworkFilters::find();
        $key          = strtoupper(key($defaultRules));
        $record = $defaultRules[key($defaultRules)];

        $oldRules = FirewallRules::findByCategory($key);
        if ($oldRules->count() > 0) {
            $oldRules->delete();
        }

        foreach ($networks as $network) {
            foreach ($record['rules'] as $detailRule) {
                    $newRule                  = new FirewallRules();
                    $newRule->networkfilterid = $network->id;
                    $newRule->protocol        = $detailRule['protocol'];
                    $newRule->portfrom        = $detailRule['portfrom'];
                    $newRule->portto          = $detailRule['portto'];
                    $newRule->category        = $key;
                    $newRule->action          = $record['action'];
                    $newRule->description     = $detailRule['name'];
                    if (array_key_exists($network->id, $previousRules)) {
                        $newRule->action = $previousRules[$network->id];
                    }
                    if ( ! $newRule->save()) {
                        $errors[] = $newRule->getMessages();
                    }
                }
            }
        if (count($errors) > 0) {
            $this->flash->warning(implode('<br>', $errors));
            $this->db->rollback();

            return false;
        } else {
            $this->db->commit();
        }

        return true;
    }

    /**
     * При выключении модуля сбрасывает настройки Firewall
     * и сохраняет параметры для будущего включения
     *
     * @param $uniqid
     *
     * @return bool
     */
    protected function disableFirewallSettings($uniqid): bool
    {
        $class = "\\Modules\\{$uniqid}\\setup\\FirewallRules";
        if ( ! class_exists($class)) {
            return true;
        }
        $errors       = [];
        $savedState   = [];
        $defaultRules = $class::getDefaultRules();
        $key          = strtoupper(key($defaultRules));
        $currentRules = FirewallRules::findByCategory($key);
        foreach ($currentRules as $detailRule) {
                $savedState[$detailRule->networkfilterid] = $detailRule->action;
        }
        $this->db->begin();
        if (!$currentRules->delete()) {
            $errors[] = $currentRules->getMessages();
        }

        $previousRuleSettings = PbxSettings::findFirstByKey("{$uniqid}FirewallSettings");
        if ($previousRuleSettings === false) {
            $previousRuleSettings      = new PbxSettings();
            $previousRuleSettings->key = "{$uniqid}FirewallSettings";
        }
        $previousRuleSettings->value = json_encode($savedState);
        if ( ! $previousRuleSettings->save()) {
            $errors[] = $previousRuleSettings->getMessages();
        }
        if (count($errors) > 0) {
            $this->flash->warning(implode('<br>', $errors));
            $this->db->rollback();

            return false;
        } else {
            $this->db->commit();
        }

        return true;
    }
}