<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\Modules\Config\SystemConfigInterface;
use Phalcon\Di\Injectable;
use ReflectionClass;
use Throwable;

/**
 *  Utility class for managing extension state.
 *
 * @property \MikoPBX\Service\License license
 * @property \Phalcon\Config\Adapter\Json config
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 *
 * @package MikoPBX\Modules
 */
class PbxExtensionState extends Injectable
{

    const DISABLED_BY_EXCEPTION = 'DisabledByException';
    const DISABLED_BY_USER = 'DisabledByUser';
    const DISABLED_BY_LICENSE = 'DisabledByLicense';

    private array $messages;
    private $lic_feature_id;
    private string $moduleUniqueID;
    private ?ConfigClass $configClass;
    private $modulesRoot;


    /**
     * PbxExtensionState constructor.
     *
     * @param string $moduleUniqueID The unique ID of the module
     */
    public function __construct(string $moduleUniqueID)
    {
        $this->configClass    = null;
        $this->messages       = [];
        $this->moduleUniqueID = $moduleUniqueID;
        $this->modulesRoot    = $this->getDI()->getShared(ConfigProvider::SERVICE_NAME)->path('core.modulesDir');

        // Check if module.json file exists
        $moduleJson           = "{$this->modulesRoot}/{$this->moduleUniqueID}/module.json";
        if ( ! file_exists($moduleJson)) {
            $this->messages[] = 'module.json not found for module ' . $this->moduleUniqueID;
            return;
        }

        // Read and parse module.json
        $jsonString            = file_get_contents($moduleJson);
        $jsonModuleDescription = json_decode($jsonString, true);
        if ( ! is_array($jsonModuleDescription)) {
            $this->messages[] = 'module.json parsing error ' . $this->moduleUniqueID;

            return;
        }

        // Extract the lic_feature_id if present, otherwise set it to 0
        if (array_key_exists('lic_feature_id', $jsonModuleDescription)) {
            $this->lic_feature_id = $jsonModuleDescription['lic_feature_id'];
        } else {
            $this->lic_feature_id = 0;
        }

        // Reload the config class
        $this->reloadConfigClass();
    }

    /**
     * Reloads the configuration class for the module.
     * The configuration class is determined based on the module's unique ID.
     * If the configuration class exists, it is instantiated and assigned to the `configClass` property.
     * If the configuration class does not exist, the `configClass` property is set to `null`.
     */
    private function reloadConfigClass(): void
    {
        $class_name      = str_replace('Module', '', $this->moduleUniqueID);
        $configClassName = "Modules\\{$this->moduleUniqueID}\\Lib\\{$class_name}Conf";
        if (class_exists($configClassName)) {
            $this->configClass = new $configClassName();
        } else {
            $this->configClass = null;
        }
    }

    /**
     * Enables the extension module by checking relations.
     *
     * @return bool True if the module was successfully enabled, false otherwise.
     */
    public function enableModule(): bool
    {
        if ($this->lic_feature_id > 0) {
            // Try to capture the feature if it is set
            $result = $this->license->featureAvailable($this->lic_feature_id);
            if ($result['success'] === false) {
                $textError = (string)($result['error']??'');
                $reasonText = $this->license->translateLicenseErrorMessage($textError);
                $this->messages['license'][] = $reasonText;

                // Find and update the module's disabled flag in the database
                $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
                if ($module !== null) {
                    $module->disabled = '1';
                    $module->disableReason = self::DISABLED_BY_LICENSE;
                    $module->disableReasonText = $reasonText;
                    $module->save();
                }
                return false;
            }
        }
        $success = $this->makeBeforeEnableTest();
        if ( ! $success) {
            return false;
        }

        // If there are no errors, enable the firewall and the module
        if ( ! $this->enableFirewallSettings()) {
            $this->messages[] = $this->translation->_("ext_ErrorOnEnableFirewallSettings");

            return false;
        }
        if ($this->configClass !== null
            && method_exists($this->configClass, SystemConfigInterface::ON_BEFORE_MODULE_ENABLE)) {
            call_user_func([$this->configClass, SystemConfigInterface::ON_BEFORE_MODULE_ENABLE]);
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

        // Cleanup volt cache, because them module can interact with volt templates
        $this->cleanupVoltCache();

        return true;
    }

    /**
     * Enables the firewall settings for the module by restoring previous settings or setting the default state.
     *
     * @return bool True if the firewall settings were successfully enabled, false otherwise.
     */
    protected function enableFirewallSettings(): bool
    {
        if ($this->configClass === null
            || method_exists($this->configClass, SystemConfigInterface::GET_DEFAULT_FIREWALL_RULES) === false
            || call_user_func([$this->configClass, SystemConfigInterface::GET_DEFAULT_FIREWALL_RULES]) === []
        ) {
            return true;
        }

        $this->db->begin(true);
        $defaultRules         = call_user_func([$this->configClass, SystemConfigInterface::GET_DEFAULT_FIREWALL_RULES]);

        // Retrieve previous rule settings
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
                $newRule->portFromKey     = $detailRule['portFromKey']??$detailRule['name'];
                $newRule->portToKey       = $detailRule['portToKey']??$detailRule['name'];
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
     * Disables the extension module and performs the necessary checks.
     *
     * @param string $reason The reason why the module was disabled as a flag
     * @param string $reasonText The reason why the module was disabled in text mode, some logs
     *
     * @return bool True if the module was successfully disabled, false otherwise.
     */
    public function disableModule(string $reason='', string $reasonText=''): bool
    {
        // Perform the necessary checks before disabling the module
        $success = $this->makeBeforeDisableTest();
        if ( ! $success) {
            return false;
        }

        // Disable firewall settings and the module
        if ( ! $this->disableFirewallSettings()) {
            $this->messages[] = $this->translation->_("ext_ErrorOnDisableFirewallSettings");
            return false;
        }

        // Call the onBeforeModuleDisable method if available in the configClass
        if ($this->configClass !== null
            && method_exists($this->configClass, SystemConfigInterface::ON_BEFORE_MODULE_DISABLE)) {
            call_user_func([$this->configClass, SystemConfigInterface::ON_BEFORE_MODULE_DISABLE]);
        }

        // Find and update the module's disabled flag in the database
        $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
        if ($module !== null) {
            $module->disabled = '1';
            $module->disableReason = $reason;
            $module->disableReasonText = $reasonText;
            $module->save();
        }

        // Merge any additional messages from the configClass
        if ($this->configClass !== null
            && method_exists($this->configClass, 'getMessages')) {
            $this->messages = array_merge($this->messages, $this->configClass->getMessages());
        }

        // Kill module workers if specified in the configClass
        if ($this->configClass !== null
            && method_exists($this->configClass, SystemConfigInterface::GET_MODULE_WORKERS)) {
            $workersToKill = call_user_func([$this->configClass, SystemConfigInterface::GET_MODULE_WORKERS]);
            if (is_array($workersToKill)) {
                foreach ($workersToKill as $moduleWorker) {
                    Processes::killByName($moduleWorker['worker']);
                }
            }
        }

        // Cleanup volt cache, because them module can interact with volt templates
        $this->cleanupVoltCache();

        return true;
    }

    /**
     * Performs the necessary checks before disabling the module.
     *
     * @return bool True if the checks pass and the module can be disabled, false otherwise.
     */
    private function makeBeforeDisableTest(): bool
    {
        // Check if there are any configured dependencies in other modules
        // Attempt to remove all module settings
        // Start a temporary transaction for the checks
        $this->db->begin(true);
        $success = true;

        if ($this->configClass !== null
            && method_exists($this->configClass, SystemConfigInterface::ON_BEFORE_MODULE_DISABLE)
            && call_user_func([$this->configClass, SystemConfigInterface::ON_BEFORE_MODULE_DISABLE]) === false) {
            // Call the module's ON_BEFORE_MODULE_DISABLE method and check the result
            $messages = $this->configClass->getMessages();
            if ( ! empty($messages)) {
                $this->messages = $messages;
            } else {
                $this->messages[] = $this->translation->_("ext_ErrorOnModuleBeforeDisable");
            }
            $this->db->rollback(true); // Rollback the transaction

            return false;
        }

        // Attempt to remove the current module, if no errors occur, it can be disabled
        // For example, the module may be referenced by a record in the Extensions table,
        // which needs to be deleted when the module is disabled
        $modelsFiles = glob("{$this->modulesRoot}/{$this->moduleUniqueID}/Models/*.php", GLOB_NOSORT);
        foreach ($modelsFiles as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "Modules\\{$this->moduleUniqueID}\\Models\\{$className}";
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
                        // If the model does not have relations, skip it
                        // Potential performance issue for large tables
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
                $this->messages['error'][] = $exception->getMessage();
                $success          = false;
            }
        }
        if ($success) {
            $this->messages = [];
        }

        // Rollback the transaction
        $this->db->rollback(true);

        return $success;
    }

    /**
     * Disables the firewall settings for the module.
     *
     * @return bool True if the firewall settings are disabled successfully, false otherwise.
     */
    protected function disableFirewallSettings(): bool
    {
        if ($this->configClass === null
            || method_exists($this->configClass, SystemConfigInterface::GET_DEFAULT_FIREWALL_RULES) === false
            || call_user_func([$this->configClass, SystemConfigInterface::GET_DEFAULT_FIREWALL_RULES]) === []
        ) {
            return true;
        }
        $errors       = [];
        $savedState   = [];
        $defaultRules = call_user_func([$this->configClass, SystemConfigInterface::GET_DEFAULT_FIREWALL_RULES]);

        // Retrieve the category key and current rules for the firewall
        $key          = strtoupper(key($defaultRules));
        $currentRules = FirewallRules::findByCategory($key);

        // Store the current firewall settings for later restoration
        foreach ($currentRules as $detailRule) {
            $savedState[$detailRule->networkfilterid] = $detailRule->action;
        }
        $this->db->begin(true);

        // Delete the current firewall rules
        if ( ! $currentRules->delete()) {
            $this->messages['error'][] = $currentRules->getMessages();

            return false;
        }

        // Save the previous firewall settings
        $previousRuleSettings = PbxSettings::findFirstByKey("{$this->moduleUniqueID}FirewallSettings");
        if ($previousRuleSettings === null) {
            $previousRuleSettings      = new PbxSettings();
            $previousRuleSettings->key = "{$this->moduleUniqueID}FirewallSettings";
        }
        $previousRuleSettings->value = json_encode($savedState);
        if ( ! $previousRuleSettings->save()) {
            $errors[] = $previousRuleSettings->getMessages();
        }

        // Rollback and return false if there are any errors
        if (count($errors) > 0) {
            $this->messages['error'][] = array_merge($this->messages, $errors);
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
     * Performs the necessary checks before enabling the module.
     *
     * @return bool True if the checks passed successfully, false otherwise.
     */
    private function makeBeforeEnableTest(): bool
    {
        $success = true;

        // Start a temporary transaction for the checks
        $this->db->begin(true);

        // Temporarily enable the module to handle all links and dependencies
        $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
        if ($module !== null) {
            $module->disabled = '0';
            $module->save();
        }

        // If the module's configuration class contains a function for proper inclusion,
        // we will invoke it. For example, the intelligent routing module registers itself in the routes.
        //
        // Execute the "ON_BEFORE_MODULE_ENABLE" function in the module config, if available
        if ($this->configClass !== null
            && method_exists($this->configClass, SystemConfigInterface::ON_BEFORE_MODULE_ENABLE)
            && call_user_func([$this->configClass, SystemConfigInterface::ON_BEFORE_MODULE_ENABLE]) === false) {
            $messages = $this->configClass->getMessages();
            if ( ! empty($messages)) {
                $this->messages = $messages;
            } else {
                $this->messages[] = $this->translation->_("ext_ErrorOnModuleBeforeEnable");
            }
            $this->db->rollback(true); // Rollback the temporary transaction

            return false;
        }

        // Check for broken references that prevent enabling the module
        // For example, if an employee has been deleted and the module references their extension.
        //
        $modelsFiles = glob("{$this->modulesRoot}/{$this->moduleUniqueID}/Models/*.php", GLOB_NOSORT);
        $translator  = $this->di->getShared('translation');
        foreach ($modelsFiles as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "Modules\\{$this->moduleUniqueID}\\Models\\{$className}";

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
                        // If no relations are defined in the model, skip processing.
                        // This can be a potential issue for large tables.
                        break;
                    }
                    foreach ($relations as $relation) {
                        $alias        = $relation->getOption('alias');
                        $checkedValue = $record->$alias;
                        $foreignKey   = $relation->getOption('foreignKey');
                        // If the module has a "NULL" restriction in the model description,
                        // but the corresponding parameter is not filled in the module settings,
                        // e.g., a backup number in the routing module
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
                $this->messages['error'][] = $exception->getMessage();
                $success          = false;
            }
        }
        if ($success) {
            $this->messages = [];
        }

        // Rollback the temporary transaction
        $this->db->rollback(true);

        return $success;
    }

    /**
     * Deletes volt cache files.
     *
     * @return void
     */
    private function cleanupVoltCache():void
    {
        $cacheDirs = [];
        $cacheDirs[] = $this->config->path('adminApplication.voltCacheDir');
        $rmPath = Util::which('rm');
        foreach ($cacheDirs as $cacheDir) {
            if (!empty($cacheDir)) {
                Processes::mwExec("{$rmPath} -rf {$cacheDir}/*");
            }
        }
    }

}