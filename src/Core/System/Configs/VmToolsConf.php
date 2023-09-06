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

use MikoPBX\Core\System\Util;

/**
 * Class VmToolsConf
 *
 * Represents the VmTools configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class VmToolsConf
{
    public const VMWARE = 'vmware';

    /**
     * Configure VM tools.
     *
     * @return bool
     */
    public function configure(): bool
    {
        $result = true;
        if (Util::isDocker()) {
            return $result;
        }
        $vars = [
            self::VMWARE => VMWareToolsConf::class
        ];
        $vendor = $this->getCpuVendor();
        $className = $vars[$vendor] ?? '';
        if (class_exists($className)) {
            $tools = new $className();
            $result = $tools->configure();
        }
        return $result;
    }

    /**
     * Get the CPU vendor.
     *
     * @return string
     */
    private function getCpuVendor(): string
    {
        $lsCpuPath = Util::which('lscpu');
        $grepPath = Util::which('grep');
        $awk = Util::which('awk');
        $result = shell_exec("$lsCpuPath | $grepPath vendor | $awk -F ' ' '{ print $3}'");
        return strtolower(trim($result));
    }
}