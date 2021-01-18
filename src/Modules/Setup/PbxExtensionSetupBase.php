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

use MikoPBX\Common\Providers\ModulesDBConnectionsProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\Common\Models\{PbxExtensionModules, PbxSettings};
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;
use Phalcon\Text;
use Throwable;

use function MikoPBX\Common\Config\appPath;

/**
 * Class PbxExtensionSetupBase
 * Общие для всех модулей методы
 * Подключается при установке, удалении модуля
 */
abstract class PbxExtensionSetupBase extends Injectable implements PbxExtensionSetupInterface
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
    protected string $moduleUniqueID;
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
     * Folder with module files
     *
     * @var string
     */
    protected string $moduleDir;

    /**
     * Phalcon config service
     *
     * @var \Phalcon\Config
     */
    protected $config;

    /**
     * License worker
     *
     * @var \MikoPBX\Service\License
     */
    protected $license;

    /**
     * Error and verbose messages
     *
     * @var array
     */
    protected array $messages;

    /**
     * PbxExtensionBase constructor.
     *
     * @param string $moduleUniqueID
     */
    public function __construct(string $moduleUniqueID)
    {
        $this->moduleUniqueID = $moduleUniqueID;
        $this->messages = [];
        $this->db      = $this->getDI()->getShared('db');
        $this->config  = $this->getDI()->getShared('config');
        $this->license =  $this->getDI()->getShared('license');
        $this->moduleDir = $this->config->path('core.modulesDir') . '/' . $this->moduleUniqueID;
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
            $this->fixFilesRights();
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
     * Copies files, creates folders and symlinks for module
     *
     * @return bool setup result
     */
    public function installFiles(): bool
    {
        // Create cache links for JS, CSS, IMG folders
        PbxExtensionUtils::createAssetsSymlinks($this->moduleUniqueID);

        // Create cache links for agi-bin scripts
        PbxExtensionUtils::createAgiBinSymlinks($this->moduleUniqueID);

        // Restore database settings
        $modulesDir          = $this->config->path('core.modulesDir');
        $backupPath = "{$modulesDir}/Backup/{$this->moduleUniqueID}";
        if (is_dir($backupPath)) {
            $cpPath = Util::which('cp');
            Processes::mwExec("{$cpPath} -r {$backupPath}/db/* {$this->moduleDir}/db/");
        }
        return true;
    }

    /**
     * Setup ownerships and folder rights
     *
     * @return bool
     */
    public function fixFilesRights(): bool
    {
        // Add regular www rights
        Util::addRegularWWWRights($this->moduleDir);
        $dirs = [
            "{$this->moduleDir}/agi-bin",
            "{$this->moduleDir}/bin"
        ];
        foreach ($dirs as $dir) {
            if(file_exists($dir) && is_dir($dir)){
                // Add executable right to module's binary
                Util::addExecutableRights($dir);
            }
        }

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
        return true;
    }

    /**
     * Последовательный вызов процедур установки модуля расширения
     * с результата удаления
     *
     * @param $keepSettings bool сохранять настройки модуля при удалении
     *
     * @return bool результат удаления
     */
    public function uninstallModule(bool $keepSettings = false): bool
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
     * @param  $keepSettings bool оставляет таблицу с данными своей модели
     *
     * @return bool результат очистки
     */
    public function unInstallDB(bool $keepSettings = false): bool
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
        $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
        if ($module) {
            $result = $result && $module->delete();
        }

        return $result;
    }

    /**
     * Выполняет удаление своих файлов с остановной процессов
     * при необходимости
     *
     * @param $keepSettings bool сохранять настройки
     *
     * @return bool результат удаления
     */
    public function unInstallFiles(bool $keepSettings = false):bool
    {
        $cpPath = Util::which('cp');
        $rmPath = Util::which('rm');
        $modulesDir          = $this->config->path('core.modulesDir');
        $backupPath = "{$modulesDir}/Backup/{$this->moduleUniqueID}";
        Processes::mwExec("{$rmPath} -rf {$backupPath}");
        if ($keepSettings) {
            Util::mwMkdir($backupPath);
            Processes::mwExec("{$cpPath} -r {$this->moduleDir}/db {$backupPath}/");
        }
        Processes::mwExec("{$rmPath} -rf {$this->moduleDir}");

        // Remove assets
        // IMG
        $imgCacheDir = appPath('sites/admin-cabinet/assets/img/cache');
        $moduleImageCacheDir = "{$imgCacheDir}/{$this->moduleUniqueID}";
        if (file_exists($moduleImageCacheDir)){
            unlink($moduleImageCacheDir);
        }

        // CSS
        $cssCacheDir = appPath('sites/admin-cabinet/assets/css/cache');
        $moduleCSSCacheDir = "{$cssCacheDir}/{$this->moduleUniqueID}";
        if (file_exists($moduleCSSCacheDir)){
            unlink($moduleCSSCacheDir);
        }

        // JS
        $jsCacheDir = appPath('sites/admin-cabinet/assets/js/cache');
        $moduleJSCacheDir = "{$jsCacheDir}/{$this->moduleUniqueID}";
        if (file_exists($moduleJSCacheDir)){
            unlink($moduleJSCacheDir);
        }

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
            $this->messages[] = "Module depends minimum PBX ver $this->min_pbx_version";

            return false;
        }

        $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
        if ( ! $module) {
            $module           = new PbxExtensionModules();
            $module->name     = $this->locString("Breadcrumb{$this->moduleUniqueID}");
            $module->disabled = '1';
        }
        $module->uniqid        = $this->moduleUniqueID;
        $module->developer     = $this->developer;
        $module->version       = $this->version;
        $module->description   = $this->locString("SubHeader{$this->moduleUniqueID}");
        $module->support_email = $this->support_email;

        return $module->save();
    }

    /**
     * Возвращает перевод идентификатора на язык установленный в настройках PBX
     *
     * @param $stringId string  идентификатор фразы
     *
     * @return string  перевод
     */
    public function locString(string $stringId): string
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

        // Add new connection for this module after add new Models folder
        ModulesDBConnectionsProvider::recreateModulesDBConnections();

        $results = glob($this->moduleDir . '/Models/*.php', GLOB_NOSORT);
        $dbUpgrade = new UpdateDatabase();
        foreach ($results as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "\\Modules\\{$this->moduleUniqueID}\\Models\\{$className}";
            $upgradeResult = $dbUpgrade->createUpdateDbTableByAnnotations($moduleModelClass);
            if (!$upgradeResult){
                return false;
            }

        }
        // Update database connections after upgrade their structure
        ModulesDBConnectionsProvider::recreateModulesDBConnections();

        return true;
    }


    /**
     * Добавляет модуль в боковое меню
     *
     * @return bool
     */
    public function addToSidebar(): bool
    {
        $menuSettingsKey           = "AdditionalMenuItem{$this->moduleUniqueID}";
        $unCamelizedControllerName = Text::uncamelize($this->moduleUniqueID, '-');
        $menuSettings              = PbxSettings::findFirstByKey($menuSettingsKey);
        if ($menuSettings === null) {
            $menuSettings      = new PbxSettings();
            $menuSettings->key = $menuSettingsKey;
        }
        $value               = [
            'uniqid'        => $this->moduleUniqueID,
            'href'          => "/admin-cabinet/{$unCamelizedControllerName}",
            'group'         => 'modules',
            'iconClass'     => 'puzzle',
            'caption'       => "Breadcrumb{$this->moduleUniqueID}",
            'showAtSidebar' => true,
        ];
        $menuSettings->value = json_encode($value);

        return $menuSettings->save();
    }
}