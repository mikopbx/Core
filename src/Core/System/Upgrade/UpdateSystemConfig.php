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

namespace MikoPBX\Core\System\Upgrade;

use MikoPBX\Common\Models\ModelsBase;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Configs\IptablesConf;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Modules\PbxExtensionUtils;
use Phalcon\Di;

use function MikoPBX\Common\Config\appPath;

class UpdateSystemConfig extends Di\Injectable
{

    private MikoPBXConfig $mikoPBXConfig;

    /**
     * System constructor.
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Updates settings after every new release
     */
    public function updateConfigs(): bool
    {
        $this->deleteLostModules();
        // Clear all caches on any changed models
        ModelsBase::clearCache(PbxSettings::class);
        $previous_version = (string)str_ireplace('-dev', '', $this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::PBX_VERSION));
        $current_version  = (string)str_ireplace('-dev', '', trim(file_get_contents('/etc/version')));
        if ($previous_version !== $current_version) {
            $upgradeClasses      = [];
            $upgradeClassesDir   = appPath('src/Core/System/Upgrade/Releases');
            $upgradeClassesFiles = glob($upgradeClassesDir . '/*.php', GLOB_NOSORT);
            foreach ($upgradeClassesFiles as $file) {
                $className        = pathinfo($file)['filename'];
                $moduleModelClass = "\\MikoPBX\\Core\\System\\Upgrade\\Releases\\{$className}";
                if (class_exists($moduleModelClass)) {
                    $upgradeClasses[$moduleModelClass::PBX_VERSION] = $moduleModelClass;
                }
            }
            uksort($upgradeClasses, [__CLASS__, "sortArrayByReleaseNumber"]);

            foreach ($upgradeClasses as $releaseNumber => $upgradeClass) {
                if (version_compare($previous_version, $releaseNumber, '<')) {
                    $processor = new $upgradeClass();
                    $processor->processUpdate();
                    $message = ' - UpdateConfigs: Upgrade system up to ' . $releaseNumber . ' ';
                    SystemMessages::echoStartMsg($message);
                    SystemMessages::echoResultMsg($message);
                }
            }

            $this->updateConfigEveryNewRelease();
            $this->mikoPBXConfig->setGeneralSettings(PbxSettingsConstants::PBX_VERSION, trim(file_get_contents('/etc/version')));
        }
        $storage = new Storage();
        $storage->moveReadOnlySoundsToStorage();
        $storage->copyMohFilesToStorage();
        return true;
    }

    /**
     * Deletes modules, not installed on the system
     */
    private function deleteLostModules(): void
    {
        /** @var \MikoPBX\Common\Models\PbxExtensionModules $modules */
        $modules = PbxExtensionModules::find();
        $modulesDir = $this->getDI()->getShared('config')->path('core.modulesDir');
        foreach ($modules as $module) {
            if ( ! is_dir("{$modulesDir}/{$module->uniqid}")) {
                $module->delete();
            }
        }
    }

    /**
     * Every new release routines
     */
    private function updateConfigEveryNewRelease(): void
    {
        PbxExtensionUtils::disableOldModules();
        IptablesConf::updateFirewallRules();
    }

    /**
     * Sorts array of upgrade classes by release numbers
     *
     * @param $a
     * @param $b
     *
     * @return int|bool
     */
    private function sortArrayByReleaseNumber($a, $b)
    {
        return version_compare($a, $b);
    }

}