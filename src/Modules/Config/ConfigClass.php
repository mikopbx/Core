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

namespace MikoPBX\Modules\Config;

use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Acl\Adapter\Memory as AclList;
use Phalcon\Config;
use Phalcon\Di\Injectable;
use Phalcon\Mvc\Router;
use ReflectionClass as ReflectionClassAlias;

class ConfigClass extends Injectable implements SystemConfigInterface,
                             RestAPIConfigInterface,
                             WebUIConfigInterface
{

    /**
     * Config file name i.e. extensions.conf
     */
    protected string $description;
    private   string $stageMessage = '';

    /**
     * Easy way to get or set the PbxSettings values
     *
     * @var \MikoPBX\Core\System\MikoPBXConfig
     */
    protected MikoPBXConfig $mikoPBXConfig;

    /**
     * Access to the /etc/inc/mikopbx-settings.json values
     *
     * @var \Phalcon\Config
     */
    protected Config $config;


    /**
     * Error and notice messages
     *
     * @var array
     */
    protected array $messages;

    /**
     * Array of PbxSettings values
     */
    protected array $generalSettings;


    /**
     * External module UniqueID
     */
    public string $moduleUniqueId;

    /**
     * Additional module directory
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
     * Returns array of additional routes for the PBXCoreREST interface from module
     *
     * @return array
     */
    public function getPBXCoreRESTAdditionalRoutes(): array
    {
        return [];
    }

    /**
     * Process PBXCoreREST requests under root rights
     *
     * @param array $request GET/POST parameters
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
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
     * This method calls in the WorkerModelsEvents after receive each models change
     *
     * @param $data
     */
    public function modelsEventChangeData($data): void
    {
    }

    /**
     * This method calls in the WorkerModelsEvents after finished process models changing
     *
     * @param array $modified_tables list of modified models
     */
    public function modelsEventNeedReload(array $modified_tables): void
    {
    }

    /**
     * Returns array of workers classes for WorkerSafeScripts
     *
     * @return array
     */
    public function getModuleWorkers(): array
    {
        return [];
    }

    /**
     * Returns array of additional firewall rules for module
     *
     * @return array
     */
    public function getDefaultFirewallRules(): array
    {
        return [];
    }

    /**
     * Process module enable request
     *
     * @return bool
     */
    public function onBeforeModuleEnable(): bool
    {
        return true;
    }

    /**
     * Process some actions after module enable
     *
     * @return void
     */
    public function onAfterModuleEnable(): void
    {
    }

    /**
     * Process module disable request
     *
     * @return bool
     */
    public function onBeforeModuleDisable(): bool
    {
        return true;
    }

    /**
     * Process some actions after module disable
     *
     * @return void
     */
    public function onAfterModuleDisable(): void
    {
    }

    /**
     * Create additional Nginx locations from modules
     *
     * @return string
     */
    public function createNginxLocations(): string
    {
        return '';
    }

    /**
     * Generates additional fail2ban jail conf rules from modules
     *
     * @return string
     */
    public function generateFail2BanJails(): string
    {
        return '';
    }

    /**
     * Generates the modules.conf file
     *
     * @return string
     */
    public function generateModulesConf(): string
    {
        return '';
    }

    /**
     * Prepares crontab rules strings
     *
     * @param array $tasks
     */
    public function createCronTasks(&$tasks): void
    {
    }

    /**
     * This module's method calls after the asterisk service started
     */
    public function onAfterPbxStarted(): void
    {
    }

    /**
     * Makes pretty module text block into config file
     *
     * @param string $addition
     *
     * @return string
     */
    protected function confBlockWithComments(string $addition): string
    {
        $result = '';
        if (empty($addition)) {
            return $result;
        }
        $result = PHP_EOL . '; ***** BEGIN BY ' . $this->moduleUniqueId . PHP_EOL;
        $result .= rtrim($addition);
        $result .= PHP_EOL . '; ***** END BY ' . $this->moduleUniqueId . PHP_EOL;

        return $result;
    }


    /**
     * Authenticates user over external module
     *
     * @param string $login
     * @param string $password
     * @return array session data
     */
    public function authenticateUser(string $login, string $password): array
    {
        return [];
    }

    /**
     * Prepares list of additional ACL roles and rules
     *
     * @param  AclList $aclList
     * @return void
     */
    public function onAfterACLPrepared(AclList $aclList): void
    {
    }

    /**
     * Modifies system menu
     *
     * @param array $menuItems
     * @return void
     */
    public function onBeforeHeaderMenuShow(array &$menuItems):void
    {
    }

    /**
     * Modifies system routes
     *
     * @param Router $router
     * @return void
     */
    public function onAfterRoutesPrepared(Router $router):void
    {
    }

}