<?php


namespace MikoPBX\Modules\Setup;


interface PbxExtensionSetupInterface
{
    /**
     * PbxExtensionBase constructor.
     *
     * @param $module_uniqid
     *
     * @throws \Phalcon\Exception
     */
    public function __construct($module_uniqid = null);

    /**
     * Последовательный вызов процедур установки модуля расширения
     * с текстового результата установки
     *
     * @return bool - результат установки
     */
    public function installModule(): bool;

    /**
     * Выполняет активацию триалов, проверку лицензионного клчюча
     *
     * @return bool результат активации лицензии
     */
    public function activateLicense(): bool;

    /**
     * Выполняет копирование необходимых файлов, в папки системы
     *
     * @return bool результат установки
     */
    public function installFiles(): bool;

    /**
     * Setup ownerships and folder rights
     *
     * @return bool
     */
    public function fixRights(): bool;

    /**
     * Создает структуру для хранения настроек модуля в своей модели
     * и заполняет настройки по-умолчанию если таблицы не было в системе
     * см (unInstallDB)
     *
     * Регистрирует модуль в PbxExtensionModules
     *
     * @return bool результат установки
     */
    public function installDB(): bool;

    /**
     * Последовательный вызов процедур установки модуля расширения
     * с результата удаления
     *
     * @param $keepSettings bool - сохранять настройки модуля при удалении
     *
     * @return bool - результат удаления
     */
    public function uninstallModule($keepSettings = false): bool;

    /**
     * Удаляет запись о модуле из PbxExtensionModules
     * Удаляет свою модель
     *
     * @param  $keepSettings - оставляет таблицу с данными своей модели
     *
     * @return bool результат очистки
     */
    public function unInstallDB($keepSettings = false): bool;

    /**
     * Удаляет запись о модуле из PbxExtensionModules
     *
     * @return bool результат очистки
     */
    public function unregisterModule(): bool;

    /**
     * Выполняет удаление своих файлов с остановной процессов
     * при необходимости
     *
     * @param bool $keepSettings сохранять настройки
     *
     * @return bool результат удаления
     */
    public function unInstallFiles($keepSettings = false);//: bool Пока мешает удалять и обновлять старые модули, раскоменитровать после релиза 2020.5;

    /**
     * Returns error messages
     *
     * @return array
     */
    public function getMessages(): array;

    /**
     * Выполняет регистрацию модуля в таблице PbxExtensionModules
     *
     * @return bool
     */
    public function registerNewModule(): bool;

    /**
     * Возвращает перевод идентификатора на язык установленный в настройках PBX
     *
     * @param $stringId - идентификатор фразы
     *
     * @return string - перевод
     */
    public function locString($stringId): string;

    /**
     * Обходит файлы с описанием моделей и создает таблицы в базе данных
     *
     * @return bool
     */
    public function createSettingsTableByModelsAnnotations(): bool;


    /**
     * Добавляет модуль в боковое меню
     *
     * @return bool
     */
    public function addToSidebar(): bool;
}