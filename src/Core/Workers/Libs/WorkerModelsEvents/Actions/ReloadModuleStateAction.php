<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Common\Providers\ModulesDBConnectionsProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigInterface;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Modules\Config\SystemConfigInterface;

class ReloadModuleStateAction implements ReloadActionInterface
{
    /**
     * Process after PBXExtension state changes
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        // Recreate modules array
        PBXConfModulesProvider::recreateModulesProvider();

        // Recreate database connections
        ModulesDBConnectionsProvider::recreateModulesDBConnections();

        // Hook module methods if they change system configs
        $className = str_replace('Module', '', $parameters['uniqid']);
        $configClassName = "Modules\\{$parameters['uniqid']}\\Lib\\{$className}Conf";
        if (class_exists($configClassName)) {
            $configClassObj = new $configClassName();

            // Reconfigure fail2ban and restart iptables
            if (method_exists($configClassObj, SystemConfigInterface::GENERATE_FAIL2BAN_JAILS)
                && !empty(call_user_func([$configClassObj, SystemConfigInterface::GENERATE_FAIL2BAN_JAILS]))) {
                WorkerModelsEvents::invokeAction(WorkerModelsEvents::R_FAIL2BAN_CONF, [], 50);
            }

            // Refresh Nginx conf if module has any locations
            if (method_exists($configClassObj, SystemConfigInterface::CREATE_NGINX_LOCATIONS)
                && !empty(call_user_func([$configClassObj, SystemConfigInterface::CREATE_NGINX_LOCATIONS]))) {
                WorkerModelsEvents::invokeAction(WorkerModelsEvents::R_NGINX_CONF, [], 50);
            }

            // Refresh crontab rules if module has any for it
            if (method_exists($configClassObj, SystemConfigInterface::CREATE_CRON_TASKS)) {
                $tasks = [];
                call_user_func_array([$configClassObj, SystemConfigInterface::CREATE_CRON_TASKS], [&$tasks]);
                if (!empty($tasks)) {
                    WorkerModelsEvents::invokeAction(WorkerModelsEvents::R_CRON, [], 50);
                }
            }

            // Reconfigure asterisk manager interface
            if (method_exists($configClassObj, AsteriskConfigInterface::GENERATE_MANAGER_CONF)
                && !empty(call_user_func([$configClassObj, AsteriskConfigInterface::GENERATE_MANAGER_CONF]))) {
                WorkerModelsEvents::invokeAction(WorkerModelsEvents::R_MANAGERS, [], 50);
            }

            // Hook modules AFTER_ methods
            if ($parameters['disabled'] === '1'
                && method_exists($configClassObj, SystemConfigInterface::ON_AFTER_MODULE_DISABLE)) {
                call_user_func([$configClassObj, SystemConfigInterface::ON_AFTER_MODULE_DISABLE]);
            } elseif ($parameters['disabled'] === '0'
                && method_exists($configClassObj, SystemConfigInterface::ON_AFTER_MODULE_ENABLE)) {
                call_user_func([$configClassObj, SystemConfigInterface::ON_AFTER_MODULE_ENABLE]);
            }
        }
    }
}