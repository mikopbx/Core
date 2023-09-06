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

namespace MikoPBX\Core\System\Upgrade;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\Common\Providers\ModelsAnnotationsProvider;
use MikoPBX\Common\Providers\ModelsMetadataProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use Phalcon\Db\Column;
use Phalcon\Db\Index;
use Phalcon\Di;
use ReflectionClass;

use Throwable;

use function MikoPBX\Common\Config\appPath;


/**
 * Class UpdateDatabase
 *
 * @package MikoPBX\Core\System\Upgrade
 * @property \Phalcon\Config config
 */
class UpdateDatabase extends Di\Injectable
{

    /**
     * Updates database structure according to models annotations
     */
    public function updateDatabaseStructure(): void
    {
        try {
            MainDatabaseProvider::recreateDBConnections(); // after storage remount
            $this->updateDbStructureByModelsAnnotations();
            MainDatabaseProvider::recreateDBConnections(); // if we change anything in structure
        } catch (Throwable $e) {
            Util::echoWithSyslog('Errors within database upgrade process '.$e->getMessage());
        }
    }

    /**
     *
     * Step by step goes by models annotations and apply structure changes
     *
     * @return void
     */
    private function updateDbStructureByModelsAnnotations(): void
    {
        $modelsDir = appPath('src/Common/Models');
        $results   = glob("{$modelsDir}/*.php", GLOB_NOSORT);
        foreach ($results as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "MikoPBX\\Common\\Models\\{$className}";
            try {
                $this->createUpdateDbTableByAnnotations($moduleModelClass);
            } catch (Throwable $exception){
                Util::echoWithSyslog('Errors within update table '.$className.' '.$exception->getMessage());
            }
        }
        $this->updatePermitCustomModules();
    }

    /**
     * https://github.com/mikopbx/Core/issues/173
     * @return void
     */
    private function updatePermitCustomModules():void
    {
        /**
         * Добавим права на файлы в директории модулей.
         */
        $modulesDir = $this->config->path('core.modulesDir');
        $findPath  = Util::which('find');
        $chownPath = Util::which('chown');
        $chmodPath = Util::which('chmod');
        Processes::mwExec("$findPath $modulesDir/*/*bin/ -type f -exec {$chmodPath} +x {} \;");
        Processes::mwExec("$chownPath -R www:www $modulesDir/*");
    }


    /**
     * Create, update DB structure by code description
     *
     * @param $modelClassName string class name with namespace
     *                        i.e. MikoPBX\Common\Models\Extensions or Modules\ModuleSmartIVR\Models\Settings
     *
     * @return bool
     */
    public function createUpdateDbTableByAnnotations(string $modelClassName): bool
    {
        $result = true;
        if (
            ! class_exists($modelClassName)
            || count(get_class_vars($modelClassName)) === 0) {
            return true;
        }
        // Test is abstract
        try {
            $reflection = new ReflectionClass($modelClassName);
            if ($reflection->isAbstract()) {
                return true;
            }
        } catch (Throwable $exception) {
            return false;
        }
        $model                 = new $modelClassName();
        $connectionServiceName = $model->getReadConnectionService();
        if (empty($connectionServiceName)) {
            return false;
        }

        $connectionService = $this->di->getShared($connectionServiceName);
        $metaData          = $this->di->get(ModelsMetadataProvider::SERVICE_NAME);
        $metaData->reset();

        //https://docs.phalcon.io/4.0/ru-ru/annotations
        $modelAnnotation = $this->di->get(ModelsAnnotationsProvider::SERVICE_NAME)->get($model);

        $tableName       = $model->getSource();
        $table_structure = [];
        $indexes         = [];

        // Create columns list by code annotations
        $newColNames       = $metaData->getAttributes($model);
        $previousAttribute = '';
        foreach ($newColNames as $attribute) {
            $table_structure[$attribute] = [
                'type'      => Column::TYPE_VARCHAR,
                'after'     => $previousAttribute,
                'notNull'   => false,
                'isNumeric' => false,
                'primary'   => false,
            ];
            $previousAttribute           = $attribute;
        }

        // Set data types
        $propertiesAnnotations = $modelAnnotation->getPropertiesAnnotations();
        if ($propertiesAnnotations !== false) {
            $attributeTypes = $metaData->getDataTypes($model);
            foreach ($attributeTypes as $attribute => $type) {
                $table_structure[$attribute]['type'] = $type;
                // Try to find size of field
                if (array_key_exists($attribute, $propertiesAnnotations)) {
                    $propertyDescription = $propertiesAnnotations[$attribute];
                    if ($propertyDescription->has('Column')
                        && $propertyDescription->get('Column')->hasArgument('length')
                    ) {
                        $table_structure[$attribute]['size'] = $propertyDescription->get('Column')->getArgument(
                            'length'
                        );
                    }
                }
            }
        }

        // For each numeric column change type
        $numericAttributes = $metaData->getDataTypesNumeric($model);
        foreach ($numericAttributes as $attribute => $value) {
            $table_structure[$attribute]['type']      = Column::TYPE_INTEGER;
            $table_structure[$attribute]['isNumeric'] = true;
        }

        // For each not nullable column change type
        $notNull = $metaData->getNotNullAttributes($model);
        foreach ($notNull as $attribute) {
            $table_structure[$attribute]['notNull'] = true;
        }

        // Set default values for initial save, later it fill at Models\ModelBase\beforeValidationOnCreate
        $defaultValues = $metaData->getDefaultValues($model);
        foreach ($defaultValues as $key => $value) {
            if ($value !== null) {
                $table_structure[$key]['default'] = $value;
            }
        }

        // Set primary keys
        // $primaryKeys = $metaData->getPrimaryKeyAttributes($model);
        // foreach ($primaryKeys as $attribute) {
        //     $indexes[$attribute] = new Index($attribute, [$attribute], 'UNIQUE');
        // }

        // Set bind types
        $bindTypes = $metaData->getBindTypes($model);
        foreach ($bindTypes as $attribute => $value) {
            $table_structure[$attribute]['bindType'] = $value;
        }

        // Find auto incremental column, usually it is ID column
        $keyFiled = $metaData->getIdentityField($model);
        if ($keyFiled) {
            unset($indexes[$keyFiled]);
            $table_structure[$keyFiled] = [
                'type'          => Column::TYPE_INTEGER,
                'notNull'       => true,
                'autoIncrement' => true,
                'primary'       => true,
                'isNumeric'     => true,
                'first'         => true,
            ];
        }

        // Some exceptions
        if ($modelClassName === PbxSettings::class) {
            $keyFiled = 'key';
            unset($indexes[$keyFiled]);
            $table_structure[$keyFiled] = [
                'type'          => Column::TYPE_VARCHAR,
                'notNull'       => true,
                'autoIncrement' => false,
                'primary'       => true,
                'isNumeric'     => false,
                'first'         => true,
            ];
        }

        // Create additional indexes
        $modelClassAnnotation = $modelAnnotation->getClassAnnotations();
        if ($modelClassAnnotation !== false
            && $modelClassAnnotation->has('Indexes')) {
            $additionalIndexes = $modelClassAnnotation->get('Indexes')->getArguments();
            foreach ($additionalIndexes as $index) {
                $indexName           = "i_{$tableName}_{$index['name']}";
                $indexes[$indexName] = new Index($indexName, $index['columns'], $index['type']);
            }
        }

        // Create new table structure
        $columns = [];
        foreach ($table_structure as $colName => $colType) {
            $columns[] = new Column($colName, $colType);
        }

        $columnsNew = [
            'columns' => $columns,
            'indexes' => $indexes,
        ];

        $connectionService->begin();

        if ( ! $connectionService->tableExists($tableName)) {
            $msg = ' - UpdateDatabase: Create new table: ' . $tableName . ' ';
            Util::echoWithSyslog($msg);
            $result = $connectionService->createTable($tableName, '', $columnsNew);
            Util::echoResult($msg);
        } else {
            // Table exists, we have to check/upgrade its structure
            $currentColumnsArr = $connectionService->describeColumns($tableName, '');

            if ($this->isTableStructureNotEqual($currentColumnsArr, $columns)) {
                $msg = ' - UpdateDatabase: Upgrade table: ' . $tableName . ' ';
                Util::echoWithSyslog($msg);
                // Create new table and copy all data
                $currentStateColumnList = [];
                $oldColNames            = []; // Старые названия колонок
                $countColumnsTemp       = count($currentColumnsArr);
                for ($k = 0; $k < $countColumnsTemp; $k++) {
                    $currentStateColumnList[$k] = $currentColumnsArr[$k]->getName();
                    $oldColNames[]              = $currentColumnsArr[$k]->getName();
                }

                // Create temporary clone on current table with all columns and date
                // Delete original table
                $gluedColumns = implode(',', $currentStateColumnList);
                $query        = "CREATE TEMPORARY TABLE {$tableName}_backup({$gluedColumns}); 
INSERT INTO {$tableName}_backup SELECT {$gluedColumns} FROM {$tableName}; 
DROP TABLE  {$tableName}";
                $result       = $result && $connectionService->execute($query);

                // Create new table with new columns structure
                $result = $result && $connectionService->createTable($tableName, '', $columnsNew);

                // Copy data from temporary table to newly created
                $newColumnNames  = array_intersect($newColNames, $oldColNames);
                $gluedNewColumns = implode(',', $newColumnNames);
                $result          = $result && $connectionService->execute(
                        "INSERT INTO {$tableName} ( {$gluedNewColumns}) SELECT {$gluedNewColumns}  FROM {$tableName}_backup;"
                    );

                // Drop temporary table
                $result = $result && $connectionService->execute("DROP TABLE {$tableName}_backup;");
                Util::echoResult($msg);
            }
        }


        if ($result) {
            $result = $this->updateIndexes($tableName, $connectionService, $indexes);
        }

        if ($result) {
            $result = $connectionService->commit();
        } else {
            Util::sysLogMsg('createUpdateDbTableByAnnotations', "Error: Failed on create/update table {$tableName}", LOG_ERR);
            $connectionService->rollback();
        }

        return $result;
    }

    /**
     * Compares database structure with metadata info
     *
     * @param $currentTableStructure
     * @param $newTableStructure
     *
     * @return bool
     */
    private function isTableStructureNotEqual($currentTableStructure, $newTableStructure): bool
    {
        // 1. Check fields count
        if (count($currentTableStructure) !== count($newTableStructure)) {
            return true;
        }

        $comparedSettings = [
            'getName',
            'getType',
            'getTypeReference',
            'getTypeValues',
            'getSize',
            'getScale',
            'isUnsigned',
            'isNotNull',
            'isPrimary',
            'isAutoIncrement',
            'isNumeric',
            'isFirst',
            'getAfterPosition',
            //'getBindType',
            'getDefault',
            'hasDefault',
        ];

        // 2. Check fields types
        foreach ($newTableStructure as $index => $newField) {
            $oldField = $currentTableStructure[$index];
            foreach ($comparedSettings as $compared_setting) {
                if ($oldField->$compared_setting() !== $newField->$compared_setting()) {
                    // Sqlite transform "1" to ""1"" in default settings, but it is normal
                    if ($compared_setting === 'getDefault'
                        && $oldField->$compared_setting() === '"' . $newField->$compared_setting() . '"') {
                        continue;
                    }

                    // Description for "length" is integer, but table structure store it as string
                    if ($compared_setting === 'getSize'
                        && (string)$oldField->$compared_setting() === (string)$newField->$compared_setting()) {
                        continue;
                    }

                    return true; // find different columns
                }
            }
        }

        return false;
    }


    /**
     * Updates indexes on database
     *
     * @param string $tableName
     * @param mixed  $connectionService DependencyInjection connection service used to read data
     * @param array  $indexes
     *
     * @return bool
     */
    private function updateIndexes(string $tableName, $connectionService, array $indexes): bool
    {
        $result         = true;
        $currentIndexes = $connectionService->describeIndexes($tableName);

        // Drop not exist indexes
        foreach ($currentIndexes as $indexName => $currentIndex) {
            if (stripos($indexName, 'sqlite_autoindex') === false
                && ! array_key_exists($indexName, $indexes)
            ) {
                $msg = " - UpdateDatabase: Delete index: {$indexName} ";
                Util::echoWithSyslog($msg);
                $result += $connectionService->dropIndex($tableName, '', $indexName);
                Util::echoResult($msg);
            }
        }

        // Add/update exist indexes
        foreach ($indexes as $indexName => $describedIndex) {
            if (array_key_exists($indexName, $currentIndexes)) {
                $currentIndex = $currentIndexes[$indexName];
                if ($describedIndex->getColumns() !== $currentIndex->getColumns()) {
                    $msg = " - UpdateDatabase: Update index: {$indexName} ";
                    Util::echoWithSyslog($msg);
                    $result += $connectionService->dropIndex($tableName, '', $indexName);
                    $result += $connectionService->addIndex($tableName, '', $describedIndex);
                    Util::echoResult($msg);
                }
            } else {
                $msg = " - UpdateDatabase: Add new index: {$indexName} ";
                Util::echoWithSyslog($msg);
                $result += $connectionService->addIndex($tableName, '', $describedIndex);
                Util::echoResult($msg);
            }
        }

        return $result;
    }
}