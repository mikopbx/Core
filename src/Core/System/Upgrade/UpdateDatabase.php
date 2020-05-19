<?php


namespace MikoPBX\Core\System\Upgrade;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Config\RegisterDIServices;
use Phalcon\Db\Column;
use Phalcon\Db\Index;
use Phalcon\Di;
use Phalcon\Di\Exception;
use ReflectionClass;
use ReflectionException;
use RuntimeException;


class UpdateDatabase
{
    /**
     * @var \Phalcon\Di\DiInterface|null
     */
    private $di;

    /**
     * @var \Phalcon\Config
     */
    private $config;

    /**
     * System constructor.
     *
     * @throws \Phalcon\Di\Exception
     */
    public function __construct()
    {
        $this->di     = Di::getDefault();
        if ($this->di === null){
            throw new Exception('\Phalcon\DI did not installed.');
        }
        $this->config = $this->di->getShared('config');
    }

    public function updateDatabaseStructure(): void
    {
        try {
            RegisterDIServices::recreateDBConnections(); // after storage remount
            $this->updateDbStructureByModelsAnnotations();
            RegisterDIServices::recreateDBConnections(); // if we change anything in structure
        } catch (RuntimeException $e) {
            echo "Errors within database upgrade process";
        }
    }

    /**
     * Обходит файлы с описанием моделей и создает таблицы в базе данных
     *
     * @return bool
     */
    private function updateDbStructureByModelsAnnotations(): bool
    {
        $result    = true;
        $modelsDir = $this->config->path('core.rootPath') . '/src/Common/Models';
        $results   = glob("{$modelsDir}/*.php", GLOB_NOSORT);
        foreach ($results as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "MikoPBX\\Common\\Models\\{$className}";
            $this->createUpdateDbTableByAnnotations($moduleModelClass);
        }

        return $result;
    }

    /**
     * Create, update DB structure by code description
     *
     * @param $modelClassName - class name with namespace
     *                        i.e. MikoPBX\Common\Models\Extensions or Modules\ModuleSmartIVR\Models\Settings
     *
     * @return bool
     */
    public function createUpdateDbTableByAnnotations($modelClassName): bool
    {
        $result = true;
        if (
            ! class_exists($modelClassName)
            || count(get_class_vars($modelClassName)) === 0) {
            return false;
        }
        // Test is abstract
        $reflection = new ReflectionClass($modelClassName);
        if ($reflection->isAbstract()) {
            return false;
        }

        $model                 = new $modelClassName();
        $connectionServiceName = $model->getReadConnectionService();
        if (empty($connectionServiceName)) {
            return false;
        }

        $connectionService = $this->di->getShared($connectionServiceName);
        $metaData          = $this->di->get('modelsMetadata');
        $table_structure   = [];
        $indexes           = [];

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
        $primaryKeys = $metaData->getPrimaryKeyAttributes($model);
        foreach ($primaryKeys as $attribute) {
            $indexes[$attribute] = new Index($attribute, [$attribute], 'UNIQUE');
        }

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

        // Create new table structure
        $columns = [];
        foreach ($table_structure as $colName => $colType) {
            $columns[] = new Column($colName, $colType);
        }

        $columnsNew = [
            'columns' => $columns,
            'indexes' => $indexes,
        ];
        $tableName  = $model->getSource();
        $connectionService->begin();

        if ( ! $connectionService->tableExists($tableName)) {
            Util::echoWithSyslog(' - UpdateDatabase: Create new table: '.$tableName);
            $result = $connectionService->createTable($tableName, '', $columnsNew);
        } else {
            // Table exists, we have to check/upgrade its structure
            $currentColumnsArr = $connectionService->describeColumns($tableName, '');

            if ($this->isTableStructureNotEqual($currentColumnsArr, $columns)) {
                Util::echoWithSyslog(' - UpdateDatabase: Upgrade table structure for: '.$tableName);
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
            }
        }


        if ($result) {
            $connectionService->commit();
        } else {
            Util::sysLogMsg('createUpdateDbTableByAnnotations', "Error: Failed on create/update table {$tableName}");
            $connectionService->rollback();
        }

        return $result;
    }

    /**
     * Compare database structure with metadata info
     *
     * @param $currentTableStructure
     * @param $newTableStructure
     *
     * @return bool
     */
    private function isTableStructureNotEqual($currentTableStructure, $newTableStructure): bool
    {
        //1. Check fields count
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

        //2. Check fields types
        foreach ($newTableStructure as $index => $newField) {
            $oldField = $currentTableStructure[$index];
            foreach ($comparedSettings as $compared_setting) {
                if ($oldField->$compared_setting() !== $newField->$compared_setting()) {
                    // Sqlite transform "1" to ""1"" in default settings, but it is normal
                    if ($compared_setting === 'getDefault'
                        && $oldField->$compared_setting() === '"' . $newField->$compared_setting() . '"') {
                        continue;
                    }

                    return true; // find different columns
                }
            }
        }

        return false;
    }
}