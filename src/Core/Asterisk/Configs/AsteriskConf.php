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

use function MikoPBX\Common\Config\appPath;

class AsteriskConf extends ConfigClass
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
            "internal_timing = yes\n" .
            "hideconnect = yes\n" .
            "defaultlanguage = {$lang}\n" .
            "lockmode=flock\n" .
            "systemname = mikopbx\n";

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/asterisk.conf', $conf);
    }
}