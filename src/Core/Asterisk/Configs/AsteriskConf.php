<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;

class AsteriskConf extends ConfigClass
{
    protected $description = 'asterisk.conf';

    protected function generateConfigProtected(): void
    {
        $dirsConfig = $this->di->getShared('config');

        $lang = $this->generalSettings['PBXLanguage'];
        $conf = "[directories]\n" .
            "astetcdir => /etc/asterisk\n" .
            "astagidir => {$dirsConfig->path('asterisk.astagidir')}\n" .
            "astkeydir => /etc/asterisk\n" .
            "astrundir => /var/asterisk/run\n" .
            "astmoddir => {$dirsConfig->path('asterisk.astmoddir')}\n" .
            "astvarlibdir => {$dirsConfig->path('asterisk.astvarlibdir')}\n" .
            "astdbdir => {$dirsConfig->path('asterisk.astdbdir')}\n" .
            "astlogdir => {$dirsConfig->path('asterisk.astlogdir')}\n" .
            "astspooldir => {$dirsConfig->path('asterisk.astspooldir')}\n" .
            "\n" .
            "\n" .
            "[options]\n" .
            "verbose = 0\n" .
            "debug = 0\n" .
            "dumpcore = no\n" .
            "internal_timing = yes\n" .
            "hideconnect = yes\n" .
            "defaultlanguage = {$lang}\n" .
            "lockmode=flock\n" .
            "systemname = mikopbx\n";

        Util::fileWriteContent($this->astConfDir . '/asterisk.conf', $conf);
    }
}