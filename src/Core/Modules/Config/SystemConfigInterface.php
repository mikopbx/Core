<?php


namespace MikoPBX\Core\Modules\Config;


interface SystemConfigInterface
{

    /**
     * Проверка работы сервисов.
     */
    public function test();

    /**
     * Генерация конфига, рестарт работы модуля.
     * Метод вызывается после рестарта NATS сервера.
     */
    public function onNatsReload();

    /**
     * Перезапуск сервисов модуля.
     *
     * @return bool
     */
    public function reloadServices();

    /**
     * Будет вызван после старта asterisk.
     */
    public function onAfterPbxStarted();

    /**
     * Добавление задач в crond.
     *
     * @param $tasks
     */
    public function createCronTasks(&$tasks);

    /**
     * Модули: Выполнение к-либо действия.
     *
     * @param $req_data
     *
     * @return array
     */
    public function customAction($req_data);


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

}