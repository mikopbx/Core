<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

class HepConf extends CoreConfigClass
{
    protected string $description = 'cdr.conf';

    protected function generateConfigProtected(): void
    {
        $conf = "[general]\n" .
            "enabled=no\n" .
            "capture_address = 172.16.156.197:9060\n" .
            ";capture_password = foo\n" .
            "capture_id = 1234 \n";
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/hep.conf', $conf);
    }

    public static function reload()
    {
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'module reload res_hep.so'", $out);
    }
}