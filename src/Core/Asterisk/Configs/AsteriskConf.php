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


use MikoPBX\Core\System\Util;

class AsteriskConf extends CoreConfigClass
{
    protected string $description = 'asterisk.conf';

    protected function generateConfigProtected(): void
    {

        $lang = $this->generalSettings['PBXLanguage'];

        $conf = "[directories]\n" .
            "astetcdir => {$this->config->path('asterisk.astetcdir')}\n" .
            "astagidir => {$this->config->path('asterisk.astagidir')}\n" .
            "astkeydir => /etc/asterisk\n" .
            "astrundir => /var/asterisk/run\n" .
            "astmoddir => {$this->config->path('asterisk.astmoddir')}\n" .
            "astvarlibdir => {$this->config->path('asterisk.astvarlibdir')}\n" .
            "astdbdir => {$this->config->path('asterisk.astdbdir')}\n" .
            "astlogdir => {$this->config->path('asterisk.astlogdir')}\n" .
            "astspooldir => {$this->config->path('asterisk.astspooldir')}\n" .
            "\n" .
            "\n" .
            "[options]\n" .
            "verbose = 0\n" .
            "debug = 0\n" .
            "dumpcore = no\n" .
            "transcode_via_sln = no\n" .
            "hideconnect = yes\n" .
            "defaultlanguage = {$lang}\n" .
            "systemname = mikopbx\n";

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/asterisk.conf', $conf);
    }
}