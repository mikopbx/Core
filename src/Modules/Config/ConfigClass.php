<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Modules\Config;

use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Acl\Adapter\Memory as AclList;
use Phalcon\Assets\Manager;
use Phalcon\Config;
use Phalcon\Di\Injectable;
use Phalcon\Forms\Form;
use Phalcon\Mvc\Controller;
use Phalcon\Mvc\Router;
use Phalcon\Mvc\View;
use ReflectionClass as ReflectionClassAlias;


/**
 * Abstract class ConfigClass
 *
 * Define all possible functions to make system hooks
 *
 * @package MikoPBX\Modules\Config
 */
abstract class ConfigClass extends Injectable implements SystemConfigInterface,
                             RestAPIConfigInterface,
                             WebUIConfigInterface
{
    // The module hook applying priority
    protected int $priority = 10000;

    /**
     * Config file name i.e. extensions.conf
     */
    protected string $description;

    /**
     * Easy way to get or set the PbxSettings values.
     *
     * @var \MikoPBX\Core\System\MikoPBXConfig
     */
    protected MikoPBXConfig $mikoPBXConfig;

    /**
     * Access to the /etc/inc/mikopbx-settings.json values.
     *
     * @var \Phalcon\Config
     */
    protected Config $config;

    /**
     * Error and notice messages.
     *
     * @var array
     */
    protected array $messages;

    /**
     * Array of PbxSettings values.
     */
    protected array $generalSettings;


    /**
     * External module UniqueID.
     */
    public string $moduleUniqueId;

    /**
     * Additional module directory.
     */
    protected string $moduleDir;

    /**
     * ConfigClass constructor.
     *
     */
    public function __construct()
    {
        $this->config          = $this->di->getShared(ConfigProvider::SERVICE_NAME);
        $this->mikoPBXConfig   = new MikoPBXConfig();
        $this->generalSettings = $this->mikoPBXConfig->getGeneralSettings();
        $this->messages        = [];

        // Get child class parameters and define module Dir and UniqueID
        $reflector        = new ReflectionClassAlias(static::class);
        $partsOfNameSpace = explode('\\', $reflector->getNamespaceName());
        if (count($partsOfNameSpace) === 3 && $partsOfNameSpace[0] === 'Modules') {
            $modulesDir           = $this->config->path('core.modulesDir');
            $this->moduleUniqueId = $partsOfNameSpace[1];
            $this->moduleDir      = $modulesDir . '/' . $this->moduleUniqueId;
        }

        $this->messages = [];
    }

    /**
     * Allows overriding the execution priority of a method when called through hookModulesMethod.
     *
     * @param string $methodName
     * @return int
     */
    public function getMethodPriority(string $methodName=''):int
    {
        switch ($methodName){
            case SystemConfigInterface::CREATE_CRON_TASKS:
                //...
            default:
                $result = $this->priority;
        }
        return $result;
    }

    /**
     * Returns the messages variable
     *
     * @return array
     */
    public function getMessages(): array
    {
        return $this->messages;
    }

    /**
     * Returns an array of additional routes for the PBXCoreREST interface from the module.
     *
     * @return array The array of additional routes.
     */
    public function getPBXCoreRESTAdditionalRoutes(): array
    {
        return [];
    }

    /**
     * Process PBXCoreREST requests under root rights.
     *
     * @param array $request The GET/POST parameters.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public function moduleRestAPICallback(array $request): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $action         = strtoupper($request['action']);
        switch ($action) {
            case 'CHECK':
                $res->success = true;
                break;
            default:
                $res->success    = false;
                $res->messages[] = 'API action not found in moduleRestAPICallback';
        }

        return $res;
    }

    /**
     * This method is called in the WorkerModelsEvents after each model change.
     *
     * @param mixed $data The data related to the model change.
     *
     * @return void
     */
    public function modelsEventChangeData($data): void
    {
    }

    /**
     * This method is called in the WorkerModelsEvents after the models changing process is finished.
     *
     * @param array $modified_tables The list of modified models.
     *
     * @return void
     */
    public function modelsEventNeedReload(array $modified_tables): void
    {
    }

    /**
     * Returns an array of worker classes for WorkerSafeScripts.
     *
     * @return array The array of worker classes.
     */
    public function getModuleWorkers(): array
    {
        return [];
    }

    /**
     * Returns an array of additional firewall rules for the module.
     *
     * @return array The array of firewall rules.
     */
    public function getDefaultFirewallRules(): array
    {
        return [];
    }

    /**
     * Processes actions before enabling the module in the web interface.
     *
     * @return bool Whether the module can be enabled.
     */
    public function onBeforeModuleEnable(): bool
    {
        return true;
    }

    /**
     * Processes actions after enabling the module in the web interface.
     *
     * @return void
     */
    public function onAfterModuleEnable(): void
    {
    }

    /**
     * Processes actions before disabling the module in the web interface.
     *
     * @return bool Whether the module can be disabled.
     */
    public function onBeforeModuleDisable(): bool
    {
        return true;
    }

    /**
     * Processes actions after disabling the module in the web interface.
     *
     * @return void
     */
    public function onAfterModuleDisable(): void
    {
    }

    /**
     * Creates additional Nginx locations from modules.
     *
     * @return string The generated Nginx locations.
     */
    public function createNginxLocations(): string
    {
        return '';
    }

    /**
     * Generates additional fail2ban jail conf rules from modules.
     *
     * @return string The generated fail2ban jail conf rules.
     */
    public function generateFail2BanJails(): string
    {
        return '';
    }

    /**
     * Generates the modules.conf file.
     *
     * @return string The generated modules.conf file content.
     */
    public function generateModulesConf(): string
    {
        return '';
    }

    /**
     * Prepares crontab rules strings.
     *
     * @param array $tasks The array of crontab tasks.
     *
     * @return void
     */
    public function createCronTasks(&$tasks): void
    {
    }

    /**
     * This module's method is called after the Asterisk service has started.
     *
     * @return void
     */
    public function onAfterPbxStarted(): void
    {
    }

    /**
     * Authenticates user over external module.
     *
     * @param string $login The user login.
     * @param string $password The user password.
     * @return array The session data.
     */
    public function authenticateUser(string $login, string $password): array
    {
        return [];
    }

    /**
     * Prepares a list of additional ACL roles and rules.
     *
     * @param  AclList $aclList The ACL list.
     * @return void
     */
    public function onAfterACLPrepared(AclList $aclList): void
    {
    }

    /**
     * Modifies the system menu.
     *
     * @param array $menuItems The array of menu items.
     * @return void
     */
    public function onBeforeHeaderMenuShow(array &$menuItems):void
    {
    }

    /**
     * Modifies the system routes.
     *
     * @param Router $router The router instance.
     * @return void
     */
    public function onAfterRoutesPrepared(Router $router):void
    {
    }

    /**
     * Modifies the system assets.
     *
     * @param Manager $assets The asset manager.
     * @return void
     */
    public function onAfterAssetsPrepared(Manager $assets):void
    {
    }

    /**
     * Prepares an include block within a Volt template.
     *
     * @param string $controller The controller name.
     * @param string $blockName The block name.
     * @param View $view The view instance.
     * @return string the volt partial file path without extension.
     */
    public function onVoltBlockCompile(string $controller, string $blockName, View $view):string
    {
        return '';
    }

    /**
     * This method is called from BaseForm before the form is initialized.
     *
     * @param Form $form The form instance.
     * @param mixed $entity The form entity.
     * @param mixed $options The form options.
     * @return void
     */
    public function onBeforeFormInitialize(Form $form, $entity, $options):void
    {
    }

    /**
     * This method is called from BaseController on afterExecuteRoute function.
     *
     * @param Controller $controller The controller instance.
     * @return void
     */
    public function onAfterExecuteRoute(Controller $controller):void
    {
    }

    /**
     * This method is called from BaseController on beforeExecuteRoute function.
     *
     * @param Controller $controller The controller instance.
     * @return void
     */
    public function onBeforeExecuteRoute(Controller $controller):void
    {
    }
}