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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * Class NTPConf
 *
 * Represents the NTP configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class NTPConf extends Injectable
{
    /**
     * Configures the NTP daemon conf file.
     *
     * @return void
     */
    public static function configure(): void
    {
        $ntp_servers = PbxSettings::getValueByKey(PbxSettingsConstants::NTP_SERVER);
        $ntp_servers = preg_split('/\r\n|\r|\n| /', $ntp_servers);
        $ntp_conf = '';
        foreach ($ntp_servers as $ntp_server){
            if ( ! empty($ntp_server)) {
                $ntp_conf .= "server {$ntp_server}".PHP_EOL;
            }
        }
        if ($ntp_conf==='') {
            $ntp_conf = 'server 0.pool.ntp.org
server 1.pool.ntp.org
server 2.pool.ntp.org';
        }
        Util::fileWriteContent('/etc/ntp.conf', $ntp_conf);
        if (Util::isSystemctl()) {
            $systemctlPath = Util::which('systemctl');
            Processes::mwExec("{$systemctlPath} restart ntp");
        } else {
            // T2SDE or Docker
            Processes::killByName("ntpd");
            usleep(500000);
            $manual_time = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_MANUAL_TIME_SETTINGS);
            if ($manual_time !== '1') {
                $ntpdPath = Util::which('ntpd');
                Processes::mwExec($ntpdPath);
                Processes::mwExecBg("$ntpdPath -q");
            }
        }
    }
}
