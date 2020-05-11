<?php


namespace MikoPBX\Modules\Config;


interface SystemConfigInterface
{

    /**
     * Проверка работы сервисов.
     */
    public function checkModuleWorkProperly(): array;

    /**
     * Генерация конфига, рестарт работы модуля.
     * Метод вызывается после рестарта NATS сервера.
     */
    public function onNatsReload(): void;

    /**
     * Перезапуск сервисов модуля.
     *
     * @return void
     */
    public function reloadServices(): void;

    /**
     * Будет вызван после старта asterisk.
     */
    public function onAfterPbxStarted(): void;

    /**
     * Добавление задач в crond.
     *
     * @param $tasks
     */
    public function createCronTasks(&$tasks): void;

    /**
     * Модули: Выполнение к-либо действия.
     *
     * @param $req_data
     *
     * @return array
     */
    public function customAction($req_data): array;


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
     * Returns array of additional routes for PBXCoreREST interface from module
     *
     * @return array
     */
    public function getPBXCoreRESTAdditionalRoutes(): array;


    /**
     * Returns array of workers classes for WorkerSafeScripts from module
     * @return array
     */
    public function getModuleWorkers(): array;

}