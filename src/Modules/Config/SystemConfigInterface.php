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

namespace MikoPBX\Modules\Config;


/**
 * Interface SystemConfigInterface
 *
 * This interface defines system configuration hooks
 *
 * @package MikoPBX\Modules\Config
 */
interface SystemConfigInterface
{

    public const MODELS_EVENT_NEED_RELOAD = 'modelsEventNeedReload';

    public const MODELS_EVENT_CHANGE_DATA = 'modelsEventChangeData';

    public const CREATE_CRON_TASKS = 'createCronTasks';

    public const CREATE_NGINX_LOCATIONS = 'createNginxLocations';

    public const GENERATE_FAIL2BAN_JAILS = 'generateFail2BanJails';

    public const ON_AFTER_MODULE_DISABLE = 'onAfterModuleDisable';

    public const ON_AFTER_MODULE_ENABLE = 'onAfterModuleEnable';

    public const GET_MODULE_WORKERS = 'getModuleWorkers';

    public const GET_DEFAULT_FIREWALL_RULES = 'getDefaultFirewallRules';

    public const ON_AFTER_PBX_STARTED = 'onAfterPbxStarted';

    public const ON_BEFORE_MODULE_DISABLE = 'onBeforeModuleDisable';

    public const ON_BEFORE_MODULE_ENABLE = 'onBeforeModuleEnable';


    /**
     * The callback function will execute after PBX started.
     */
    public function onAfterPbxStarted(): void;

    /**
     * Adds cron tasks.
     *
     * @param array $tasks The array of cron tasks.
     */
    public function createCronTasks(&$tasks): void;

    /**
     * Creates additional Nginx locations from modules.
     *
     * @return string The generated Nginx locations.
     */
    public function createNginxLocations(): string;

    /**
     * This method is called in the WorkerModelsEvents after each model change.
     *
     * @param mixed $data The data related to the model change.
     */
    public function modelsEventChangeData($data): void;

    /**
     * This method is called in the WorkerModelsEvents after the models changing process is finished.
     *
     * @param array $modified_tables The list of modified models.
     */
    public function modelsEventNeedReload(array $modified_tables): void;

    /**
     * Returns an array of worker classes for WorkerSafeScripts.
     *
     * @return array The array of worker classes.
     */
    public function getModuleWorkers(): array;

    /**
     * Returns an array of additional firewall rules for the module.
     *
     * @return array The array of firewall rules.
     */
    public function getDefaultFirewallRules(): array;

    /**
     * Processes actions before enabling the module in the web interface.
     *
     * @return bool Whether the module can be enabled.
     */
    public function onBeforeModuleEnable(): bool;

    /**
     * Processes actions after enabling the module in the web interface.
     *
     * @return void
     */
    public function onAfterModuleEnable(): void;

    /**
     * Processes actions before disabling the module in the web interface.
     *
     * @return bool Whether the module can be disabled.
     */
    public function onBeforeModuleDisable(): bool;

    /**
     * Processes actions after disabling the module in the web interface.
     *
     * @return void
     */
    public function onAfterModuleDisable(): void;

    /**
     * Generates additional fail2ban jail conf rules.
     *
     * @return string The generated fail2ban jail conf rules.
     */
    public function generateFail2BanJails(): string;

}