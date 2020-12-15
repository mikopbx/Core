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


interface SystemConfigInterface
{

    /**
     * The callback function will execute after PBX started.
     */
    public function onAfterPbxStarted(): void;

    /**
     * Adds crond rules
     *
     * @param $tasks
     */
    public function createCronTasks(&$tasks): void;

    /**
     * Create additional Nginx locations from modules.
     *
     */
    public function createNginxLocations(): string;

    /**
     * Обработчик события изменения данных в базе настроек mikopbx.db.
     *
     * @param $data
     */
    public function modelsEventChangeData($data): void;

    /**
     * Обработчик события изменения данных в базе настроек mikopbx.db.
     *
     * @param $modified_tables
     */
    public function modelsEventNeedReload($modified_tables): void;


    /**
     * Returns array of workers classes for WorkerSafeScripts from module
     * @return array
     */
    public function getModuleWorkers(): array;

    /**
     * Returns array of additional firewall rules for module
     * @return array
     */
    public function getDefaultFirewallRules(): array;


    /**
     * Process before enable action in web interface
     * @return bool
     */
    public function onBeforeModuleEnable(): bool;

    /**
     * Process after enable action in web interface
     * @return void
     */
    public function onAfterModuleEnable(): void;


    /**
     * Process before disable action in web interface
     * @return bool
     */
    public function onBeforeModuleDisable(): bool;

    /**
     * Process after disable action in web interface
     * @return void
     */
    public function onAfterModuleDisable(): void;


    /**
     * Generates additional fail2ban jail conf rules
     *
     * @return string
     */
    public function generateFail2BanJails():string;

}