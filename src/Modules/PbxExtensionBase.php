<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2019
 */

namespace MikoPBX\Modules;

use MikoPBX\Common\Models\{PbxExtensionModules, PbxSettings};
use Phalcon\Db\Adapter\Pdo\Sqlite;
use Phalcon\Db\Column;
use Phalcon\Db\Index;
use Phalcon\DI;
use Phalcon\Text;
use RuntimeException;
use MikoPBX\Core\System\Util;

/**
 * Class PbxExtensionBase
 * Общие для всех модулей методы
 * Подключается при установке, удалении модуля
 */
class PbxExtensionBase
{
    /**
     * Trial product version identify number from module.json
     *
     * @var int
     */
    public $lic_product_id;
    /**
     * License feature identify number from module.json
     *
     * @var int
     */
    public $lic_feature_id;
    /**
     * Module unique identify  from module.json
     *
     * @var string
     */
    protected $module_uniqid;
    /**
     * Module version from module.json
     *
     * @var string
     */
    protected $version;
    /**
     * Minimal require version PBX
     *
     * @var string
     */
    protected $min_pbx_version;
    /**
     * Module developer name
     *
     * @var string
     */
    protected $developer;
    /**
     * Module developer's email from module.json
     *
     * @var string
     */
    protected $support_email;
    /**
     * PBX general database
     *
     * @var \Phalcon\Db\Adapter\Pdo\Sqlite
     */
    protected $db;

    /**
     * Database from module DB folder
     *
     * @var \Phalcon\Db\Adapter\Pdo\Sqlite
     */
    protected $moduleDB;

    /**
     * Folder with module files
     *
     * @var string
     */
    protected $moduleDir;

    /**
     * Phalcon config service
     *
     * @var \Config
     */
    protected $config;

    /**
     * Dependency injector
     *
     * @var \Phalcon\DI\FactoryDefault
     */
    private $di;

    /**
     * Error and verbose messages
     *
     * @var array
     */
    private $messages;

    /**
     * PbxExtensionBase constructor.
     *
     * @param $module_uniqid
     */
    public function __construct($module_uniqid = null)
    {
        if ($module_uniqid !== null) {
            $this->module_uniqid = $module_uniqid;
        }
        $this->di      = DI::getDefault();
        $this->db      = $this->di->get('db');
        $this->config  = $this->di->get('config');
        $settings_file = "{$this->config->path('core.modulesDir')}/{$this->module_uniqid}/module.json";
        if (file_exists($settings_file)) {
            $module_settings = json_decode(file_get_contents($settings_file), true);
            if ($module_settings) {
                $this->version         = $module_settings['version'];
                $this->min_pbx_version = $module_settings['min_pbx_version'];
                $this->developer       = $module_settings['developer'];
                $this->support_email   = $module_settings['support_email'];
                if (array_key_exists('lic_product_id', $module_settings)) {
                    $this->lic_product_id = $module_settings['lic_product_id'];
                } else {
                    $this->lic_product_id = 0;
                }
                if (array_key_exists('lic_feature_id', $module_settings)) {
                    $this->lic_feature_id = $module_settings['lic_feature_id'];
                } else {
                    $this->lic_feature_id = 0;
                }
            } else {
                $this->messages[] = 'Error on decode module.json';
            }
        }
        $this->moduleDir = $this->config->path('core.modulesDir') .'/'. $this->module_uniqid;
        $this->messages  = [];

        // Create and connect database
        $dbPath = "{$this->moduleDir}/db";

        if ( ! file_exists($dbPath) && ! mkdir($dbPath, 0777, true) && ! is_dir($dbPath)) {
            $this->messages[] = sprintf('Directory "%s" was not created', $dbPath);
            throw new RuntimeException(sprintf('Directory "%s" was not created', $dbPath));
        }
        $this->moduleDB = new Sqlite(['dbname' => "$dbPath/module.db"]);
    }

    /**
     * Последовательный вызов процедур установки модуля расширения
     * с текстового результата установки
     *
     * @return bool - результат установки
     */
    public function installModule(): bool
    {
        $result = true;
        try {
            if ( ! $this->activateLicense()) {
                $this->messages[] = 'License activate error';
                $result           = false;
            }
            if ( ! $this->installFiles()) {
                $this->messages[] = ' installFiles error';
                $result           = false;
            }
            if ( ! $this->installDB()) {
                $this->messages[] = ' installDB error';
                $result           = false;
            }
        } catch (Throwable $exception) {
            $result         = false;
            $this->messages = $exception->getMessage();
        }

        return $result;
    }

    /**
     * Выполняет активацию триалов, проверку лицензионного клчюча
     *
     * @return bool результат активации лицензии
     */
    protected function activateLicense(): bool
    {
        return true;
    }

    /**
     * Выполняет копирование необходимых файлов, в папки системы
     *
     * @return bool результат установки
     */
    protected function installFiles(): bool
    {
        $backupPath = "{$this->config->path('core.modulesDir')}/Backup/{$this->module_uniqid}";
        if (is_dir($backupPath)) {
            Util::mwExec("cp -r {$backupPath}/db/* {$this->moduleDir}/db/");
        }
        $this->fixRights();

        return true;
    }

    /**
     * Setup ownerships and folder rights
     *
     * @return bool
     */
    protected function fixRights(): bool
    {
        Util::mwExec("chown -R www:www {$this->moduleDir}");
        Util::mwExec("chmod -R 777 {$this->moduleDir}");

        return true;
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
    protected function installDB(): bool
    {
        $this->fixRights();

        return true;
    }

    /**
     * Последовательный вызов процедур установки модуля расширения
     * с результата удаления
     *
     * @param $keepSettings bool - сохранять настройки модуля при удалении
     *
     * @return bool - результат удаления
     */
    public function uninstallModule($keepSettings = false): bool
    {
        $result = true;
        try {
            if ( ! $this->unInstallDB($keepSettings)) {
                $this->messages[] = ' unInstallDB error';
                $result           = false;
            }
            if ($result && ! $this->unInstallFiles($keepSettings)) {
                $this->messages[] = ' unInstallFiles error';
                $result           = false;
            }
        } catch (Throwable $exception) {
            $result         = false;
            $this->messages = $exception->getMessage();
        }

        return $result;
    }

    /**
     * Удаляет запись о модуле из PbxExtensionModules
     * Удаляет свою модель
     *
     * @param  $keepSettings - оставляет таблицу с данными своей модели
     *
     * @return bool результат очистки
     */
    protected function unInstallDB($keepSettings = false): bool
    {
        return $this->unregisterModule();
    }

    /**
     * Удаляет запись о модуле из PbxExtensionModules
     *
     * @return bool результат очистки
     */
    protected function unregisterModule(): bool
    {
        $result = true;
        $module = PbxExtensionModules::findFirst("uniqid='{$this->module_uniqid}'");
        if ($module) {
            $result = $result && $module->delete();
        }

        return $result;
    }

    /**
     * Выполняет удаление своих файлов с остановной процессов
     * при необходимости
     *
     * @param bool $keepSettings сохранять настройки
     *
     * @return bool результат удаления
     */
    protected function unInstallFiles($keepSettings = false
    ) //: bool Пока мешает удалять и обновлять старые модули, раскоменитровать после релиза 2020.5
    {
        $backupPath = "{$this->config->path('core.modulesDir')}/Backup/{$this->module_uniqid}";
        Util::mwExec("rm -rf {$backupPath}");
        if ($keepSettings) {
            if ( ! is_dir($backupPath) && ! mkdir($backupPath, 0777, true) && ! is_dir($backupPath)) {
                $this->messages[] = sprintf('Directory "%s" was not created', $backupPath);

                return false;
            }
            Util::mwExec("cp -r {$this->moduleDir}/db {$backupPath}/");
        }
        Util::mwExec("rm -rf {$this->moduleDir}");

        return true;
    }

    /**
     * Returns error messages
     *
     * @return array
     */
    public function getMessages(): array
    {
        return $this->messages;
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
        $currentVersionPBX = str_replace('-dev', '', $currentVersionPBX);
        if (version_compare($currentVersionPBX, $this->min_pbx_version) < 0) {
            $this->messages[] = "Error: module depends minimum PBX ver $this->min_pbx_version";

            return false;
        }

        $module = PbxExtensionModules::findFirst("uniqid='{$this->module_uniqid}'");
        if ( ! $module) {
            $module           = new PbxExtensionModules();
            $module->name     = $this->locString("Breadcrumb{$this->module_uniqid}");
            $module->disabled = '1';
        }
        $module->uniqid        = $this->module_uniqid;
        $module->developer     = $this->developer;
        $module->version       = $this->version;
        $module->description   = $this->locString("SubHeader{$this->module_uniqid}");
        $module->support_email = $this->support_email;

        return $module->save();
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
        $language             = substr(PbxSettings::getValueByKey('WebAdminLanguage'), 0, 2);
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
     * Обходит файлы с описанием моделей и создает таблицы в базе данных
     *
     * @return bool
     */
    protected function createSettingsTableByModelsAnnotations(): bool
    {
        $result  = true;
        $results = glob($this->moduleDir . '/Models/*.php', GLOB_NOSORT);
        foreach ($results as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "\\Modules\\{$this->module_uniqid}\\Models\\{$className}";
            $this->createUpdateDbTableByAnnotations($moduleModelClass);
        }

        // Подключаем db файлы модулей как севрисы в DI после пересоздания
        DiServicesInstall::Register($this->di);

        return $result;
    }

    /**
     * Create, update DB structure by code description
     *
     * @param $moduleModelClass - class name with namespace
     *                          i.e. Models\Extensions or Modules\ModuleSmartIVR\Models\Settings
     *
     * @return bool
     */
    private function createUpdateDbTableByAnnotations($moduleModelClass): bool
    {
        $result = true;
        if ( ! class_exists($moduleModelClass) || count(get_class_vars($moduleModelClass)) === 0) {
            return $result;
        }
        $metaData        = $this->di->get('modelsMetadata');
        $model           = new $moduleModelClass();
        $table_structure = [];

        // Create columns list by code annotations
        $newColNames = $metaData->getAttributes($model);
        foreach ($newColNames as $attribute) {
            $table_structure[$attribute] = ['type' => Column::TYPE_TEXT, 'default' => ''];
        }

        // For each numeric column change type
        $numericAttributes = $metaData->getDataTypesNumeric($model);
        foreach ($numericAttributes as $attribute => $value) {
            $table_structure[$attribute] = ['type' => Column::TYPE_INTEGER, 'default' => '0'];
        }

        // For each not nullable column change type
        $notNull = $metaData->getNotNullAttributes($model);
        foreach ($notNull as $attribute) {
            $table_structure[$attribute]['notNull'] = true;
        }

        // Set default values for initial save, later it fill at Models\ModelBase\beforeValidationOnCreate
        $defaultValues = $metaData->getDefaultValues($model);
        foreach ($defaultValues as $key => $value) {
            $table_structure[$key]['default'] = $value;
        }

        // Set primary keys
        $primaryKeys = $metaData->getPrimaryKeyAttributes($model);
        foreach ($primaryKeys as $attribute) {
            $table_structure[$attribute]['primary'] = true;
        }

        // Find auto incremental column, usually it is ID column
        $keyFiled = $metaData->getIdentityField($model);
        if (isset($keyFiled)) {
            $table_structure[$keyFiled] = [
                'type'          => Column::TYPE_INTEGER,
                'notNull'       => true,
                'autoIncrement' => true,
                'primary'       => true,
            ];
        }

        // Create new table structure
        $columns = [];
        foreach ($table_structure as $colName => $colType) {
            $columns[] = new Column($colName, $colType);
        }

        $columnsNew = ['columns' => $columns];
        $tableName  = $model->getSource();
        $this->moduleDB->begin();

        if ( ! $this->moduleDB->tableExists($tableName)) {
            $result = $this->moduleDB->createTable($tableName, '', $columnsNew);
        } else { // Таблица существует, создадим новую и скопируем данные, чтобы не думать про новые, старые колонки

            $columnsTemp = $this->moduleDB->describeColumns($tableName, '');

            $currentStateColumnList = [];
            $oldColNames            = []; // Старые названия колонок
            $countColumnsTemp       = count($columnsTemp);
            for ($k = 0; $k < $countColumnsTemp; $k++) {
                $currentStateColumnList[$k] = $columnsTemp[$k]->getName();
                $oldColNames[]              = $columnsTemp[$k]->getName();
            }

            $aquery = '
            CREATE TEMPORARY TABLE ' . $tableName . '_backup(' . implode(',', $currentStateColumnList) . ');
            INSERT INTO ' . $tableName . '_backup SELECT ' . implode(',',
                    $currentStateColumnList) . ' FROM ' . $tableName . ';
            DROP TABLE ' . $tableName . ';';
            $result = $result && $this->moduleDB->execute($aquery);

            $result = $result && $this->moduleDB->createTable($tableName, '', $columnsNew);

            $newColumnNames = array_intersect($newColNames, $oldColNames);

            $result = $result && $this->moduleDB->execute('
            INSERT INTO ' . $tableName . '(' . implode(',', $newColumnNames) . ')
            SELECT ' . implode(',', $newColumnNames) . ' FROM ' . $tableName . '_backup;
        ');
            $result = $result && $this->moduleDB->execute('
            DROP TABLE ' . $tableName . '_backup;            
        ');
        }

        // For each indexed columns change type
        $reflection = $this->di->get('annotations')->get($model);
        foreach ($reflection->getPropertiesAnnotations() as $name => $collection) {
            if ($collection->has('Indexed')) {
                // Define new unique index
                $index_column = new Index(
                    "{$name}_UNIQUE",
                    [
                        $name,
                    ],
                    'UNIQUE'
                );
                $result       = $result && $this->moduleDB->addIndex($tableName, '', $index_column);
            }
        }
        if ($result) {
            $this->moduleDB->commit();
        } else {
            $this->messages[] = "Error: Failed on create table $tableName";
            $this->moduleDB->rollback();
        }

        return $result;
    }

    /**
     * DEPRECATED
     *
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
            'key'     => [
                'type'          => Column::TYPE_INTEGER,
                'notNull'       => true,
                'autoIncrement' => true,
                'primary'       => true,
            ],
            'integer' => ['type' => Column::TYPE_INTEGER, 'default' => '0'],
            'string'  => ['type' => Column::TYPE_TEXT, 'default' => ''],
        ];
        $columns          = [];
        $newColNames      = []; // Имена новых колонок в таблице
        foreach ($tableStructure as $colName => $colType) {
            $columns[]     = new Column($colName, $tableColumnTypes[$colType]);
            $newColNames[] = $colName;
        }
        $columnsNew = ['columns' => $columns];
        $this->moduleDB->begin();

        if ( ! $this->moduleDB->tableExists($tableName)) {
            $result = $this->moduleDB->createTable($tableName, '', $columnsNew);

        } else { // Таблица существует, создадим новую и скопируем данные, чтобы не думать про новые, старые колонки

            $columnsTemp = $this->moduleDB->describeColumns($tableName, '');

            $currentStateColumnList = [];
            $oldColNames            = []; // Старые названия колонок
            $countColumnsTemp       = count($columnsTemp);
            for ($k = 0; $k < $countColumnsTemp; $k++) {
                $currentStateColumnList[$k] = $columnsTemp[$k]->getName();
                $oldColNames[]              = $columnsTemp[$k]->getName();
            }

            $aquery = '
            CREATE TEMPORARY TABLE ' . $tableName . '_backup(' . implode(',', $currentStateColumnList) . ');
            INSERT INTO ' . $tableName . '_backup SELECT ' . implode(',',
                    $currentStateColumnList) . ' FROM ' . $tableName . ';
            DROP TABLE ' . $tableName . ';';
            $result = $result && $this->moduleDB->execute($aquery);

            $result = $result && $this->moduleDB->createTable($tableName, '', $columnsNew);

            $newColumnNames = array_intersect($newColNames, $oldColNames);

            $result = $result && $this->moduleDB->execute('
            INSERT INTO ' . $tableName . '(' . implode(',', $newColumnNames) . ')
            SELECT ' . implode(',', $newColumnNames) . ' FROM ' . $tableName . '_backup;
        ');
            $result = $result && $this->moduleDB->execute('
            DROP TABLE ' . $tableName . '_backup;            
        ');

        }
        if ($result) {
            $this->moduleDB->commit();
            init_db($this->di, $this->config->toArray());
        } else {
            $this->messages[] = "Error: Failed on create table $tableName";
        }

        return $result;
    }

    /**
     * DEPRICATED
     * Удаляет указанную таблицу настроек модуля
     *
     * @param $tableName - имя таблицы
     *
     * @return bool результат удаления
     */
    protected function dropSettingsTable($tableName): bool
    {
        $result = true;
        if ($this->moduleDB->tableExists($tableName)) {
            $result = $this->moduleDB->dropTable($tableName);
            if ($result === true) {
                init_db($this->di, $this->config->toArray());
            } else {
                $this->messages[] = "Error: Failed on drop table $tableName";
            }
        }

        return $result;
    }

    /**
     * Добавляет модуль в боковое меню
     *
     * @return bool
     */
    protected function addToSidebar(): bool
    {
        $menuSettingsKey           = "AdditionalMenuItem{$this->module_uniqid}";
        $unCamelizedControllerName = Text::uncamelize($this->module_uniqid, '-');
        $menuSettings              = PbxSettings::findFirstByKey($menuSettingsKey);
        if ($menuSettings === null) {
            $menuSettings      = new PbxSettings();
            $menuSettings->key = $menuSettingsKey;
        }
        $value               = [
            'uniqid'        => $this->module_uniqid,
            'href'          => "/admin-cabinet/$unCamelizedControllerName",
            'group'         => 'maintenance',
            'iconClass'     => 'puzzle',
            'caption'       => "Breadcrumb$this->module_uniqid",
            'showAtSidebar' => true,
        ];
        $menuSettings->value = json_encode($value);

        return $menuSettings->save();
    }
}