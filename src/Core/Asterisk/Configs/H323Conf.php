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


use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;

/**
 * Class H323Conf
 *
 * Represents a configuration class for H.323
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class H323Conf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'ooh323.conf';
    public const MODULE_NAME = 'chan_ooh323.so';

    /**
     * Generates the configuration for the ooh323.conf file.
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        $conf = "[general]" . PHP_EOL.
            'port=1720'. PHP_EOL.
            "bindaddr=0.0.0.0".PHP_EOL.
            "gatekeeper = DISABLE".PHP_EOL.
            "context=public-direct-dial".PHP_EOL.
            "disallow=all".PHP_EOL.
            "allow=ulaw".PHP_EOL.
            "allow=gsm".PHP_EOL.
            "dtmfmode=rfc2833".PHP_EOL.
            "directmedia=no".PHP_EOL.
            "directrtpsetup=no".PHP_EOL.
            PHP_EOL;

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/'. $this->description, $conf);
    }

    /**
     * Reloads the H.323 module.
     *
     * @return void
     */
    public static function reload():void
    {
        $h323 = new H323Conf();
        $h323->generateConfig();

        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'module reload ".self::MODULE_NAME."'");
    }

    /**
     * Generates the configuration line for the modules.conf file.
     *
     * @return string The generated configuration line.
     */
    public function generateModulesConf(): string
    {
        return 'load => '.self::MODULE_NAME.PHP_EOL;
    }
}