<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\Common\Models\{PbxExtensionModules, PbxSettings, PbxSettingsConstants};
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;
use Throwable;

use function MikoPBX\Common\Config\appPath;


/**
 * Base class for module setup.
 * Common procedures for module installation and removing external modules.
 *
 * @property \MikoPBX\Common\Providers\MarketPlaceProvider license
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property \Phalcon\Config\Adapter\Json config
 *
 *  @package MikoPBX\Modules\Setup
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
     * @var string|null
     */
    protected $version;

    /**
     * Minimal required version PBX from the module.json
     * @var string
     */
    protected string $min_pbx_version;

    /**
     * Module developer name  from the module.json
     * @var string|null
     */
    protected $developer;

    /**
     * Module developer's email from module.json
     * @var string|null
     */
    protected $support_email;

    /**
     * PBX core general database
     * @var \Phalcon\Db\Adapter\Pdo\Sqlite|null
     */
    protected $db;

    /**
     * Folder with module files
     * @var string
     */
    protected string $moduleDir;

    /**
     * Phalcon config service
     * @var \Phalcon\Config|null
     */
    protected $config;

    /**
     * Error and verbose messages
     * @var array
     */
    protected array $messages;

    /**
     * License worker
     * @var \MikoPBX\Service\License|null
     */
    protected $license;

    /**
     * Trial product version identify number from the module.json
     * @var int|null
     */
    public $lic_product_id;

    /**
     * License feature identify number from the module.json
     * @var int|null
     */
    public $lic_feature_id;

    /**
     * Array of wiki links
     * @var array
     */
    public array $wiki_links = [];

    /**
     * Constructor for the module class.
     *
     * @param string $moduleUniqueID The unique identifier of the module.
     */
    public function __construct(string $moduleUniqueID)
    {
        // Set the module unique ID
        $this->moduleUniqueID = $moduleUniqueID;

        // Initialize properties
        $this->messages = [];
        $this->db      = $this->getDI()->getShared('db');
        $this->config  = $this->getDI()->getShared('config');
        $this->license =  $this->getDI()->getShared('license');
        $this->moduleDir = $this->config->path('core.modulesDir') . '/' . $this->moduleUniqueID;

        // Load module settings from module.json file
        $settings_file = "{$this->moduleDir}/module.json";
        if (file_exists($settings_file)) {
            $module_settings = json_decode(file_get_contents($settings_file), true);
            if ($module_settings) {
                // Extract module settings
                $this->version         = $module_settings['version'];
                $this->min_pbx_version = $module_settings['min_pbx_version']??'';
                $this->developer       = $module_settings['developer'];
                $this->support_email   = $module_settings['support_email'];

                // Check if license product ID is defined in module settings
                if (array_key_exists('lic_product_id', $module_settings)) {
                    $this->lic_product_id = $module_settings['lic_product_id'];
                } else {
                    $this->lic_product_id = 0;
                }

                // Check if license feature ID is defined in module settings
                if (array_key_exists('lic_feature_id', $module_settings)) {
                    $this->lic_feature_id = $module_settings['lic_feature_id'];
                } else {
                    $this->lic_feature_id = 0;
                }

                // Extract wiki links from module settings
                $wiki_links = $module_settings['wiki_links']??[];
                if(is_array($wiki_links)){
                    $this->wiki_links = $wiki_links;
                }
            } else {
                $this->messages[] = $this->translation->_("ext_ErrorOnDecodeModuleJson",['filename'=>'module.json']);
            }
        }

        // Reset messages array
        $this->messages  = [];
    }

    /**
     * Performs the main module installation process called by PBXCoreRest after unzipping module files.
     * It invokes private functions and sets up error messages in the message variable.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#installmodule
     *
     * @return bool The result of the installation process.
     */
    public function installModule(): bool
    {
        try {
            if (!$this->checkCompatibility()){
                return false;
            }
            if (!$this->activateLicense()) {
                $this->messages[] = $this->translation->_("ext_ErrorOnLicenseActivation");
                return false;
            }
            if ( ! $this->installFiles()) {
                $this->messages[] = $this->translation->_("ext_ErrorOnInstallFiles");
                return false;
            }
            if ( ! $this->installDB()) {
                $this->messages[] = $this->translation->_("ext_ErrorOnInstallDB");
                return false;
            }
            if ( ! $this->fixFilesRights()) {
                $this->messages[] = $this->translation->_("ext_ErrorOnAppliesFilesRights");
                return false;
            }

            // Recreate version hash for js files and translations
            PBXConfModulesProvider::getVersionsHash(true);

        } catch (Throwable $exception) {
            $this->messages[] = $exception->getMessage();
            return false;
        }

        return true;
    }

    /**
     * Checks if the current PBX version is compatible with the minimum required version.
     *
     * This function compares the current PBX version with the minimum required version
     * specified by the module. If the current version is lower than the minimum required
     * version, it adds a message to the `messages` array and returns `false`. Otherwise,
     * it returns `true`, indicating that the PBX version is compatible.
     *
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#checkcompatibility
     *
     * @return bool Returns `true` if PBX version is compatible; otherwise, `false`.
     */
    public function checkCompatibility():bool
    {
        // Get the current PBX version from the settings.
        $currentVersionPBX = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_VERSION);

        // Remove any '-dev' suffix from the version.
        $currentVersionPBX = str_replace('-dev', '', $currentVersionPBX);
        if (version_compare($currentVersionPBX, $this->min_pbx_version) < 0) {
            // The current PBX version is lower than the required version.
            // Add a message indicating the compatibility issue.
            $this->messages[] = $this->translation->_("ext_ModuleDependsHigherVersion",['version'=>$this->min_pbx_version]);

            // Return false to indicate incompatibility.
            return false;
        }

        // The current PBX version is compatible.
        return true;
    }

    /**
     * Activates the license, applicable only for commercial modules.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#activatelicense
     *
     * @return bool The result of the license activation.
     */
    public function activateLicense(): bool
    {
        if($this->lic_product_id>0) {
            $lic = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_LICENSE);
            if (empty($lic)) {
                $this->messages[] = $this->translation->_("ext_EmptyLicenseKey");
                return false;
            }

            // Get trial license for the module
            $this->license->addtrial($this->lic_product_id);
        }
        return true;
    }

    /**
     * Copies files, creates folders, and symlinks for the module and restores previous backup settings.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#installfiles
     *
     * @return bool The result of the installation process.
     */
    public function installFiles(): bool
    {
        // Create cache links for JS, CSS, IMG folders
        PbxExtensionUtils::createAssetsSymlinks($this->moduleUniqueID);

        // Create links for the module view templates
        PbxExtensionUtils::createViewSymlinks($this->moduleUniqueID);

        // Create links for agi-bin scripts
        PbxExtensionUtils::createAgiBinSymlinks($this->moduleUniqueID);

        // Restore database settings
        $modulesDir          = $this->config->path('core.modulesDir');
        $backupPath = "{$modulesDir}/Backup/{$this->moduleUniqueID}";
        if (is_dir($backupPath)) {
            $cpPath = Util::which('cp');
            Processes::mwExec("{$cpPath} -r {$backupPath}/db/* {$this->moduleDir}/db/");
        }

        // Volt
        $this->cleanupVoltCache();

        return true;
    }

    /**
     * Sets up ownerships and folder rights.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#fixfilesrights
     *
     * @return bool The result of the fixing process.
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
     * Creates the database structure according to models' annotations.
     * If necessary, it fills some default settings and changes the sidebar menu item representation for this module.
     * After installation, it registers the module on the PbxExtensionModules model.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#fixfilesrights
     *
     * @return bool The result of the installation process.
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
     * Performs the main module uninstallation process called by MikoPBX REST API to delete any module.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#uninstallmodule
     *
     * @param bool $keepSettings If set to true, the function saves the module database.
     *
     * @return bool The result of the uninstallation process.
     */
    public function uninstallModule(bool $keepSettings = false): bool
    {
        $result = true;
        try {
            if ( ! $this->unInstallDB($keepSettings)) {
                $this->messages[] = $this->translation->_("ext_UninstallDBError");
                $result           = false;
            }
            if ($result && ! $this->unInstallFiles($keepSettings)) {
                $this->messages[] = $this->translation->_("ext_UnInstallFiles");
                $result           = false;
            }

            // Recreate version hash for js files and translations
            PBXConfModulesProvider::getVersionsHash(true);

        } catch (Throwable $exception) {
            $result         = false;
            $this->messages[] = $exception->getMessage();
        }

        return $result;
    }

    /**
     * Deletes some settings from the database and links to the module.
     * If $keepSettings is set to true, it copies the database file to the Backup folder.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#uninstalldb
     *
     * @param bool $keepSettings If set to true, the module database is saved.
     *
     * @return bool The result of the uninstallation process.
     */
    public function unInstallDB(bool $keepSettings = false): bool
    {
        return $this->unregisterModule();
    }

    /**
     * Deletes records from the PbxExtensionModules table.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#unregistermodule
     *
     * @return bool The result of the uninstallation process.
     */
    public function unregisterModule(): bool
    {
        $result = true;
        $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueID);
        if ($module !== null) {
            $result = $module->delete();
        }

        return $result;
    }

    /**
     * Deletes the module files, folders, and symlinks.
     * If $keepSettings is set to true, it copies the database file to the Backup folder.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#uninstallfiles
     *
     * @param bool $keepSettings If set to true, the module database is saved.
     *
     * @return bool The result of the deletion process.
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

        // Volt
        $this->cleanupVoltCache();

        return true;
    }

    /**
     * Returns error messages.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#getmessages
     *
     * @return array An array of error messages.
     */
    public function getMessages(): array
    {
        return $this->messages;
    }

    /**
     * Registers the module in the PbxExtensionModules table.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#registernewmodule
     *
     * @return bool The result of the registration process.
     */
    public function registerNewModule(): bool
    {
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

        try {
            $module->wiki_links = json_encode($this->wiki_links, JSON_THROW_ON_ERROR);
        }catch (\JsonException $e){
            SystemMessages::sysLogMsg(__CLASS__, $e->getMessage());
        }

        return $module->save();
    }

    /**
     * Traverses files with model descriptions and creates/alters tables in the system database.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#createsettingstablebymodelsannotations
     *
     * @return bool The result of the table modification process.
     */
    public function createSettingsTableByModelsAnnotations(): bool
    {

        // Add new connection for this module after add new Models folder
        ModulesDBConnectionsProvider::recreateModulesDBConnections();

        $results = glob($this->moduleDir . '/Models/*.php', GLOB_NOSORT);
        $dbUpgrade = new UpdateDatabase();
        foreach ($results as $file) {
            $className        = pathinfo($file)['filename'];
            $moduleModelClass = "Modules\\{$this->moduleUniqueID}\\Models\\{$className}";
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
     * Adds the module to the sidebar menu.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#addtosidebar
     *
     * @return bool The result of the addition process.
     */
    public function addToSidebar(): bool
    {
        $menuSettingsKey           = "AdditionalMenuItem{$this->moduleUniqueID}";
        $menuSettings              = PbxSettings::findFirstByKey($menuSettingsKey);
        if ($menuSettings === null) {
            $menuSettings      = new PbxSettings();
            $menuSettings->key = $menuSettingsKey;
        }
        $value               = [
            'uniqid'        => $this->moduleUniqueID,
            'group'         => 'modules',
            'iconClass'     => 'puzzle',
            'caption'       => "Breadcrumb{$this->moduleUniqueID}",
            'showAtSidebar' => true,
        ];
        $menuSettings->value = json_encode($value);

        return $menuSettings->save();
    }

    /**
     * Deletes volt cache files.
     *
     * @return void
     */
    private function cleanupVoltCache():void
    {
        $cacheDirs = [];
        $cacheDirs[] = $this->config->path('adminApplication.voltCacheDir');
        $rmPath = Util::which('rm');
        foreach ($cacheDirs as $cacheDir) {
            if (!empty($cacheDir)) {
                Processes::mwExec("{$rmPath} -rf {$cacheDir}/*");
            }
        }
    }

    /**
     * Deprecated function to return translated phrases.
     *
     * @param string $stringId The phrase identifier.
     *
     * @return string The translated phrase.
     * @deprecated
     */
    public function locString(string $stringId): string
    {
        SystemMessages::sysLogMsg('Util', 'Deprecated call ' . __METHOD__ . ' from ' . static::class, LOG_DEBUG);
        return $this->translation->_($stringId);
    }
}