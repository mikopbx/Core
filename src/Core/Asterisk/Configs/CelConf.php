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
 * Generates the configuration content for cel.conf and cel_beanstalkd.conf.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class CelConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    public const BEANSTALK_TUBE = 'asterisk-cel';
    protected string $description = 'cel.conf';

    /**
     * Generates the configuration content for cel.conf and cel_beanstalkd.conf
     */
    protected function generateConfigProtected(): void
    {
        $config = $this->getDI()->get('config')->beanstalk;

        $conf = "[general]\n" .
            "enable=yes\n" .
            "events=USER_DEFINED,ANSWER,ATTENDEDTRANSFER\n" .
            "dateformat = %F %T\n\n" .
            "[manager]\n" .
            "enabled = yes\n\n";

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/cel.conf', $conf);

        $conf = "[general]" .PHP_EOL.
                "enabled = yes" .PHP_EOL.
                "host = 127.0.0.1" .PHP_EOL.
                "port = ".$config->port .PHP_EOL.
                "priority = 1" .PHP_EOL.
                "tube = asterisk-cel".PHP_EOL;

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/cel_beanstalkd.conf', $conf);

    }
}