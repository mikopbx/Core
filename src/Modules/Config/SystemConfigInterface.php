<?php


namespace MikoPBX\Modules\Config;


interface SystemConfigInterface
{

    /**
     * Будет вызван после старта asterisk.
     */
    public function onAfterPbxStarted(): void;

    /**
     * Adds crond rules
     *
     * @param $tasks
     */
    public function createCronTasks(&$tasks): void;

    /**
     * Create additional Nginx locations from modules
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