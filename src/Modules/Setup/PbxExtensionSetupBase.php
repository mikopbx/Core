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
 * Common procedures for module installation and removing
 *
 * @property \MikoPBX\Common\Providers\LicenseProvider license
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
abstract class PbxExtensionSetupBase extends Injectable implements PbxExtensionSetupInterface
{
    /**
     * Module unique identify from the module.json
     * @var string
     */
    protected string $moduleUniqueID;

    /**
     * Module version from the module.json
     * @var string
     */
    protected $version;

    /**
     * Minimal required version PBX from the module.json
     * @var string
     */
    protected $min_pbx_version;

    /**
     * Module developer name  from the module.json
     * @var string
     */
    protected $developer;

    /**
     * Module developer's email from module.json
     * @var string
     */
    protected $support_email;

    /**
     * PBX core general database
     * @var \Phalcon\Db\Adapter\Pdo\Sqlite
     */
    protected $db;

    /**
     * Folder with module files
     * @var string
     */
    protected string $moduleDir;

    /**
     * Phalcon config service
     * @var \Phalcon\Config
     */
    protected $config;

    /**
     * Error and verbose messages
     * @var array
     */
    protected array $messages;

    /**
     * License worker
     * @var \MikoPBX\Service\License
     */
    protected $license;

    /**
     * Trial product version identify number from the module.json
     * @var int
     */
    public $lic_product_id;

    /**
     * License feature identify number from the module.json
     * @var int
     */
    public $lic_feature_id;

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
     * The main module installation function called by PBXCoreRest after unzip module files
     * It calls some private functions and setup error messages on the message variable
     *
     * @return bool - result of installation
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
            if ( ! $this->fixFilesRights()) {
                $this->messages[] = ' Apply files rights error';
                $result           = false;
            }
        } catch (Throwable $exception) {
            $result         = false;
            $this->messages[] = $exception->getMessage();
        }

        return $result;
    }

    /**
     * Executes license activation only for commercial modules
     *
     * @return bool result of license activation
     */
    public function activateLicense(): bool
    {
        return true;
    }

    /**
     * Copies files, creates folders and symlinks for module and restores previous backup settings
     *
     * @return bool installation result
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
     * Setups ownerships and folder rights
     *
     * @return bool fixing result
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
     * Creates database structure according to models annotations
     *
     * If it necessary, it fills some default settings, and change sidebar menu item representation for this module
     *
     * After installation it registers module on PbxExtensionModules model
     *
     * @return bool result of installation
     */
    public function installDB(): bool
    {
        $result = $this->createSettingsTableByModelsAnnotations();

        if ($result) {
            $result = $this->registerNewModule();
        }

        if ($result) {
            $result = $this->addToSidebar();
        }
        return $result;
    }


    /**
     * The main function called by MikoPBX REST API for delete any module
     *
     * @param $keepSettings bool if it set to true, the function saves module database
     *
     * @return bool uninstall result
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
     * Deletes some settings from database and links to the module
     * If keepSettings set to true it copies database file to Backup folder
     *
     * @param  $keepSettings bool
     *
     * @return bool the uninstall result
     */
    public function unInstallDB(bool $keepSettings = false): bool
    {
        return $this->unregisterModule();
    }

    /**
     * Deletes records from PbxExtensionModules
     *
     * @return bool  unregistration result
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
     * Deletes the module files, folders, symlinks
     * If keepSettings set to true it copies database file to Backup folder
     *
     * @param $keepSettings bool
     *
     * @return bool delete result
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
     * Registers module in the PbxExtensionModules table
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
            $module->name     = $this->translation->_("Breadcrumb{$this->moduleUniqueID}");
            $module->disabled = '1';
        }
        $module->uniqid        = $this->moduleUniqueID;
        $module->developer     = $this->developer;
        $module->version       = $this->version;
        $module->description   = $this->translation->_("SubHeader{$this->moduleUniqueID}");
        $module->support_email = $this->support_email;

        return $module->save();
    }

    /**
     * DEPRECATED
     * Returns translated phrase
     *
     * @param $stringId string  Phrase identifier
     *
     * @return string  перевод
     */
    public function locString(string $stringId): string
    {
        Util::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);
        return $this->translation->_($stringId);
    }

    /**
     * Traverses files with model descriptions and creates / modifies tables in the system database
     *
     * @return bool the table modification result
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
     * Adds module to sidebar menu
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