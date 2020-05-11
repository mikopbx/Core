<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2019
 */

namespace MikoPBX\Modules\Setup;

use MikoPBX\Core\Config\RegisterDIServices;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Common\Models\{PbxExtensionModules, PbxSettings};
use MikoPBX\Core\System\Util;
use Phalcon\Db\Adapter\Pdo\Sqlite;
use Phalcon\DI;
use Phalcon\Exception;
use Phalcon\Text;
use Throwable;

/**
 * Class PbxExtensionBase
 * Общие для всех модулей методы
 * Подключается при установке, удалении модуля
 */
abstract class PbxExtensionBase implements PbxExtensionSetupInterface
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
     * @var \Phalcon\Config
     */
    protected $config;

    /**
     * License worker
     *
     * @var \MikoPBX\Service\LicenseWorker
     */
    protected $licenseWorker;

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
     *
     * @throws \Phalcon\Exception
     */
    public function __construct($module_uniqid = null)
    {
        if ($module_uniqid !== null) {
            $this->module_uniqid = $module_uniqid;
        }
        $this->di      = DI::getDefault();
        $this->db      = $this->di->getShared('db');
        $this->config  = $this->di->getShared('config');
        $this->licenseWorker =  $this->di->getShared('licenseWorker');
        $this->moduleDir = $this->config->path('core.modulesDir') . '/' . $this->module_uniqid;
        $settings_file = "{$this->moduleDir}/module.json";
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

        $this->messages  = [];

        // Create and connect database
        $dbPath = "{$this->moduleDir}/db";

        if ( ! file_exists($dbPath) && ! mkdir($dbPath, 0777, true) && ! is_dir($dbPath)) {
            $this->messages[] = sprintf('Directory "%s" was not created', $dbPath);
            throw new Exception(sprintf('Directory "%s" was not created', $dbPath));
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
            $this->messages[] = $exception->getMessage();
        }

        return $result;
    }

    /**
     * Выполняет активацию триалов, проверку лицензионного клчюча
     *
     * @return bool результат активации лицензии
     */
    public function activateLicense(): bool
    {
        return true;
    }

    /**
     * Выполняет копирование необходимых файлов, в папки системы
     *
     * @return bool результат установки
     */
    public function installFiles(): bool
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
    public function fixRights(): bool
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
    public function installDB(): bool
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
            $this->messages[] = $exception->getMessage();
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
    public function unInstallDB($keepSettings = false): bool
    {
        return $this->unregisterModule();
    }

    /**
     * Удаляет запись о модуле из PbxExtensionModules
     *
     * @return bool результат очистки
     */
    public function unregisterModule(): bool
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
    public function unInstallFiles($keepSettings = false
    )//: bool Пока мешает удалять и обновлять старые модули, раскоменитровать после релиза 2020.5
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
    public function registerNewModule(): bool
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
    public function locString($stringId): string
    {
        $language             = substr(PbxSettings::getValueByKey('WebAdminLanguage'), 0, 2);
        $translates           = [];
        $extensionsTranslates = [[]];
        $results              = glob($this->moduleDir . '/{Messages}/en.php', GLOB_BRACE);
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
            $results              = glob($this->moduleDir . "/{Messages}/{$language}.php", GLOB_BRACE);
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
    public function createSettingsTableByModelsAnnotations(): bool
    {
        $result  = true;
        $results = glob($this->moduleDir . '/Models/*.php', GLOB_NOSORT);
        $dbUpgrade = new UpdateDatabase();
        foreach ($results as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "\\Modules\\{$this->module_uniqid}\\Models\\{$className}";
            $dbUpgrade->createUpdateDbTableByAnnotations($moduleModelClass);
        }

        // Подключаем db файлы модулей как севрисы в DI после пересоздания
        RegisterDIServices::recreateModulesDBConnections();

        return $result;
    }


    /**
     * Добавляет модуль в боковое меню
     *
     * @return bool
     */
    public function addToSidebar(): bool
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