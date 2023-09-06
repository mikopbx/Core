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
 * Class SayConf
 *
 * This class represents the say.conf configuration file.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class SayConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'say.conf';

    /**
     * Generates the content for the say.conf file and writes it to the file.
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        $conf = '[general]'.PHP_EOL.
                'mode=old'.PHP_EOL.PHP_EOL.
                '[ru-ru]'.PHP_EOL.
                '_mi[n]uta:0 => num:${SAY}, digits/minutes'.PHP_EOL.
                '_mi[n]uta:1 => digits/1f, digits/minute'.PHP_EOL.
                '_mi[n]uta:2 => digits/2f, digits/minutes-i'.PHP_EOL.
                '_mi[n]uta:[3-4] => num:${SAY}, digits/minutes-i'.PHP_EOL.
                '_mi[n]uta:[5-9] => num:${SAY}, digits/minutes'.PHP_EOL.
                '_mi[n]uta:0X => minuta:${SAY:1}'.PHP_EOL.
                '_mi[n]uta:1X => num:${SAY}, digits/minutes'.PHP_EOL.
                '_mi[n]uta:[2-5]0 => num:${SAY}, digits/minutes'.PHP_EOL.
                '_mi[n]uta:[2-5][1-9] => num:${SAY:0:1}0, minuta:${SAY:1}'.PHP_EOL.
                ''.PHP_EOL.
                '_secu[n]da:0 => num:${SAY}, seconds'.PHP_EOL.
                '_secu[n]da:[5-9] => num:${SAY}, seconds'.PHP_EOL.
                '_secu[n]da:0X => secunda:${SAY:1}'.PHP_EOL.
                '_secu[n]da:1X => num:${SAY}, seconds'.PHP_EOL.
                '_secu[n]da:[2-5]0 => num:${SAY}, seconds'.PHP_EOL.
                ''.PHP_EOL.
                '_[n]um:0X => num:${SAY:1}'.PHP_EOL.
                '_[n]um:X => digits/${SAY}'.PHP_EOL.
                ''.PHP_EOL.
                '_[n]um:[1-2]f => digits/${SAY:0:1}f'.PHP_EOL.
                '_[n]um:[3-9]f => digits/${SAY:0:1}'.PHP_EOL.
                ''.PHP_EOL.
                '_[n]um:1X => digits/${SAY:0:2}'.PHP_EOL.
                '_[n]um:1Xf => digits/${SAY:0:2}'.PHP_EOL.
                ''.PHP_EOL.
                '_[n]um:[2-9]0 => digits/${SAY:0:2}'.PHP_EOL.
                '_[n]um:[2-9]0f => digits/${SAY:0:2}'.PHP_EOL.
                ''.PHP_EOL.
                '_[n]um:[2-9][1-2] => digits/${SAY:0:1}0, num:${SAY:1}'.PHP_EOL.
                '_[n]um:[2-9][1-2]f => digits/${SAY:0:1}0, num:${SAY:1}'.PHP_EOL.
                ''.PHP_EOL.
                '_[n]um:[2-9][3-9] => digits/${SAY:0:1}0, num:${SAY:1}'.PHP_EOL.
                '_[n]um:[2-9][3-9]f => digits/${SAY:0:1}0, num:${SAY:1}'.PHP_EOL.
                '';

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/say.conf', $conf);
    }
}