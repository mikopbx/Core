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

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\Util;

/**
 * Generates the configuration content for dongle.conf.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class ChanDongle extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'dongle.conf';

    /**
     * Generates the configuration content for dongle.conf.
     */
    protected function generateConfigProtected(): void
    {
        $conf = '[general]' . PHP_EOL .
            'interval=15' . PHP_EOL;

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/dongle.conf', $conf);
    }

    /**
     * Calculates the NCK code based on the given IMEI.
     *
     * @param string $imei The IMEI value.
     * @return int The calculated NCK code.
     */
    public static function getNckByImei(string $imei):int
    {
        $solt = substr(md5('hwe620datacard'), 8, 16);
        $hash = md5($imei.$solt);
        $len  = strlen($hash);
        $data = [ [], [], [], [] ];
        $ch = 0;
        for ($i=0; $i<$len ; $i+=2){
            $data[$ch][]=substr($hash, $i, 2);
            $ch++;
            if($ch >= count($data)){
                $ch=0;
            }
        }
        $hash2 = '';
        foreach ($data as $subData){
            $res = dechex(hexdec($subData[0]) ^ hexdec($subData[1]) ^ hexdec($subData[2]) ^ hexdec($subData[3]));
            if(strlen($res) === 1){
                $res = "0{$res}";
            }
            $hash2.=$res;
        }
        return hexdec($hash2) & hexdec('1ffffff') ^ hexdec('2000000');
    }
}