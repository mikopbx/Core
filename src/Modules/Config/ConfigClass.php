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

use MikoPBX\Core\Asterisk\Configs\CoreConfigClass;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use ReflectionClass as ReflectionClassAlias;

class ConfigClass extends CoreConfigClass implements SystemConfigInterface,
                                                     RestAPIConfigInterface
{
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
        parent::__construct();
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
        $result .= $addition;
        if (substr($addition, -1) !== "\t") {
            $result .= "\t";
        }
        $result .= PHP_EOL . '; ***** END BY ' . $this->moduleUniqueId . PHP_EOL;

        return $result;
    }


}