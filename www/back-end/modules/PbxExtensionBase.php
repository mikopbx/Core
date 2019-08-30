<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2019
 */

namespace Modules;

use Models\ModelsBase;
use Models\PbxSettings;
use Phalcon\Db\Adapter\Pdo\Sqlite;
use Util;
use Config;
use Models\PbxExtensionModules;
use Phalcon\Db\Column;
use Phalcon\DI;

/**
 * Class PbxExtensionBase
 * Общие для всех модулей методы
 * Подключается при установке, удалении модуля
 */
abstract class PbxExtensionBase
{
    /**
     * @var string Идентификатор модуля расширения
     */
    protected $module_uniqid;

    /**
     * @var string Версия модуля расширения
     */
    protected $version;

    /**
     * @var string Минимально совместимая версия PBX
     */
    protected $min_pbx_version;

    /**
     * @var string Наименование разработчика
     */
    protected $developer;

    /**
     * @var string Емейл для связи с разработчиком
     */
    protected $support_email;

    /**
     * Ссылка на базу данных
     *
     * @var \Phalcon\Db\Adapter\Pdo\Sqlite
     */
    protected $db; // база данных

    /**
     * @var \Phalcon\DI\FactoryDefault
     */
    private $di;

    /**
     * @var array Конфигурационный массив Phalcon
     */
    protected $phalconSettings;

    /**
     * @var string Папка с модулем
     */
    protected $moduleDir;

    /**
     * @var \Config Методы получения конфигурационных настроек из базы данных
     */
    protected $config;

    /**
     * @var \lic_product_id Идентификатор триальной лицензии
     */
    public $lic_product_id;

    /**
     * @var \lic_feature_id Идентификатор фичи
     */
    public $lic_feature_id;

    public function __construct()
    {
            $this->di = DI::getDefault();
            $this->db = $this->di->get('db');
            $this->phalconSettings =  $this->di->get('config')->toArray();
            $this->moduleDir = $this->phalconSettings['application']['modulesDir'] . $this->module_uniqid;
    }

    /**
     * Возвращает перевод идентификатора на язык установленный в настройках PBX
     *
     * @param $stringId - идентификатор фразы
     *
     * @return string - перевод
     */
    protected function locString($stringId): string
    {
        $language             = substr(PbxSettings::getValueByKey('PBXLanguage'), 0, 2);
        $translates           = [];
        $extensionsTranslates = [[]];
        $results              = glob($this->moduleDir . '/{messages}/en.php', GLOB_BRACE);
        foreach ($results as $path) {
            $langArr = require $path;
            if (is_array($langArr)) {
                $extensionsTranslates[] = $langArr;
            }
        }
        if ($extensionsTranslates !== [[]]) {
            $translates = array_merge($translates, ...$extensionsTranslates);
        }
        if ($language !== 'en') {
            $additionalTranslates = [[]];
            $results              = glob($this->moduleDir . "/{messages}/{$language}.php", GLOB_BRACE);
            foreach ($results as $path) {
                $langArr = require $path;
                if (is_array($langArr)) {
                    $additionalTranslates[] = $langArr;
                }
            }
            if ($additionalTranslates !== [[]]) {
                $translates = array_merge($translates, ...$additionalTranslates);
            }
        }

        // Return a translation object
        if (array_key_exists($stringId, $translates)) {
            return $translates[$stringId];
        }

        return $stringId;
    }

    /**
     * Выполняет регистрацию модуля в таблице PbxExtensionModules
     *
     * @return bool
     */
    protected function registerNewModule(): bool
    {
        // Проверим версию АТС и Модуля на совместимость
        $currentVersionPBX = PbxSettings::getValueByKey('PBXVersion');
        if (version_compare($currentVersionPBX, $this->min_pbx_version) < 0) {
            return false;
        }

        $module = PbxExtensionModules::findFirst("uniqid='{$this->module_uniqid}'");
        if ( ! $module) {
            $module           = new PbxExtensionModules();
            $module->name     = $this->locString("SubHeader{$this->module_uniqid}");
            $module->disabled = '1';
        }
        $module->uniqid        = $this->module_uniqid;
        $module->developer     = $this->developer;
        $module->version       = $this->version;
        $module->description   = $this->locString("Breadcrumb{$this->module_uniqid}");
        $module->support_email = $this->support_email;

        return $module->save();
    }

    /**
     * Создает или обновляет структуру таблицы настроек
     *
     * @param $tableName
     * @param $tableStructure
     *
     * @return bool
     */
    protected function createSettingsTable($tableName, $tableStructure): bool
    {

        $result           = true;
        $tableColumnTypes = [
            'key'     => ['type'          => Column::TYPE_INTEGER,
                          'notNull'       => true,
                          'autoIncrement' => true,
                          'primary'       => true,
            ],
            'integer' => ['type' => Column::TYPE_INTEGER, 'default' => '0'],
            'string'  => ['type' => Column::TYPE_TEXT, 'default' => ''],
        ];
        $columns = [];
        $newColNames = []; // Имена новых колонок в таблице
        foreach ($tableStructure as $colName => $colType) {
            $columns[] = new Column($colName, $tableColumnTypes[$colType]);
            $newColNames[] = $colName;
        }
        $columnsNew = ['columns' => $columns];
        $this->db->begin();

        if ( ! $this->db->tableExists($tableName)) {
            $result = $this->db->createTable($tableName, null, $columnsNew);

        } else { // Таблица существует, создадим новую и скопируем данные, чтобы не думать про новые, старые колонки

            $columnsTemp = $this->db->describeColumns($tableName, null);

            $currentStateColumnList = [];
            $oldColNames = []; // Старые названия колонок
            $countColumnsTemp =  count($columnsTemp);
            for ($k = 0; $k < $countColumnsTemp; $k++) {
                $currentStateColumnList[$k] = $columnsTemp[$k]->getName();
                $oldColNames[] = $columnsTemp[$k]->getName();
            }

            $aquery = '
            CREATE TEMPORARY TABLE ' . $tableName . '_backup(' . implode(',', $currentStateColumnList) . ');
            INSERT INTO ' . $tableName . '_backup SELECT ' . implode(',',
                    $currentStateColumnList) . ' FROM ' . $tableName . ';
            DROP TABLE ' . $tableName . ';';
            $result = $result && $this->db->execute($aquery);

            $result = $result && $this->db->createTable($tableName, null, $columnsNew);

            $newColumnNames = array_intersect($newColNames, $oldColNames);

            $result = $result && $this->db->execute('
            INSERT INTO ' . $tableName .'('. implode(',', $newColumnNames) . ')
            SELECT ' . implode(',', $newColumnNames) . ' FROM ' . $tableName . '_backup;
        ');
            $result = $result && $this->db->execute('
            DROP TABLE ' . $tableName . '_backup;            
        ');

        }
        if ($result) {
            $this->db->commit();
            init_db($this->di, $this->phalconSettings);
        } else {
            Util::sys_log_msg('update_system_config', 'Error: Failed to create table ' . $tableName . '.');
        }

        return $result;
    }

    /**
     * Удаляет указанную таблицу настроек модуля
     *
     * @param $tableName - имя таблицы
     *
     * @return bool результат удаления
     */
    protected function dropSettingsTable($tableName): bool
    {
        $result = true;
        if ($this->db->tableExists($tableName)) {
            $result = $this->db->dropTable($tableName);
            if ($result === true) {
                init_db($this->di, $this->phalconSettings);
            } else {
                Util::sys_log_msg('update_system_config', "Error: Failed to drop table {$tableName}.");
            }
        }

        return $result;
    }

    /**
     * Удаляет запись о модуле из PbxExtensionModules
     *
     * @return bool результат очистки
     */
    protected function unregisterModule() :bool
    {
        $result = true;
        $module = PbxExtensionModules::findFirst("uniqid='{$this->module_uniqid}'");
        if ($module) {
            $result = $result && $module->delete();
        }

        return $result;
    }

	/**
     * Создает структуру для хранения настроек модуля в своей модели
     * и заполняет настройки по-умолчанию если таблицы не было в системе
     * см (unInstallDB)
     *
     * Регистрирует модуль в PbxExtensionModules
     *
     * @return bool результат установки
     */
	abstract protected function installDB(): bool;

	/**
     * Выполняет копирование необходимых файлов, в папки системы
     *
     * @return bool результат установки
     */
	abstract protected function installFiles(): bool;

	/**
     * Удаляет запись о модуле из PbxExtensionModules
     * Удаляет свою модель
     *
     * @param  $keepSettings - оставляет таблицу с данными своей модели
     *
     * @return bool результат очистки
     */
	abstract protected function unInstallDB($keepSettings = false): bool;

	/**
     * Выполняет удаление своих файлов с остановной процессов
     * при необходимости
     *
     * @return bool результат удаления
     */
	abstract protected function unInstallFiles(): bool;


	/**
     * Выполняет активацию триалов, проверку лицензионного клчюча
     *
     * @return bool результат активации лицензии
     */
	abstract protected function activateLicense(): bool;
	
	/**
     * Последовательный вызов процедур установки модуля расширения
     * с текстового результата установки
     *
     * @return array - результат установки
     */
	public function installModule(): array
    {
        $result = true;
        $error  = '';
        if ( ! $this->activateLicense()) {
            $error  = 'License activate error';
            $result = false;
        }
        if ( ! $this->installDB()) {
            $error  .= ' installDB error';
            $result = false;
        }
        if ( ! $this->installFiles()) {
            $error  .= ' installFiles error';
            $result = false;
        }

        return ['result' => $result, 'error' => $error];
    }

	/**
     * Последовательный вызов процедур установки модуля расширения
     * с результата удаления
     *
     * @param $keepSettings bool - сохранять настройки модуля при удалении
     *
     * @return array - результат удаления
     */
	public function uninstallModule($keepSettings = false): array
    {
        $result = true;
        $error  = '';
        if ( ! $this->unInstallDB($keepSettings)) {
            $error  .= ' unInstallDB error';
            $result = false;
        }
        if ($result && ! $this->unInstallFiles()) {
            $error  .= ' unInstallFiles error';
            $result = false;
        }

        return ['result' => $result, 'error' => $error];
    }


}