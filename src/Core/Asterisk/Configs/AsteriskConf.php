<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Di;

/**
 * Represents the AsteriskConf class responsible for generating asterisk.conf configuration file.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class AsteriskConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'asterisk.conf';

    /**
     * Generates the protected configuration content.
     */
    protected function generateConfigProtected(): void
    {
        $lang = PbxSettings::getValueByKey(PbxSettings::PBX_LANGUAGE);
        $astetcdir = Directories::getDir(Directories::AST_ETC_DIR);
        $astagidir = Directories::getDir(Directories::AST_AGI_BIN_DIR);
        $astkeydir = $astetcdir;
        $astrundir = '/var/asterisk/run';
        $astmoddir = Directories::getDir(Directories::AST_MOD_DIR);
        $astvarlibdir = Directories::getDir(Directories::AST_VAR_LIB_DIR);
        $astdbdir = Directories::getDir(Directories::AST_DB_DIR);
        $astlogdir = Directories::getDir(Directories::AST_LOG_DIR);
        $astspooldir = Directories::getDir(Directories::AST_SPOOL_DIR);



        // Build the configuration content
        $conf = "[directories]\n" .
            "astetcdir => {$astetcdir}\n" .
            "astagidir => {$astagidir}\n" .
            "astkeydir => {$astkeydir}\n" .
            "astrundir => {$astrundir}\n" .
            "astmoddir => {$astmoddir}\n" .
            "astvarlibdir => {$astvarlibdir}\n" .
            "astdbdir => {$astdbdir}\n" .
            "astlogdir => {$astlogdir}\n" .
            "astspooldir => {$astspooldir}\n" .
            "astdatadir => {$astvarlibdir}\n" .
            "\n" .
            "\n" .
            "[options]\n" .
            "verbose = 0\n" .
            "debug = 0\n" .
            "dumpcore = no\n" .
            "transcode_via_sln = no\n" .
            "hideconnect = yes\n" .
            "defaultlanguage = $lang\n" .
            "systemname = mikopbx\n";

        // Write the configuration content to the file
        $this->saveConfig($conf, $this->description);

        $logCmdFile  = self::getLogFile();
        if (!file_exists($logCmdFile)) {
            file_put_contents($logCmdFile, '');
        }
        $cmdFileLink = '/root/.asterisk_history';
        if (!file_exists($cmdFileLink)) {
            Util::createUpdateSymlink($logCmdFile, $cmdFileLink, true);
        }

        $chownPath = Util::which('chown');
        shell_exec("$chownPath -R www:www $logCmdFile $cmdFileLink");
    }

    /**
     * Returns the CLI log file path.
     *
     * @return string The log file path.
     */
    public static function getLogFile(): string
    {
        return Directories::getDir(Directories::CORE_LOGS_DIR) . '/asterisk/asterisk-cli.log';
    }

    /**
     * Rotates the CLI log.
     *
     * @return void
     */
    public static function logRotate(): void
    {
        $logRotatePath = Util::which('logrotate');
        $max_size    = 1;
        $f_name      = self::getLogFile();
        $text_config = $f_name . " {
    nocreate
    nocopytruncate
    compress
    delaycompress
    start 0
    rotate 2
    size {$max_size}M
    missingok
    noolddir
    postrotate
    endscript
}";
        $di = Di::getDefault();
        if ($di !== null) {
            $varEtcDir = Directories::getDir(Directories::CORE_VAR_ETC_DIR);
        } else {
            $varEtcDir = '/var/etc';
        }
        $path_conf   = $varEtcDir . '/asterisk_cli_logrotate_' . basename($f_name) . '.conf';
        file_put_contents($path_conf, $text_config);
        $mb10 = $max_size * 1024 * 1024;
        $options = '';
        if (Util::mFileSize($f_name) > $mb10) {
            $options = '-f';
        }
        Processes::mwExecBg("$logRotatePath $options '$path_conf' > /dev/null 2> /dev/null");
    }

    /**
     * Reloads the Asterisk core configuration.
     */
    public static function reload(): void
    {
        $asteriskConf = new self();
        $asteriskConf->generateConfig();
        $asterisk = Util::which('asterisk');
        Processes::mwExec("$asterisk -rx 'core reload'");
    }

    /**
     * Restarts the Asterisk core.
     */
    public static function restart(): void
    {
        $asteriskConf = new self();
        $asteriskConf->generateConfig();

        $indicationConf = new IndicationConf();
        $indicationConf->generateConfig();

        $asterisk = Util::which('asterisk');
        Processes::mwExec("$asterisk -rx 'core restart now'");
    }
}
