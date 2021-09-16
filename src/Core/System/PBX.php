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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\Asterisk\Configs\{AclConf,
    AsteriskConf,
    CoreConfigClass,
    ExtensionsConf,
    FeaturesConf,
    HttpConf,
    IAXConf,
    ManagerConf,
    ModulesConf,
    MusicOnHoldConf,
    SIPConf,
    VoiceMailConf};
use MikoPBX\Core\Config\RegisterDIServices;
use MikoPBX\Core\Workers\WorkerAmiListener;
use MikoPBX\Core\Workers\WorkerCallEvents;
use MikoPBX\Modules\Config\ConfigClass;
use Phalcon\Di;
use Phalcon\Di\Injectable;

/**
 * Class PBX
 *
 * @package MikoPBX\Core\System
 */
class PBX extends Injectable
{
    /**
     * Перезапуск процесса Asterisk.
     */
    public static function restart(): void
    {
        $pbx = new PBX();
        $pbx->stop();
        $pbx->start();
    }

    /**
     * Остановка процесса Asterisk.
     */
    public function stop(): void
    {
        Processes::killByName('safe_asterisk');
        sleep(1);
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'core stop now'");
        Processes::processWorker('', '', WorkerCallEvents::class, 'stop');
        Processes::processWorker('', '', WorkerAmiListener::class, 'stop');
        Processes::killByName('asterisk');
    }

    /**
     * Запуск процесса Asterisk.
     *
     */
    public function start(): void
    {
        Network::startSipDump();
        if (Util::isSystemctl() && ! Util::isDocker()) {
            $systemctlPath = Util::which('systemctl');
            Processes::mwExecBg("{$systemctlPath} restart asterisk");
        } else {
            $safe_asteriskPath = Util::which('safe_asterisk');
            // Ключ "-n" отключает подсветку цветом в CLI asterisk.
            Processes::mwExecBg("{$safe_asteriskPath} -f");
        }

        //Send notifications to modules
        $configClassObj = new ConfigClass();
        $configClassObj->hookModulesMethod(ConfigClass::ON_AFTER_PBX_STARTED);
    }

    public static function logRotate(): void
    {
        self::rotatePbxLog('messages');
        self::rotatePbxLog('security_log');
        self::rotatePbxLog('error');
        self::rotatePbxLog('verbose');
    }

    public static function rotatePbxLog($f_name): void
    {
        $di           = Di::getDefault();
        $asteriskPath = Util::which('asterisk');
        if ($di === null) {
            return;
        }
        $max_size    = 2;
        $log_dir     = System::getLogDir() . '/asterisk/';
        $text_config = "{$log_dir}{$f_name} {
    nocreate
    nocopytruncate
    delaycompress
    nomissingok
    start 0
    rotate 9
    size {$max_size}M
    missingok
    noolddir
    postrotate
        {$asteriskPath} -rx 'logger reload' > /dev/null 2> /dev/null
    endscript
}";
        $varEtcDir  = $di->getShared('config')->path('core.varEtcDir');
        $path_conf   = $varEtcDir . '/asterisk_logrotate_' . $f_name . '.conf';
        file_put_contents($path_conf, $text_config);
        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize("{$log_dir}{$f_name}") > $mb10) {
            $options = '-f';
        }
        $logrotatePath = Util::which('logrotate');
        Processes::mwExecBg("{$logrotatePath} {$options} '{$path_conf}' > /dev/null 2> /dev/null");
    }

    /**
     * Refresh features configs and reload features module
     */
    public static function featuresReload(): void
    {
        $featuresConf = new FeaturesConf();
        $featuresConf->generateConfig();
        $arr_out      = [];
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'module reload features'", $arr_out);
        Processes::mwExec("{$asteriskPath} -rx 'module reload res_parking'", $arr_out);
    }

    /**
     * Restarts asterisk core
     */
    public static function coreReload(): void
    {
        $featuresConf = new FeaturesConf();
        $featuresConf->generateConfig();

        $asteriskConf = new AsteriskConf();
        $asteriskConf->generateConfig();

        $arr_out      = [];
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'core reload'", $arr_out);
    }
    /**
     * Restarts asterisk core
     */
    public static function coreRestart(): void
    {
        $asteriskConf = new AsteriskConf();
        $asteriskConf->generateConfig();
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'core restart now'");
    }

    /**
     *  Reloads Asterisk manager interface module
     */
    public static function managerReload(): void
    {
        $managerCong = new ManagerConf();
        $managerCong->generateConfig();

        $httpConf = new HttpConf();
        $httpConf->generateConfig();

        $arr_out      = [];
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'module reload manager'", $arr_out);
        Processes::mwExec("{$asteriskPath} -rx 'module reload http'", $arr_out);
    }

    /**
     *  Reloads Asterisk music on hold module
     */
    public static function musicOnHoldReload(): void
    {
        $o = new MusicOnHoldConf();
        $o->generateConfig();
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'moh reload'");
    }

    /**
     *  Reloads Asterisk voicemail module
     */
    public static function voicemailReload(): void
    {
        $o = new VoiceMailConf();
        $o->generateConfig();
        $arr_out      = [];
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'voicemail reload'", $arr_out);
    }

    /**
     *  Reloads Asterisk modules
     */
    public static function modulesReload(): array
    {
        $pbx = new ModulesConf();
        $pbx->generateConfig();
        $arr_out      = [];
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'core restart now'", $arr_out);

        return [
            'result' => 'Success',
            'data'   => '',
        ];
    }


    public static function checkCodec($name, $desc, $type): void
    {
        $codec = Codecs::findFirst('name="' . $name . '"');
        if ($codec === null) {
            /** @var \MikoPBX\Common\Models\Codecs $codec_g722 */
            $codec              = new Codecs();
            $codec->name        = $name;
            $codec->type        = $type;
            $codec->description = $desc;
            $codec->save();
        }
    }

    /**
     *  Refresh SIP configs and reload PJSIP module
     */
    public static function sipReload():void
    {
        $di     = Di::getDefault();
        if ($di === null) {
            return;
        }
        $sip = new SIPConf();
        $needRestart = $sip->needAsteriskRestart();
        $sip->generateConfig();

        $acl = new AclConf();
        $acl->generateConfig();

        $asteriskPath = Util::which('asterisk');
        if ($needRestart === false) {
            Processes::mwExec("{$asteriskPath} -rx 'module reload acl'");
            Processes::mwExec("{$asteriskPath} -rx 'core reload'");
        } else {
            Util::sysLogMsg('SIP RELOAD', 'Need reload asterisk',LOG_INFO);
            // Завершаем каналы.
            Processes::mwExec("{$asteriskPath} -rx 'channel request hangup all'");
            usleep(500000);
            Processes::mwExec("{$asteriskPath} -rx 'core restart now'");
        }
    }

    /**
     * Refresh IAX configs and reload iax2 module
     */
    public static function iaxReload(): void
    {
        $iax    = new IAXConf();
        $iax->generateConfig();
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'iax2 reload'");
    }

    public static function mohReload(): void
    {
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'moh reload'");
    }
    /**
     * Ожидаем полной загрузки asterisk.
     *
     * @return bool
     */
    public static function waitFullyBooted(): bool
    {
        $time_start = microtime(true);
        $result     = false;
        $out        = [];
        $options = '';

        $timeoutPath  = Util::which('timeout');
        $asteriskPath = Util::which('asterisk');
        while (true) {
            $execResult = Processes::mwExec(
                "{$timeoutPath} {$options} 1 {$asteriskPath} -rx'core waitfullybooted'",
                $out
            );
            if ($execResult === 0 && implode('', $out) === 'Asterisk has fully booted.') {
                $result = true;
                break;
            }
            sleep(1);
            $time = microtime(true) - $time_start;
            if ($time > 60) {
                Util::sysLogMsg(__CLASS__, 'Error: Asterisk has not booted');
                break;
            }
        }

        return $result;
    }

    /**
     * Generates all Asterisk configuration files and (re)starts the Asterisk process
     */
    public function configure(): array
    {
        $result = [
            'result' => 'ERROR',
        ];

        if ( ! $this->di->getShared('registry')->booting) {
            $this->stop();
        }
        /**
         * Создание конфигурационных файлов.
         */
        $configClassObj = new ConfigClass();
        $configClassObj->hookModulesMethod(CoreConfigClass::GENERATE_CONFIG);
        self::dialplanReload();
        if ($this->di->getShared('registry')->booting) {
            Util::echoResult('   |- dialplan reload');
        }
        // Создание базы данных истории звонков.
        /** @var \Phalcon\Db\Adapter\Pdo\Sqlite $connection */
        $connection = $this->di->get('dbCDR');
        if ( ! $connection->tableExists('cdr')) {
            CDRDatabaseProvider::recreateDBConnections();
        } else {
            CdrDb::checkDb();
        }

        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Refresh extensions.conf file and reloads asterisk dialplan.
     *
     */
    public static function dialplanReload(): void
    {
        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
        $extensions = new ExtensionsConf();
        $extensions->generateConfig();
        if ($di->getRegistry()->booting !== true) {
            $path_asterisk = Util::which('asterisk');
            Processes::mwExec("{$path_asterisk} -rx 'dialplan reload'");
            Processes::mwExec("{$path_asterisk} -rx 'module reload pbx_lua.so'");
        }
    }

}
