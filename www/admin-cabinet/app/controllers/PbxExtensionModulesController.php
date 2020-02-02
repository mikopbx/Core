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
                'status'      => ($module->disabled === '1') ? 'disabled' : '',
                'permanent'   => true,
            ];
        }
        $this->view->modulelist = $modulesList;

        $licKey                 = PbxSettings::getValueByKey('PBXLicense');
        $this->view->licenseKey = $licKey;
    }

    /**
     * Страница с настройкой параметров модуля
     * param $uniqid - string идентификатор модуля
     */
    public function modifyAction($uniqid): void
    {
        $menuSettings               = "AdditionalMenuItem{$uniqid}";
        $unCamelizedControllerName  = Text::uncamelize($uniqid, '-');
        $previousMenuSettings       = PbxSettings::findFirstByKey($menuSettings);
        $this->view->showAtMainMenu = $previousMenuSettings !== false;
        if ( ! $previousMenuSettings) {
            $previousMenuSettings        = new PbxSettings();
            $previousMenuSettings->key   = $menuSettings;
            $value                       = [
                'uniqid'        => $uniqid,
                'href'          => $this->url->get($unCamelizedControllerName),
                'group'         => '',
                'iconClass'     => 'puzzle piece',
                'caption'       => "Breadcrumb$uniqid",
                'showAtSidebar' => false,
            ];
            $previousMenuSettings->value = json_encode($value);
        }
        $options                = json_decode($previousMenuSettings->value, true);
        $this->view->form       = new PbxExtensionModuleSettingsForm($previousMenuSettings, $options);
        $this->view->title      = $this->translation->_('ext_SettingsForModule') . ' ' . $this->translation->_("Breadcrumb$uniqid");
        $this->view->submitMode = null;
        $this->view->indexUrl   = $unCamelizedControllerName;
    }

    /**
     * Сохранение настроек отображения модуля в боковом меню
     * сохраняет настройку отображения в PbxSettings
     */
    public function saveModuleSettingsAction(): void
    {

        if ( ! $this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();

        $record = PbxSettings::findFirstByKey($data['key']);
        if ( ! $record) {
            $record      = new PbxSettings();
            $record->key = $data['key'];
        }
        $value         = [
            'uniqid'        => $data['uniqid'],
            'href'          => $data['href'],
            'group'         => $data['menu-group'],
            'iconClass'     => $data['iconClass'],
            'caption'       => $data['caption'],
            'showAtSidebar' => $data['show-at-sidebar'] === 'on',
        ];
        $record->value = json_encode($value);
        if ($record->save() === false) {
            $errors = $record->getMessages();
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;

            return;
        }
        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
    }

    /**
     * Включение модуля
     *
     * @param string $uniqid Уникальный идентификатор модуля, если мы открываем
     *                       существующего
     */
    public function enableAction($uniqid): void
    {
        $this->view->success = false;
        $setupClass          = "\\Modules\\{$uniqid}\\setup\\PbxExtensionSetup";
        if (class_exists($setupClass)) {
            $setup = new $setupClass($uniqid);
            if ($setup->lic_feature_id > 0) {
                // Пробуем захватить фичу c учетом оффлан режима
                $result = $this->licenseWorker->featureAvailable($setup->lic_feature_id);
                if ($result['success'] === false) {
                    $this->flash->error($this->licenseWorker->translateLicenseErrorMessage($result['error']));

                    return;
                }
            }
        } else {
            $this->flash->error("Class {$setupClass} doesn't exist");

            return;
        }
        $error = false;
        $this->db->begin('temporary'); // Временная транзакция, которая будет отменена после теста включения

        // Временно включим модуль, чтобы включить все связи и зависимости
        $module = PbxExtensionModules::findFirstByUniqid($uniqid);
        if ($module) {
            $module->disabled = '0';
            $module->save();
        }

        // Если в контроллере есть функция корректного включения, вызовем ее,
        // например модуль умной маршртутизации прописывает себя в маршруты
        $controllerClass = "{$uniqid}Controller";
        if (class_exists($controllerClass)
            && method_exists($controllerClass, 'enableAction')) {
            $controller = new $controllerClass();
            if ($controller->enableAction() === false) {
                $messages = $this->flash->getMessages();
                if ($messages){
                    foreach ($messages as $index=>$message){
                        $this->flash->$index($message[0]);
                    }
                } else {
                    $this->flash->error('Error on the Module controller enable function');
                }
                $this->db->rollback('temporary'); // Откатываем временную транзакцию

                return;
            }
        }

        // Проверим нет ли битых ссылок, которые мешают включить модуль
        // например удалили сотрудника, а модуль указывает на его extension
        //
        $moduleModelsDir = $this->config->application->modulesDir . $uniqid . '/Models';
        $results         = glob($moduleModelsDir . '/*.php', GLOB_NOSORT);
        foreach ($results as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "\\Modules\\{$uniqid}\\Models\\{$className}";
            if (class_exists($moduleModelClass)) {
                if ((new $moduleModelClass())->getReadConnectionService() !== 'db') {
                    continue; // Это не основная база данных
                }
                $records = $moduleModelClass::find();
                foreach ($records as $record) {
                    $relations = $record->_modelsManager->getRelations(get_class($record));
                    foreach ($relations as $relation) {
                        $alias        = $relation->getOption('alias');
                        $checkedValue = $record->$alias;
                        $foreignKey   = $relation->getOption('foreignKey');
                        // В модуле указан заперт на NULL в описании модели,
                        // а параметр этот не заполнен в настройках модуля
                        // например в модуле маршрутизации, резервный номер
                        if ($checkedValue === false
                            && array_key_exists('allowNulls', $foreignKey)
                            && $foreignKey['allowNulls'] === false
                        ) {
                            $this->flash->error($record->t('mo_ModuleSettingsError',
                                [
                                    'modulename' => $record->getRepresent(true),
                                ]));
                            $error = true;

                        }
                    }
                }
            }
        }
        if (!$error){
            $this->flash->clear();
        }
        $this->db->rollback('temporary'); // Откатываем временную транзакцию

        // Если ошибок нет, включаем Firewall и модуль
        if ( ! $error && ! $this->enableFirewallSettings($uniqid)) {
            $this->flash->error('Error on enable firewall settings');

            return;
        }
        if ( ! $error) {
            $module = PbxExtensionModules::findFirstByUniqid($uniqid);
            if ($module) {
                $module->disabled = '0';
                if ($module->save() === true) {
                    $this->view->success = true;
                    $controllerClass     = "{$uniqid}Controller";
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
        $this->view->success = false;

        $controllerClass = "{$uniqid}Controller";
        if ( ! class_exists($controllerClass)) {
            $this->flash->error("Class {$controllerClass} doesn't exist");

            return;
        }

        $error = false;

        // Проверим, нет ли настроенных зависимостей у других модулей
        // Попробуем удалить все настройки модуля
        $this->db->begin('temporary');

        if (method_exists($controllerClass, 'disableAction')) {
            $controller = new $controllerClass();
            if ($controller->disableAction() === false) {
                $messages = $this->flash->getMessages();
                if ($messages){
                    foreach ($messages as $index=>$message){
                        $this->flash->$index($message[0]);
                    }
                } else {
                    $this->flash->error('Error on the Module controller disable function');
                }
                $this->db->rollback('temporary');

                return;
            }
        }


        // Попытаемся удалить текущий модуль, если ошибок не будет, значит можно выклчать
        // Например на модуль может ссылаться запись в таблице Extensions, которую надо удалить при отключении
        // модуля
        $moduleModelsDir = $this->config->application->modulesDir . $uniqid . '/Models';
        $results         = glob($moduleModelsDir . '/*.php', GLOB_NOSORT);
        foreach ($results as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "\\Modules\\{$uniqid}\\Models\\{$className}";
            if (class_exists($moduleModelClass)) {
                if ((new $moduleModelClass())->getReadConnectionService() !== 'db') {
                    continue; // Это не основная база данных
                }
                $records = $moduleModelClass::find();
                foreach ($records as $record) {
                    $mainRelations = $record->_modelsManager->getRelations(get_class($record));
                    foreach ($mainRelations as $subRelation) {
                        $relatedModel = $subRelation->getReferencedModel();
                        $record->_modelsManager->load($relatedModel);
                        $relations = $record->_modelsManager->getRelationsBetween($relatedModel,
                            get_class($record));
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
                                $parameters['bind']['field' . $index] = $record->$bindField;
                            }
                            $relatedRecords = $relatedModel::find($parameters);
                            if ( ! $error && ! $relatedRecords->delete()) {
                                $error = true;
                                $this->flash->error($relatedRecords->getMessages());
                            }
                        }
                    }
                }
            }
        }
        if (!$error){
            $this->flash->clear();
        }
        $this->db->rollback('temporary'); // Откатываем временную транзакцию

        // Если ошибок нет, выключаем Firewall и модуль
        if ( ! $error && ! $this->disableFirewallSettings($uniqid)) {
            $this->flash->error('Error on disable firewall settings');

            return;
        }

        if ( ! $error) {
            $module = PbxExtensionModules::findFirstByUniqid($uniqid);
            if ($module) {
                $module->disabled = '1';
                if ($module->save() === true) {
                    $this->view->success = true;
                    $controllerClass     = "{$uniqid}Controller";
                    if (class_exists($controllerClass)
                        && method_exists($controllerClass, 'disableAction')) {
                        $controller = new $controllerClass();
                        $controller->disableAction();
                    }
                }
            }
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
        $key      = strtoupper(key($defaultRules));
        $record   = $defaultRules[key($defaultRules)];

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
            $this->flash->error(implode('<br>', $errors));
            $this->db->rollback();

            return false;
        }

        $this->db->commit();

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
        if ( ! $currentRules->delete()) {
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
            $this->flash->error(implode('<br>', $errors));
            $this->db->rollback();

            return false;
        }

        $this->db->commit();

        return true;
    }

    /**
     * Генерирует дополнительные пункты меню в интерфейс
     */
    public function sidebarIncludeAction(): void
    {
        $result  = [];
        $modules = PbxExtensionModules::find('disabled="0"');
        foreach ($modules as $module) {
            $menuSettings         = "AdditionalMenuItem{$module->uniqid}";
            $previousMenuSettings = PbxSettings::findFirstByKey($menuSettings);
            if ($previousMenuSettings) {
                $result['items'][] = json_decode($previousMenuSettings->value, true);
            }
        }
        $this->view->message = $result;
        $this->view->success = true;
    }

    private function testDeleteRelationRecords()
    {

    }
}