<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\System\Configs\IptablesConf;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Modules\PbxExtensionUtils;
use Phalcon\Di\Injectable;

use function MikoPBX\Common\Config\appPath;

class UpdateSystemConfig extends Injectable
{
    public $isTheFirstMessage = true;

    /**
     * Updates settings after every new release
     */
    public function updateConfigs(): bool
    {
        $this->deleteLostModules();
        // Clear all caches on any changed models
        ModelsBase::clearCache(PbxSettings::class);
        $previous_version = (string)str_ireplace('-dev', '',  PbxSettings::getValueByKey(PbxSettings::PBX_VERSION));
        $current_version  = (string)str_ireplace('-dev', '', trim(file_get_contents('/etc/version')));
        if ($previous_version !== $current_version) {
            $upgradeClasses      = [];
            $upgradeClassesDir   = appPath('src/Core/System/Upgrade/Releases');
            $upgradeClassesFiles = glob($upgradeClassesDir . '/*.php', GLOB_NOSORT);
            foreach ($upgradeClassesFiles as $file) {
                $className        = pathinfo($file)['filename'];
                $upgradeClass = "\\MikoPBX\\Core\\System\\Upgrade\\Releases\\$className";
                if (class_exists($upgradeClass)) {
                    $upgradeClasses[$upgradeClass::PBX_VERSION] = $upgradeClass;
                }
            }
            uksort($upgradeClasses, [__CLASS__, "sortArrayByReleaseNumber"]);
            
            foreach ($upgradeClasses as $releaseNumber => $upgradeClass) {
                if (version_compare($previous_version, $releaseNumber, '<')) {
                    $processor = new $upgradeClass();
                    $processor->processUpdate();
                    $message = '   |- UpdateConfigs: Upgrade system up to ' . $releaseNumber;
                    $message = $this->publishMessage($message);
                    SystemMessages::echoResultMsg($message);
                }
            }

            $this->updateConfigEveryNewRelease();
            PbxSettings::setValueByKey(PbxSettings::PBX_VERSION, trim(file_get_contents('/etc/version')));
        }
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
            if (! is_dir("$modulesDir/$module->uniqid")) {
                $module->delete();
            }
        }
    }

    /**
     * Every new release routines
     */
    private function updateConfigEveryNewRelease(): void
    {
        // Disable old modules
        PbxExtensionUtils::disableOldModules();

        // Update firewall rules
        IptablesConf::updateFirewallRules();
        
        // Move read-only sounds to storage
        $storage = new Storage();
        $storage->moveReadOnlySoundsToStorage();

        // Copy MOH files to storage
        $storage->copyMohFilesToStorage();
    }

    /**
     * Sorts array of upgrade classes by release numbers
     *
     * @param $a
     * @param $b
     *
     * @return int|bool
     */
    private function sortArrayByReleaseNumber($a, $b): bool|int
    {
        return version_compare($a, $b);
    }


     /**
     * Publishes a message with PHP_EOL if the first message
     *
     * @param string $msg
     * @return string
     */
    private function publishMessage(string $msg): string
    {
        if ($this->isTheFirstMessage) {   
            $msg = PHP_EOL.$msg;
            $this->isTheFirstMessage = false;
        }
        SystemMessages::echoStartMsg($msg);
        return $msg;
    }
}
