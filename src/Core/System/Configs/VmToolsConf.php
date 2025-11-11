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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;

/**
 * Class VmToolsConf
 *
 * Represents the VmTools configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class VmToolsConf extends SystemConfigClass
{
    public const string PROC_NAME = 'vm-tools';
    public const string VMWARE = 'vmware';
    public const string KVM = 'kvm';
    public const string QEMU = 'qemu';

    private ?object $confObject = null;

    /**
     * Start the service monitored by Monit through a configuration object.
     *
     * This method checks if a configuration object (`$this->confObject`) is available.
     * If so, it:
     * - Restarts the service via Monit using `monitRestart()`
     * - Regenerates the Monit configuration file using `generateMonitConf()`
     *
     * @return bool True if the restart was successful (or no config object exists), false otherwise.
     */
    public function start(): bool
    {
        $result = true;
        if (System::isBooting()) {
            $this->configure();
            if ($this->confObject) {
                $this->confObject->start();
            }
        } else {
            $result = $this->reStart();
        }
        return $result;
    }

    /**
     * Restarts the service monitored by Monit through a configuration object.
     *
     * This method checks if a configuration object (`$this->confObject`) is available.
     * If so, it:
     * - Restarts the service via Monit using `monitRestart()`
     * - Regenerates the Monit configuration file using `generateMonitConf()`
     *
     * @return bool True if the restart was successful (or no config object exists), false otherwise.
     */
    public function reStart(): bool
    {
        $this->configure();
        $result = true;
        if ($this->confObject) {
            $result = $this->monitRestart();
            $this->generateMonitConf();

        }
        return $result;
    }

    /**
     * Configure VM tools.
     *
     * @return bool
     */
    private function configure(): bool
    {
        if (System::isDocker()) {
            return true;
        }
        $result = true;
        $vars = [
            self::VMWARE => VMWareToolsConf::class,
            self::KVM => QEMUGuestAgentConf::class,
            self::QEMU => QEMUGuestAgentConf::class,
        ];
        $hypervisor = $this->getHypervisor();
        $className = $vars[$hypervisor] ?? '';
        if (class_exists($className)) {
            $this->confObject = new $className();
            $result = $this->confObject->configure();
        }
        return $result;
    }

    /**
     * Generates and saves the Monit configuration using an external configuration object.
     *
     * This method checks if a configuration object (`$this->confObject`) is available.
     * If it is, it generates the Monit configuration by calling `getMonitConf()` on that object,
     * passing in the current class constant `self::VMWARE` as a parameter (likely representing
     * a service or platform name), then saves the result to a file.
     *
     * @return bool True if the configuration was successfully generated and saved, false otherwise.
     */
    public function generateMonitConf(): bool
    {
        // Skip VM tools service in Docker containers
        if (System::isDocker()) {
            $confPath = $this->getMainMonitConfFile();
            // Write empty config to ensure old configs are removed
            $this->saveFileContent($confPath, '');
            return true;
        }

        if (!$this->confObject) {
            $this->configure();
        }
        if (!$this->confObject) {
            return false;
        }
        $confPath = $this->getMainMonitConfFile();
        $conf = $this->confObject->getMonitConf(self::PROC_NAME);
        $this->saveFileContent($confPath, $conf);
        return true;
    }

    /**
     * Detect the hypervisor type using pbx-env-detect script.
     *
     * This method uses the centralized pbx-env-detect script which implements
     * a robust multi-stage detection strategy including DMI, CPU flags, and
     * hypervisor-specific checks.
     *
     * @return string Hypervisor type: 'vmware', 'kvm', 'qemu', or empty string if none detected.
     */
    private function getHypervisor(): string
    {
        // Use pbx-env-detect for reliable detection
        $pbxEnvDetect = '/sbin/pbx-env-detect';

        if (file_exists($pbxEnvDetect) && is_executable($pbxEnvDetect)) {
            $envOutput = [];
            Processes::mwExec("$pbxEnvDetect --type 2>/dev/null", $envOutput);
            $envType = strtolower(trim(implode('', $envOutput)));

            // Map environment types to hypervisor constants
            return match ($envType) {
                'vmware' => self::VMWARE,
                'kvm' => self::KVM,
                'qemu' => self::QEMU,
                'vbox', 'xen', 'docker' => '',  // Not supported by VmTools
                'baremetal' => '',  // Physical machine
                default => '',  // Unknown or virtual (generic)
            };
        }

        // No hypervisor detected
        return '';
    }
}