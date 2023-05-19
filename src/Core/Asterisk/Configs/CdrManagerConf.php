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
 * Generates the configuration content for cdr_manager.conf.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class CdrManagerConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'cdr_manager.conf';

    /**
     * Generates the configuration content for cdr_manager.conf.
     */
    protected function generateConfigProtected(): void
    {
        $conf = "[general]\n" .
            "enabled=yes\n" .
            "\n" .
            "[mappings]\n" .
            "linkedid => linkedid\n" .
            "recordingfile => recordingfile\n\n";

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . "/cdr_manager.conf", $conf);
    }
}