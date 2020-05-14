<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Modules;


use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use Phalcon\Di\Injectable;

class ModuleState extends Injectable
{
    private $messages;
    private $lic_feature_id;
    private $moduleUniqueID;
    private $configClass;
    private $modulesRoot;


    public function __construct(string $moduleUniqueID)
    {
        $this->messages        = [];
        $this->moduleUniqueID  = $moduleUniqueID;
        $this->modulesRoot           = $this->di->getShared('config')->path('core.modulesDir');
        $moduleJson            = "{$this->modulesRoot}/{$this->moduleUniqueID}/module.json";
        $jsonString            = file_get_contents($moduleJson);
        $jsonModuleDescription = json_decode($jsonString, true);
        if ( ! is_array($jsonModuleDescription)) {
            $this->messages[] = 'module.json not found for module ' . $this->moduleUniqueID;

            return;
        }
        if (array_key_exists('lic_feature_id', $jsonModuleDescription)) {
            $this->lic_feature_id = $jsonModuleDescription['lic_feature_id'];
        } else {
            $this->lic_feature_id = 0;
        }

        $configClassName = "\\Modules\\{$this->moduleUniqueID}\\Lib\\{$this->moduleUniqueID}Conf";
        if (class_exists($configClassName)) {
            $this->configClass = new $configClassName();
        } else {
            $this->configClass = null;
        }
    }

    /**
     * Enable extension module with checking relations
     *
     */
    public function enableModule(): bool
    {
        if ($this->lic_feature_id > 0) {
            // Пробуем захватить фичу c учетом оффлан режима
            $result = $this->licenseWorker->featureAvailable($this->lic_feature_id);
            if ($result['success'] === false) {
                $this->messages[] = $this->licenseWorker->translateLicenseErrorMessage($result['error']);

                return false;
            }
        }

        $error = false;
        $this->db->begin('temporary'); // Временная транзакция, которая будет отменена после теста включения

        // Временно включим модуль, чтобы включить все связи и зависимости
        $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
        if ($module !== null) {
            $module->disabled = '0';
            $module->save();
        }

        // Если в конфигурационном классе модуля есть функция корректного включения, вызовем ее,
        // например модуль умной маршртутизации прописывает себя в маршруты

        if ($this->configClass !== null
            && method_exists($this->configClass, 'onBeforeModuleEnable')
            && $this->configClass->onBeforeModuleEnable() === false) {
            $messages = $this->configClass->getMessages();
            if ( ! empty($messages)) {
                $this->messages = $messages;
            } else {
                $this->messages[] = 'Error on the Module enable function at onBeforeModuleEnable';
            }
            $this->db->rollback('temporary'); // Откатываем временную транзакцию

            return false;
        }

        // Проверим нет ли битых ссылок, которые мешают включить модуль
        // например удалили сотрудника, а модуль указывает на его extension
        //


        $modelsFiles = glob("{$this->modulesRoot}/{$this->moduleUniqueID}/Models/*.php", GLOB_NOSORT);
        foreach ($modelsFiles as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "\\Modules\\{$this->moduleUniqueID}\\Models\\{$className}";

            if (
                ! class_exists($moduleModelClass)
                || count(get_class_vars($moduleModelClass)) === 0) {
                continue;
            }

            // Test whether this class abstract or not
            try {
                $reflection = new \ReflectionClass($moduleModelClass);
                if ($reflection->isAbstract()) {
                    continue;
                }
            } catch (\ReflectionException $exception) {
                continue;
            }
            $translator = $this->di->getShared('translation');
            if (class_exists($moduleModelClass)) {
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
                            $this->messages[] = $translator->_(
                                'mo_ModuleSettingsError',
                                [
                                    'modulename' => $record->getRepresent(true),
                                ]
                            );
                            $error            = true;
                        }
                    }
                }
            }
        }
        if ( ! $error) {
            $this->messages = [];
        }
        $this->db->rollback('temporary'); // Откатываем временную транзакцию

        // Если ошибок нет, включаем Firewall и модуль
        if ( ! $error && ! $this->enableFirewallSettings()) {
            $this->messages[] = 'Error on enable firewall settings';

            return false;
        }
        if ( ! $error) {
            $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
            if ($module !== null) {
                $module->disabled = '0';
                if (
                    $module->save() === true
                    && $this->configClass !== null
                    && method_exists($this->configClass, 'onBeforeModuleEnable')) {
                    $this->configClass->onBeforeModuleEnable();
                }
            }
        }

        return true;
    }

    /**
     * При включении модуля устанавливает настройки Firewall по-умолчаниию
     * или по состоянию на момент выключения
     *
     * @param $this ->moduleUniqueID
     *
     * @return bool
     */
    protected function enableFirewallSettings(): bool
    {
        if ($this->configClass === null
            || method_exists($this->configClass, 'getDefaultFirewallRules') === false
            || $this->configClass->getDefaultFirewallRules() === []
        ) {
            return true;
        }

        $this->db->begin();
        $defaultRules         = $this->configClass->getDefaultFirewallRules();
        $previousRuleSettings = PbxSettings::findFirstByKey("{$this->moduleUniqueID}FirewallSettings");
        $previousRules        = [];
        if ($previousRuleSettings !== null) {
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
                    $this->messages[] = $newRule->getMessages();
                }
            }
        }
        if (count($errors) > 0) {
            $this->messages[] = array_merge($this->messages, $errors);
            $this->db->rollback();

            return false;
        }

        $this->db->commit();

        return true;
    }

    /**
     * Disable extension module with checking relations
     *
     */
    public function disableModule(): bool
    {
        $error = false;

        // Проверим, нет ли настроенных зависимостей у других модулей
        // Попробуем удалить все настройки модуля
        $this->db->begin('temporary');

        if ($this->configClass !== null
            && method_exists($this->configClass, 'onBeforeModuleDisable')
            && $this->configClass->onBeforeModuleDisable() === false) {
            $messages = $this->configClass->getMessages();
            if ( ! empty($messages)) {
                $this->messages = $messages;
            } else {
                $this->messages[] = 'Error on the Module enable function at onBeforeModuleDisable';
            }
            $this->db->rollback('temporary'); // Откатываем временную транзакцию

            return false;
        }


        // Попытаемся удалить текущий модуль, если ошибок не будет, значит можно выклчать
        // Например на модуль может ссылаться запись в таблице Extensions, которую надо удалить при отключении
        // модуля
        $modelsFiles = glob("{$this->modulesRoot}/{$this->moduleUniqueID}/Models/*.php", GLOB_NOSORT);
        foreach ($modelsFiles as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "\\Modules\\{$this->moduleUniqueID}\\Models\\{$className}";

            if (
                ! class_exists($moduleModelClass)
                || count(get_class_vars($moduleModelClass)) === 0) {
                continue;
            }

            // Test whether this class abstract or not
            try {
                $reflection = new \ReflectionClass($moduleModelClass);
                if ($reflection->isAbstract()) {
                    continue;
                }
            } catch (\ReflectionException $exception) {
                continue;
            }
            if (class_exists($moduleModelClass)) {
                $records = $moduleModelClass::find();
                foreach ($records as $record) {
                    $mainRelations = $record->_modelsManager->getRelations(get_class($record));
                    foreach ($mainRelations as $subRelation) {
                        $relatedModel = $subRelation->getReferencedModel();
                        $record->_modelsManager->load($relatedModel);
                        $relations = $record->_modelsManager->getRelationsBetween(
                            $relatedModel,
                            get_class($record)
                        );
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
                                $error            = true;
                                $this->messages[] = $relatedRecords->getMessages();
                            }
                        }
                    }
                }
            }
        }
        if ( ! $error) {
            $this->messages = [];
        }
        $this->db->rollback('temporary'); // Откатываем временную транзакцию

        // Если ошибок нет, выключаем Firewall и модуль
        if ( ! $error && ! $this->disableFirewallSettings()) {
            $this->messages[] = 'Error on disable firewall settings';

            return false;
        }

        if ( ! $error) {
            $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
            if ($module !== null) {
                $module->disabled = '1';
                if (
                    $module->save() === true
                    && $this->configClass !== null
                    && method_exists($this->configClass, 'onBeforeModuleEnable')) {
                    $this->configClass->onBeforeModuleDisable();
                }
            }
        }

        return true;
    }

    /**
     * При выключении модуля сбрасывает настройки Firewall
     * и сохраняет параметры для будущего включения
     *
     *
     * @return bool
     */
    protected function disableFirewallSettings(): bool
    {
        if ($this->configClass === null
            || method_exists($this->configClass, 'getDefaultFirewallRules') === false
            || $this->configClass->getDefaultFirewallRules() === []
        ) {
            return true;
        }
        $errors       = [];
        $savedState   = [];
        $defaultRules = $this->configClass->getDefaultFirewallRules();
        $key          = strtoupper(key($defaultRules));
        $currentRules = FirewallRules::findByCategory($key);
        foreach ($currentRules as $detailRule) {
            $savedState[$detailRule->networkfilterid] = $detailRule->action;
        }
        $this->db->begin();
        if ( ! $currentRules->delete()) {
            $this->messages[] = $currentRules->getMessages();
        }

        $previousRuleSettings = PbxSettings::findFirstByKey("{$this->moduleUniqueID}FirewallSettings");
        if ($previousRuleSettings === null) {
            $previousRuleSettings      = new PbxSettings();
            $previousRuleSettings->key = "{$this->moduleUniqueID}FirewallSettings";
        }
        $previousRuleSettings->value = json_encode($savedState);
        if ( ! $previousRuleSettings->save()) {
            $this->messages[] = $previousRuleSettings->getMessages();
        }
        if (count($errors) > 0) {
            $this->messages[] = array_merge($this->messages, $errors);
            $this->db->rollback();

            return false;
        }

        $this->db->commit();

        return true;
    }

    /**
     * Return messages after function or methods execution
     * @return array
     */
    public function getMessages(): array
    {
        return  $this->messages;
    }
}