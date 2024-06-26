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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\RegistryProvider;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\Asterisk\Configs\{AclConf,
    AsteriskConf,
    AsteriskConfigClass,
    AsteriskConfigInterface,
    ConferenceConf,
    ExtensionsConf,
    FeaturesConf,
    HttpConf,
    IAXConf,
    ManagerConf,
    ModulesConf,
    MusicOnHoldConf,
    RtpConf,
    SIPConf,
    VoiceMailConf};
use MikoPBX\Core\Workers\WorkerCallEvents;
use MikoPBX\Modules\Config\SystemConfigInterface;
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
     * Restarts the Asterisk process.
     */
    public static function restart(): void
    {
        $pbx = new PBX();
        $pbx->stop();
        $pbx->start();
    }

    /**
     * Stops the Asterisk process.
     */
    public function stop(): void
    {
        Processes::killByName('safe_asterisk');
        sleep(1);
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'core stop now'");
        Processes::processWorker('', '', WorkerCallEvents::class, 'stop');
        Processes::killByName('asterisk');
    }

    /**
     * Starts the Asterisk process.
     */
    public function start(): void
    {
        Network::startSipDump();
        $safe_asteriskPath = Util::which('safe_asterisk');
        // The "-n" option disables color highlighting in Asterisk CLI.
        Processes::mwExecBg("{$safe_asteriskPath} -f");
        // Send notifications to modules
        PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::ON_AFTER_PBX_STARTED);
    }

    /**
     * Rotates the PBX log files.
     */
    public static function logRotate(): void
    {
        self::rotatePbxLog('messages');
        self::rotatePbxLog('security_log');
        self::rotatePbxLog('error');
        self::rotatePbxLog('verbose');
    }

    /**
     * Rotates the specified PBX log file.
     * @param string $fileName The name of the log file to rotate.
     */
    public static function rotatePbxLog($fileName): void
    {
        $di           = Di::getDefault();
        $asteriskPath = Util::which('asterisk');
        if ($di === null) {
            return;
        }
        $max_size    = 10;
        $log_dir     = System::getLogDir() . '/asterisk/';
        $text_config = "{$log_dir}{$fileName} {
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
        $path_conf   = $varEtcDir . '/asterisk_logrotate_' . $fileName . '.conf';
        file_put_contents($path_conf, $text_config);
        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize("{$log_dir}{$fileName}") > $mb10) {
            $options = '-f';
        }
        $logrotatePath = Util::which('logrotate');
        Processes::mwExecBg("{$logrotatePath} {$options} '{$path_conf}' > /dev/null 2> /dev/null");
    }

    /**
     * Refreshes the features configs and reloads the features module.
     */
    public static function featuresReload(): void
    {
        $featuresConf = new FeaturesConf();
        $featuresConf->generateConfig();
        $arr_out      = [];
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'module reload features'", $arr_out);
    }

    /**
     * Reloads the Asterisk core.
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
     * Restarts the Asterisk core.
     */
    public static function coreRestart(): void
    {
        $asteriskConf = new AsteriskConf();
        $asteriskConf->generateConfig();
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'core restart now'");
    }

    /**
     * Reloads the Asterisk manager interface module.
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
     * Reloads the Asterisk music on hold module.
     */
    public static function musicOnHoldReload(): void
    {
        $o = new MusicOnHoldConf();
        $o->generateConfig();
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'moh reload'");
    }

    /**
     * Reloads the Asterisk music on hold module.
     */
    public static function confBridgeReload(): void
    {
        $o = new ConferenceConf();
        $o->generateConfig();
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("$asteriskPath -rx 'module reload app_confbridge'");
    }


    /**
     * Reloads the Asterisk voicemail module.
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
     * Reloads the Asterisk modules.
     * @return array
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


    /**
     * Checks if a codec exists and creates it if not.
     * @param string $name The name of the codec.
     * @param string $desc The description of the codec.
     * @param string $type The type of the codec.
     */
    public static function checkCodec($name, $desc, $type): void
    {
        $codec = Codecs::findFirst('name="' . $name . '"');
        if ($codec === null) {
            /** @var \MikoPBX\Common\Models\Codecs $codec */
            $codec              = new Codecs();
            $codec->name        = $name;
            $codec->type        = $type;
            $codec->description = $desc;
            $codec->save();
        }
    }

    /**
     * Refreshes the SIP configurations and reloads the PJSIP module.
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
            SystemMessages::sysLogMsg('SIP RELOAD', 'Need reload asterisk',LOG_INFO);
            // Terminate channels.
            Processes::mwExec("{$asteriskPath} -rx 'channel request hangup all'");
            usleep(500000);
            Processes::mwExec("{$asteriskPath} -rx 'core restart now'");
        }
    }

    /**
     * Updates the RTP config file.
     */
    public static function rtpReload(): void
    {
        $rtp = new RtpConf();
        $rtp->generateConfig();
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'module reload res_rtp_asterisk'");
    }

    /**
     * Refreshes the IAX configurations and reloads the iax2 module.
     */
    public static function iaxReload(): void
    {
        $iax    = new IAXConf();
        $iax->generateConfig();
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'iax2 reload'");
    }


    /**
     * Waits for Asterisk to fully boot.
     * @return bool True if Asterisk has fully booted, false otherwise.
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
                SystemMessages::sysLogMsg(__CLASS__, 'Error: Asterisk has not booted');
                break;
            }
        }

        return $result;
    }

    /**
     * Configures Asterisk by generating all configuration files and (re)starts the Asterisk process.
     * @return array The result of the configuration process.
     */
    public function configure(): array
    {
        if ( ! $this->di->getShared(RegistryProvider::SERVICE_NAME)->booting) {
            $this->stop();
        }
        self::updateSavePeriod();
        /**
         * Create configuration files.
         */
        $configClassObj = new AsteriskConfigClass();
        $configClassObj->hookModulesMethod(AsteriskConfigInterface::GENERATE_CONFIG);

        self::dialplanReload();
        if ($this->di->getShared(RegistryProvider::SERVICE_NAME)->booting) {
            $message = '   |- dialplan reload';
            SystemMessages::echoToTeletype($message);
            SystemMessages::echoWithSyslog($message);
            SystemMessages::echoResult($message);
            SystemMessages::teletypeEchoResult($message);
        }
        // Create the call history database.
        /** @var \Phalcon\Db\Adapter\Pdo\Sqlite $connection */
        $connection = $this->di->get(CDRDatabaseProvider::SERVICE_NAME);
        if ( ! $connection->tableExists('cdr')) {
            CDRDatabaseProvider::recreateDBConnections();
        } else {
            CdrDb::checkDb();
        }
        $result=[];
        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Refreshes the extensions.conf file and reloads the Asterisk dialplan.
     */
    public static function dialplanReload(): void
    {
        $di = Di::getDefault();
        if ($di === null) {
            return;
        }
        if ($di->getShared(RegistryProvider::SERVICE_NAME)->booting !== true) {
            $extensions = new ExtensionsConf();
            $extensions->generateConfig();
            $path_asterisk = Util::which('asterisk');
            Processes::mwExec("{$path_asterisk} -rx 'dialplan reload'");
            Processes::mwExec("{$path_asterisk} -rx 'module reload pbx_lua.so'");
        }
    }

    /**
     * Save information on the period of storage of conversation recordings.
     * @param string $value
     * @return void
     */
    public static function updateSavePeriod(string $value = ''):void{
        if(empty($value)){
            $value = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_RECORD_SAVE_PERIOD);
        }
        $filename   = '/var/etc/record-save-period';
        file_put_contents($filename, $value);
    }

}
