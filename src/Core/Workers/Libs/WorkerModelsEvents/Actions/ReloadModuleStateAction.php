<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\ModulesDBConnectionsProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigInterface;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\Modules\Config\SystemConfigInterface;

/**
 * Handles actions to reload module state when PBX extensions or module settings change.
 */
class ReloadModuleStateAction implements ReloadActionInterface
{
    const MODULE_SETTINGS_KEY = 'MODULE_SETTINGS_DATA';

    /**
     * Executes the action to reload module state based on provided parameters.
     *
     * @param array $parameters An array of parameters that may include module settings.
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        foreach ($parameters as $record) {
            if (!array_key_exists(self::MODULE_SETTINGS_KEY, $record)) {
                $this->planTheActionForFutureCycle($record);
            } else {
                $this->executeReloder($record[self::MODULE_SETTINGS_KEY]);
            }
        }

    }

    /**
     * Performs the actual reloading of the module based on its configuration.
     *
     * @param array $moduleRecord Module configuration data.
     * @return void
     */
    private function executeReloder(array $moduleRecord): void
    {
        // Recreate modules array
        PBXConfModulesProvider::recreateModulesProvider();

        // Recreate database connections
        ModulesDBConnectionsProvider::recreateModulesDBConnections();

        // Hook module methods if they change system configs
        $className = str_replace('Module', '', $moduleRecord['uniqid']);
        $configClassName = "Modules\\{$moduleRecord['uniqid']}\\Lib\\{$className}Conf";
        if (class_exists($configClassName)) {
            $configClassObj = new $configClassName();
            $this->handleModuleConfigChanges($configClassObj, $moduleRecord);
        }
    }

    /**
     * Plans the action for a future cycle if the module settings are not immediately available.
     *
     * @param array $moduleRecord Partial module configuration data.
     * @return void
     */
    private function planTheActionForFutureCycle(array $moduleRecord): void
    {
        // Check if the module ID was presented
        if (empty($moduleRecord['recordId'])) {
            return;
        }

        // Find the module settings record
        $moduleSettings = PbxExtensionModules::findFirstById($moduleRecord['recordId']);
        if ($moduleSettings !== null) {
            // Invoke the action for the PBX module state with the module settings data
            $moduleRecord[self::MODULE_SETTINGS_KEY] = $moduleSettings->toArray();
            WorkerModelsEvents::invokeAction(ReloadModuleStateAction::class, $moduleRecord, 50);
        }
    }

    /**
     * Handles module configuration changes and applies necessary system configuration reloads.
     *
     * @param ConfigClass $configClassObj The module configuration class object.
     * @param array $moduleRecord Module configuration data.
     * @return void
     */
    public function handleModuleConfigChanges(ConfigClass $configClassObj, array $moduleRecord):void
    {
        // Reconfigure fail2ban and restart iptables
        if (method_exists($configClassObj, SystemConfigInterface::GENERATE_FAIL2BAN_JAILS)
            && !empty(call_user_func([$configClassObj, SystemConfigInterface::GENERATE_FAIL2BAN_JAILS]))) {
            WorkerModelsEvents::invokeAction(ReloadFail2BanConfAction::class, [], 50);
        }

        // Refresh Nginx conf if the module has any locations
        if (method_exists($configClassObj, SystemConfigInterface::CREATE_NGINX_LOCATIONS)
            && !empty(call_user_func([$configClassObj, SystemConfigInterface::CREATE_NGINX_LOCATIONS]))) {
            WorkerModelsEvents::invokeAction(ReloadNginxConfAction::class, [], 50);
        }

        // Refresh crontab rules if module has any for it
        if (method_exists($configClassObj, SystemConfigInterface::CREATE_CRON_TASKS)) {
            $tasks = [];
            call_user_func_array([$configClassObj, SystemConfigInterface::CREATE_CRON_TASKS], [&$tasks]);
            if (!empty($tasks)) {
                WorkerModelsEvents::invokeAction(ReloadCrondAction::class, [], 50);
            }
        }

        // Reconfigure asterisk manager interface
        if (method_exists($configClassObj, AsteriskConfigInterface::GENERATE_MANAGER_CONF)
            && !empty(call_user_func([$configClassObj, AsteriskConfigInterface::GENERATE_MANAGER_CONF]))) {
            WorkerModelsEvents::invokeAction(ReloadManagerAction::class, [], 50);
        }

        // Hook modules AFTER_ methods
        if ($moduleRecord['disabled'] === '1'
            && method_exists($configClassObj, SystemConfigInterface::ON_AFTER_MODULE_DISABLE)) {
            call_user_func([$configClassObj, SystemConfigInterface::ON_AFTER_MODULE_DISABLE]);
        } elseif ($moduleRecord['disabled'] === '0'
            && method_exists($configClassObj, SystemConfigInterface::ON_AFTER_MODULE_ENABLE)) {
            call_user_func([$configClassObj, SystemConfigInterface::ON_AFTER_MODULE_ENABLE]);
        }
    }
}