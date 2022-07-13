<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Modules;

use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Modules\Config\ConfigClass;
use Phalcon\Di\Injectable;
use ReflectionClass;
use Throwable;

/**
 * @property \MikoPBX\Service\License license
 *
 */
class PbxExtensionState extends Injectable
{
    private array $messages;
    private $lic_feature_id;
    private string $moduleUniqueID;
    private ?ConfigClass $configClass;
    private $modulesRoot;


    public function __construct(string $moduleUniqueID)
    {
        $this->configClass    = null;
        $this->messages       = [];
        $this->moduleUniqueID = $moduleUniqueID;
        $this->modulesRoot    = $this->getDI()->getShared(ConfigProvider::SERVICE_NAME)->path('core.modulesDir');
        $moduleJson           = "{$this->modulesRoot}/{$this->moduleUniqueID}/module.json";
        if ( ! file_exists($moduleJson)) {
            $this->messages[] = 'module.json not found for module ' . $this->moduleUniqueID;

            return;
        }

        $jsonString            = file_get_contents($moduleJson);
        $jsonModuleDescription = json_decode($jsonString, true);
        if ( ! is_array($jsonModuleDescription)) {
            $this->messages[] = 'module.json parsing error ' . $this->moduleUniqueID;

            return;
        }

        if (array_key_exists('lic_feature_id', $jsonModuleDescription)) {
            $this->lic_feature_id = $jsonModuleDescription['lic_feature_id'];
        } else {
            $this->lic_feature_id = 0;
        }
        $this->reloadConfigClass();
    }

    /**
     * Recreates module's ClassNameConf class
     */
    private function reloadConfigClass(): void
    {
        $class_name      = str_replace('Module', '', $this->moduleUniqueID);
        $configClassName = "\\Modules\\{$this->moduleUniqueID}\\Lib\\{$class_name}Conf";
        if (class_exists($configClassName)) {
            $this->configClass = new $configClassName();
        } else {
            $this->configClass = null;
        }
    }

    /**
     * Enables extension module with checking relations
     *
     */
    public function enableModule(): bool
    {
        if ($this->lic_feature_id > 0) {
            // Try to capture feature if it set
            $result = $this->license->featureAvailable($this->lic_feature_id);
            if ($result['success'] === false) {
                $textError = (string)($result['error']??'');
                $this->messages[] = $this->license->translateLicenseErrorMessage($textError);

                return false;
            }
        }
        $success = $this->makeBeforeEnableTest();
        if ( ! $success) {
            return false;
        }

        // Если ошибок нет, включаем Firewall и модуль
        if ( ! $this->enableFirewallSettings()) {
            $this->messages[] = 'Error on enable firewall settings';

            return false;
        }
        if ($this->configClass !== null
            && method_exists($this->configClass, ConfigClass::ON_BEFORE_MODULE_ENABLE)) {
            call_user_func([$this->configClass, ConfigClass::ON_BEFORE_MODULE_ENABLE]);
        }
        $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
        if ($module !== null) {
            $module->disabled = '0';
            $module->save();
        }
        if ($this->configClass !== null
            && method_exists($this->configClass, 'getMessages')) {
            $this->messages = array_merge($this->messages, $this->configClass->getMessages());
        }

        return true;
    }

    /**
     * On enable module this method restores previous firewall settings or sets default state.
     *
     * @return bool
     */
    protected function enableFirewallSettings(): bool
    {
        if ($this->configClass === null
            || method_exists($this->configClass, ConfigClass::GET_DEFAULT_FIREWALL_RULES) === false
            || call_user_func([$this->configClass, ConfigClass::GET_DEFAULT_FIREWALL_RULES]) === []
        ) {
            return true;
        }

        $this->db->begin(true);
        $defaultRules         = call_user_func([$this->configClass, ConfigClass::GET_DEFAULT_FIREWALL_RULES]);
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
                $newRule->portFromKey     = $detailRule['portFromKey'];
                $newRule->portToKey       = $detailRule['portToKey'];
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
            $this->messages[] = array_merge($this->messages, $errors);
            $this->db->rollback(true);

            return false;
        }

        $this->db->commit(true);

        return true;
    }

    /**
     * Disables extension module with checking relations
     *
     */
    public function disableModule(): bool
    {
        $success = $this->makeBeforeDisableTest();
        if ( ! $success) {
            return false;
        }
        // Если ошибок нет, выключаем Firewall и модуль
        if ( ! $this->disableFirewallSettings()) {
            $this->messages[] = 'Error on disable firewall settings';

            return false;
        }
        if ($this->configClass !== null
            && method_exists($this->configClass, ConfigClass::ON_BEFORE_MODULE_DISABLE)) {
            call_user_func([$this->configClass, ConfigClass::ON_BEFORE_MODULE_DISABLE]);
        }
        $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
        if ($module !== null) {
            $module->disabled = '1';
            $module->save();
        }

        if ($this->configClass !== null
            && method_exists($this->configClass, 'getMessages')) {
            $this->messages = array_merge($this->messages, $this->configClass->getMessages());
        }

        // Kill module workers
        if ($this->configClass !== null
            && method_exists($this->configClass, ConfigClass::GET_MODULE_WORKERS)) {
            $workersToKill = call_user_func([$this->configClass, ConfigClass::GET_MODULE_WORKERS]);
            if (is_array($workersToKill)) {
                foreach ($workersToKill as $moduleWorker) {
                    Processes::killByName($moduleWorker['worker']);
                }
            }
        }

        return true;
    }

    /**
     * Makes before disable test to check dependency
     *
     * @return bool
     */
    private function makeBeforeDisableTest(): bool
    {
        // Проверим, нет ли настроенных зависимостей у других модулей
        // Попробуем удалить все настройки модуля
        $this->db->begin(true);
        $success = true;

        if ($this->configClass !== null
            && method_exists($this->configClass, ConfigClass::ON_BEFORE_MODULE_DISABLE)
            && call_user_func([$this->configClass, ConfigClass::ON_BEFORE_MODULE_DISABLE]) === false) {
            $messages = $this->configClass->getMessages();
            if ( ! empty($messages)) {
                $this->messages = $messages;
            } else {
                $this->messages[] = 'Error on the Module enable function at onBeforeModuleDisable';
            }
            $this->db->rollback(true); // Откатываем временную транзакцию

            return false;
        }

        // Попытаемся удалить текущий модуль, если ошибок не будет, значит можно выклчать
        // Например на модуль может ссылаться запись в таблице Extensions, которую надо удалить при отключении
        // модуля
        $modelsFiles = glob("{$this->modulesRoot}/{$this->moduleUniqueID}/Models/*.php", GLOB_NOSORT);
        foreach ($modelsFiles as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "\\Modules\\{$this->moduleUniqueID}\\Models\\{$className}";
            try {
                if ( ! class_exists($moduleModelClass)) {
                    continue;
                }
                $reflection = new ReflectionClass($moduleModelClass);
                if ($reflection->isAbstract()) {
                    continue;
                }
                if (count($reflection->getProperties()) === 0) {
                    continue;
                }
                $records = $moduleModelClass::find();
                foreach ($records as $record) {
                    $relations = $record->_modelsManager->getRelations(get_class($record));
                    if(empty($relations)){
                        // Если в модели не описаны $relations, то не обрабатываем.
                        // Для больших таблиц потенциальная проблема.
                        break;
                    }
                    if ( ! $record->beforeDelete()) {
                        foreach ($record->getMessages() as $message) {
                            $this->messages[] = $message->getMessage();
                        }
                        $success = false;
                    }
                }
            } catch (Throwable $exception) {
                $this->messages[] = $exception->getMessage();
                $success          = false;
            }
        }
        if ($success) {
            $this->messages = [];
        }

        // Откатываем временную транзакцию
        $this->db->rollback(true);

        return $success;
    }

    /**
     * Saves firewall state before disable module
     *
     * @return bool
     */
    protected function disableFirewallSettings(): bool
    {
        if ($this->configClass === null
            || method_exists($this->configClass, ConfigClass::GET_DEFAULT_FIREWALL_RULES) === false
            || call_user_func([$this->configClass, ConfigClass::GET_DEFAULT_FIREWALL_RULES]) === []
        ) {
            return true;
        }
        $errors       = [];
        $savedState   = [];
        $defaultRules = call_user_func([$this->configClass, ConfigClass::GET_DEFAULT_FIREWALL_RULES]);
        $key          = strtoupper(key($defaultRules));
        $currentRules = FirewallRules::findByCategory($key);
        foreach ($currentRules as $detailRule) {
            $savedState[$detailRule->networkfilterid] = $detailRule->action;
        }
        $this->db->begin(true);
        if ( ! $currentRules->delete()) {
            $this->messages[] = $currentRules->getMessages();

            return false;
        }

        $previousRuleSettings = PbxSettings::findFirstByKey("{$this->moduleUniqueID}FirewallSettings");
        if ($previousRuleSettings === null) {
            $previousRuleSettings      = new PbxSettings();
            $previousRuleSettings->key = "{$this->moduleUniqueID}FirewallSettings";
        }
        $previousRuleSettings->value = json_encode($savedState);
        if ( ! $previousRuleSettings->save()) {
            $errors[] = $previousRuleSettings->getMessages();
        }
        if (count($errors) > 0) {
            $this->messages[] = array_merge($this->messages, $errors);
            $this->db->rollback(true);

            return false;
        }

        $this->db->commit(true);

        return true;
    }

    /**
     * Returns messages after function or methods execution
     *
     * @return array
     */
    public function getMessages(): array
    {
        return $this->messages;
    }

    /**
     * Makes before enable test to check dependency
     *
     * @return bool
     */
    private function makeBeforeEnableTest(): bool
    {
        $success = true;
        // Temporary transaction, we will rollback it after checks
        $this->db->begin(true);

        // Временно включим модуль, чтобы включить все связи и зависимости
        // Temporary disable module and disable all links
        $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
        if ($module !== null) {
            $module->disabled = '0';
            $module->save();
        }

        // Если в конфигурационном классе модуля есть функция корректного включения, вызовем ее,
        // например модуль умной маршртутизации прописывает себя в маршруты
        //
        // If module config has special function before enable, we will execute it

        if ($this->configClass !== null
            && method_exists($this->configClass, ConfigClass::ON_BEFORE_MODULE_ENABLE)
            && call_user_func([$this->configClass, ConfigClass::ON_BEFORE_MODULE_ENABLE]) === false) {
            $messages = $this->configClass->getMessages();
            if ( ! empty($messages)) {
                $this->messages = $messages;
            } else {
                $this->messages[] = 'Error on the enableModule function at onBeforeModuleEnable';
            }
            $this->db->rollback(true); // Откатываем временную транзакцию

            return false;
        }

        // Проверим нет ли битых ссылок, которые мешают включить модуль
        // например удалили сотрудника, а модуль указывает на его extension
        //
        $modelsFiles = glob("{$this->modulesRoot}/{$this->moduleUniqueID}/Models/*.php", GLOB_NOSORT);
        $translator  = $this->di->getShared('translation');
        foreach ($modelsFiles as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "\\Modules\\{$this->moduleUniqueID}\\Models\\{$className}";

            try {
                if ( ! class_exists($moduleModelClass)) {
                    continue;
                }
                $reflection = new ReflectionClass($moduleModelClass);
                if ($reflection->isAbstract()) {
                    continue;
                }
                if (count($reflection->getProperties()) === 0) {
                    continue;
                }
                $records = $moduleModelClass::find();
                foreach ($records as $record) {
                    $relations = $record->_modelsManager->getRelations(get_class($record));
                    if(empty($relations)){
                        // Если в модели не описаны $relations, то не обрабатываем.
                        // Для больших таблиц потенциальная проблема.
                        break;
                    }
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
                            $success          = false;
                        }
                    }
                }
            } catch (Throwable $exception) {
                $this->messages[] = $exception->getMessage();
                $success          = false;
            }
        }
        if ($success) {
            $this->messages = [];
        }

        // Откатываем временную транзакцию
        $this->db->rollback(true);

        return $success;
    }

}