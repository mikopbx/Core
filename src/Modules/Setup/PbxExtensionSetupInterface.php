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

namespace MikoPBX\Modules\Setup;


interface PbxExtensionSetupInterface
{
    /**
     * PbxExtensionBase constructor.
     *
     * @param  $moduleUniqueID string
     *
     * @throws \Phalcon\Exception
     */
    public function __construct(string $moduleUniqueID);

    /**
     * Последовательный вызов процедур установки модуля расширения
     * с текстового результата установки
     *
     * @return bool результат установки
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
    public function fixFilesRights(): bool;

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
     * @param $keepSettings bool сохранять настройки модуля при удалении
     *
     * @return bool результат удаления
     */
    public function uninstallModule(bool $keepSettings = false): bool;

    /**
     * Удаляет запись о модуле из PbxExtensionModules
     * Удаляет свою модель
     *
     * @param  $keepSettings bool оставляет таблицу с данными своей модели
     *
     * @return bool результат очистки
     */
    public function unInstallDB(bool $keepSettings = false): bool;

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
     * @param $keepSettings bool сохранять настройки
     *
     * @return bool результат удаления
     */
    public function unInstallFiles(bool $keepSettings = false);//: bool Пока мешает удалять и обновлять старые модули, раскоменитровать после релиза 2020.5;

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