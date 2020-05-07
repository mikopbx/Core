<?php


namespace MikoPBX\Core\System;


use MikoPBX\Common\Models\{AsteriskManagerUsers,
    Codecs,
    DialplanApplications,
    Extensions as ExtensionsModel,
    FirewallRules,
    IvrMenu,
    NetworkFilters,
    PbxExtensionModules,
    PbxSettings,
    Sip,
    SoundFiles};
use MikoPBX\Core\Config\RegisterDIServices;
use Phalcon\Db\Column;
use Phalcon\Db\Index;
use Phalcon\Di;
use ReflectionClass;
use ReflectionException;

class UpdateSystemConfig
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
     * @var MikoPBXConfig
     */
    private $mikoPBXConfig;

    /**
     * System constructor.
     */
    public function __construct()
    {
        $this->di     = Di::getDefault();
        $this->config = $this->di->getShared('config');
        // $this->mikoPBXConfig // only after update database!!!
    }

    public function updateDatabaseStructure(): void
    {
        try {
            RegisterDIServices::recreateDBConnections(); // after storage remount
            $this->updateDbStructureByModelsAnnotations();
            RegisterDIServices::recreateDBConnections(); // if we change anything in structure
        } catch (ReflectionException $e) {
            echo "Database conversion error";
        }
    }

    /**
     * Обходит файлы с описанием моделей и создает таблицы в базе данных
     *
     * @return bool
     * @throws \ReflectionException
     */
    private function updateDbStructureByModelsAnnotations(): bool
    {
        $result    = true;
        $modelsDir = $this->config->path('core.rootPath') . '/src/Common/Models';
        $results   = glob("{$modelsDir}/*.php", GLOB_NOSORT);
        foreach ($results as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "MikoPBX\\Common\\Models\\{$className}";
            // Test is abstract
            $reflection = new ReflectionClass($moduleModelClass);
            if ($reflection->isAbstract()) {
                continue;
            }
            $this->createUpdateDbTableByAnnotations($moduleModelClass);
        }

        return $result;
    }

    /**
     * Create, update DB structure by code description
     *
     * @param $modelClassName   - class name with namespace
     * i.e. MikoPBX\Common\Models\Extensions or Modules\ModuleSmartIVR\Models\Settings
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

        $model                 = new $modelClassName;
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
            $result = $connectionService->createTable($tableName, '', $columnsNew);
        } else {

            // Table exists, we have to check/upgrade its structure
            $currentColumnsArr = $connectionService->describeColumns($tableName, '');

            if ($this->isTableStructureNotEqual($currentColumnsArr, $columns)) {
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
                $result          = $result && $connectionService->execute("INSERT INTO {$tableName} ( {$gluedNewColumns}) SELECT {$gluedNewColumns}  FROM {$tableName}_backup;");

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

                    return true;  // find different columns
                }
            }
        }

        return false;
    }

    /**
     * Update settings after every new release
     */
    public function updateConfigs(): bool
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
        $previous_version    = str_ireplace('-dev','',$this->mikoPBXConfig->getGeneralSettings('PBXVersion'));
        $current_version     = str_ireplace('-dev','',trim(file_get_contents('/etc/version')));
        if ($previous_version !== $current_version) {
            if (version_compare($previous_version, '1.0.0', '<=')) {
                $this->fillInitialSettings();
                $previous_version = '1.0.1';
            }

            if (version_compare($previous_version, '6.2.110', '<')) {
                $this->updateConfigsUpToVer62110();
                $previous_version = '6.2.110';
            }

            if (version_compare($previous_version, '6.4', '<')) {
                $this->updateConfigsUpToVer64();
                $previous_version = '6.4';
            }

            if (version_compare($previous_version, '2020.1.62', '<')) {
                $this->updateConfigsUpToVer2020162();
                $previous_version = '2020.1.62';
            }

            if (version_compare($previous_version, '2020.2.314', '<')) {
                $this->updateConfigsUpToVer20202314();
                $previous_version = '2020.2.314';
            }

            //...add there new updates //

            $this->mikoPBXConfig->setGeneralSettings('PBXVersion', trim(file_get_contents('/etc/version')));
        }

        return true;
    }

    /**
     * First bootup
     */
    private function fillInitialSettings(): void
    {
        // Обновление конфигов. Это первый запуск системы.
        /** @var \MikoPBX\Common\Models\Sip $peers */
        /** @var \MikoPBX\Common\Models\Sip $peer */
        $peers = Sip::find('type="peer"');
        foreach ($peers as $peer) {
            $peer->secret = md5('' . time() . 'sip' . $peer->id);
            $peer->save();
        }

        /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $managers */
        /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $manager */
        $managers = AsteriskManagerUsers::find();
        foreach ($managers as $manager) {
            $manager->secret = md5('' . time() . 'manager' . $manager->id);
            $manager->save();
        }
    }


    /**
     * Upgrade from * to 6.2.110
     */
    private function updateConfigsUpToVer62110(): void
    {
        /** @var \MikoPBX\Common\Models\Codecs $codec_g722 */
        $codec_g722 = Codecs::findFirst('name="g722"');
        if ($codec_g722===null) {
            /** @var \MikoPBX\Common\Models\Codecs $codec_g722 */
            $codec_g722              = new Codecs();
            $codec_g722->name        = 'g722';
            $codec_g722->type        = 'audio';
            $codec_g722->description = 'G.722';
            $codec_g722->save();
        }

        /** @var \MikoPBX\Common\Models\IvrMenu $ivrs */
        /** @var \MikoPBX\Common\Models\IvrMenu $ivr */
        $ivrs = IvrMenu::find();
        foreach ($ivrs as $ivr) {
            if (empty($ivr->number_of_repeat)) {
                $ivr->number_of_repeat = 5;
                $ivr->save();
            }
            if (empty($ivr->timeout)) {
                $ivr->timeout = 7;
                $ivr->save();
            }
        }

        // Чистим мусор.
        /** @var \MikoPBX\Common\Models\PbxExtensionModules $modules */
        $modules = PbxExtensionModules::find();
        foreach ($modules as $module) {
            if ($module->version === '1.0' && empty($module->support_email) && 'МИКО' === $module->developer) {
                $modules->delete();
            }
        }
    }

    /**
     * Upgrade from 6.2.110 to 6.4
     */
    private function updateConfigsUpToVer64(): void
    {
        /** @var \MikoPBX\Common\Models\DialplanApplications $res */
        $app_number = '10000100';
        $app_logic  = base64_encode('1,Goto(voice_mail_peer,voicemail,1)');
        $d_app      = DialplanApplications::findFirst('extension="' . $app_number . '"');
        if ($d_app===null) {
            $d_app                   = new DialplanApplications();
            $d_app->applicationlogic = $app_logic;
            $d_app->extension        = $app_number;
            $d_app->description      = 'Voice Mail';
            $d_app->name             = 'VOICEMAIL';
            $d_app->type             = 'plaintext';
            $d_app->uniqid           = 'DIALPLAN-APPLICATION-' . md5(time());

            if ($d_app->save()) {
                $extension = ExtensionsModel::findFirst("number = '{$app_number}'");
                if ($extension===null) {
                    $extension                    = new ExtensionsModel();
                    $extension->number            = $app_number;
                    $extension->type              = 'DIALPLAN APPLICATION';
                    $extension->callerid          = $d_app->name;
                    $extension->show_in_phonebook = true;
                    $extension->save();
                }
            }
        } else {
            $d_app->applicationlogic = $app_logic;
            $d_app->type             = 'plaintext';
            $d_app->save();
        }
    }

    private function updateConfigsUpToVer2020162(): void
    {
        /** @var \MikoPBX\Common\Models\FirewallRules $rule */
        $result = FirewallRules::find();
        foreach ($result as $rule) {
            /** @var \MikoPBX\Common\Models\NetworkFilters $network_filter */
            $network_filter = NetworkFilters::findFirst($rule->networkfilterid);
            if ($network_filter===null) {
                // Это "битая" роль, необходимо ее удалить. Нет ссылки на подсеть.
                $rule->delete();
            }
        }

        // Корректировка AstDB
        $astdb_file = $this->config->path('astDatabase.dbfile');
        if (file_exists($astdb_file)) {
            // С переходом на PJSIP удалим статусы SIP.
            Util::mwExec("sqlite3  {$astdb_file} 'DELETE FROM astdb WHERE key LIKE \"/UserBuddyStatus/SIP%\"'");
        }

        PBX::checkCodec('ilbc', 'iLBC', 'audio');
        PBX::checkCodec('opus', 'Opus Codec', 'audio');

        $PrivateKey = $this->mikoPBXConfig->getGeneralSettings('WEBHTTPSPrivateKey');
        $PublicKey  = $this->mikoPBXConfig->getGeneralSettings('WEBHTTPSPublicKey');
        if (empty($PrivateKey) || empty($PublicKey)) {
            $certs = Util::generateSslCert();
            $this->mikoPBXConfig->setGeneralSettings('WEBHTTPSPrivateKey', $certs['PrivateKey']);
            $this->mikoPBXConfig->setGeneralSettings('WEBHTTPSPublicKey', $certs['PublicKey']);
        }


        $app_number = '10003246';
        $d_app      = DialplanApplications::findFirst('extension="' . $app_number . '"');
        if ($d_app===null) {
            $app_text                = '1,Answer()' . "\n" .
                'n,AGI(cdr_connector.php,${ISTRANSFER}dial_answer)' . "\n" .
                'n,Echo()' . "\n" .
                'n,Hangup()' . "\n";
            $d_app                   = new DialplanApplications();
            $d_app->applicationlogic = base64_encode($app_text);
            $d_app->extension        = $app_number;
            $d_app->description      = 'Echos audio and video back to the caller as soon as it is received. Used to test connection delay.';
            $d_app->name             = 'Echo test';
            $d_app->type             = 'plaintext';
            $d_app->uniqid           = 'DIALPLAN-APPLICATION-' . md5(time());

            if ($d_app->save()) {
                $extension = ExtensionsModel::findFirst("number = '{$app_number}'");
                if ($extension===null) {
                    $extension                    = new ExtensionsModel();
                    $extension->number            = $app_number;
                    $extension->type              = 'DIALPLAN APPLICATION';
                    $extension->callerid          = $d_app->name;
                    $extension->show_in_phonebook = true;
                    $extension->save();
                }
            }
        }
    }

    /**
     * Update to 2020.2.314
     */
    private function updateConfigsUpToVer20202314():void
    {
        // Add custom category to all sound files
        $soundFiles = SoundFiles::find();
        foreach ($soundFiles as $sound_file){
            $sound_file->category = SoundFiles::CATEGORY_CUSTOM;
            $sound_file->update();
        }

        // Add moh files to db and copy them to storage
        $oldMohDir  = $this->config->path('asterisk.astvarlibdir').'/sounds/moh';
        $currentMohDir  = $this->config->path('asterisk.mohdir');
        if (!Util::mwMkdir($currentMohDir)){
            return;
        }
        $files = scandir($oldMohDir);
        foreach ($files as $file) {
            if (in_array($file, ['.','..'])) continue;
            if (copy($oldMohDir.'/'.$file, $currentMohDir.'/'.$file)){
                $sound_file = new SoundFiles();
                $sound_file->path = $currentMohDir.'/'.$file;
                $sound_file->category=SoundFiles::CATEGORY_MOH;
                $sound_file->name=$file;
                $sound_file->save();
            }
        }

        // Remove old cache folders
        $mediaMountPoint = $this->config->path('core.mediaMountPoint');
        $oldCacheDirs= [
            "$mediaMountPoint/mikopbx/cache_js_dir",
            "$mediaMountPoint/mikopbx/cache_img_dir",
            "$mediaMountPoint/mikopbx/cache_css_dir"
        ];
        foreach ($oldCacheDirs as $old_cache_dir) {
            if (is_dir($old_cache_dir)){
                Util::mwExec("rm -rf $old_cache_dir");
            }
        }
    }

}