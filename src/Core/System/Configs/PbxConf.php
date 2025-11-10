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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\Asterisk\Configs\{
    AriConf,
    AsteriskConf,
    AsteriskConfigClass,
    AsteriskConfigInterface,
    ConferenceConf,
    ExtensionsConf,
    FeaturesConf,
    IAXConf,
    IndicationConf,
    ManagerConf,
    ModulesConf,
    MusicOnHoldConf,
    RtpConf,
    SIPConf,
    VoiceMailConf};
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerCallEvents;
use MikoPBX\Modules\Config\SystemConfigInterface;
use Phalcon\Di\Di;

/**
 * Class PBX
 *
 * @package MikoPBX\Core\System
 */
class PbxConf extends SystemConfigClass
{
    public const string PROC_NAME = 'asterisk';
    public string $configPath = '/etc/asterisk/asterisk.conf';
    public string $runDirPath = '/var/asterisk/run';

    public function __construct()
    {
        parent::__construct();
        $this->configPath = Directories::getDir(Directories::AST_ETC_DIR).'/asterisk.conf';
        if(!file_exists($this->runDirPath)){
            Util::mwMkdir($this->runDirPath);
        }
        chmod($this->runDirPath, 0770);
        $binPath = Util::which(self::PROC_NAME);
        $this->startCommand = "$binPath -F";
    }

    public function generateMonitConf(): bool
    {
        $binPath = Util::which(self::PROC_NAME);
        $confPath = $this->getMainMonitConfFile();
        $conf = 'check process '.self::PROC_NAME.' with pidfile /var/asterisk/run/'.self::PROC_NAME.'.pid'.PHP_EOL.
                '    start program = "'.$binPath.'"'.PHP_EOL.
                '    stop program = "'."$binPath -rx 'core stop now'".'"'.PHP_EOL;
        $this->saveFileContent($confPath, $conf);
        return true;
    }

    /**
     * Stops the Asterisk process.
     */
    private function stop(): void
    {
        $asterisk = Util::which(self::PROC_NAME);
        Processes::mwExec("$asterisk -rx 'core stop now'");
        Processes::processWorker('', '', WorkerCallEvents::class, 'stop');
        Processes::killByName(self::PROC_NAME);
    }

    /**
     * Configures Asterisk by generating all configuration files and (re)starts the Asterisk process.
     * @return array The result of the configuration process.
     */
    public function configure(): array
    {
        self::updateSavePeriod();
        /**
         * Create configuration files.
         */
        $configClassObj = new AsteriskConfigClass();
        $configClassObj->hookModulesMethod(AsteriskConfigInterface::GENERATE_CONFIG);

        ExtensionsConf::reload();

        if (System::isBooting()) {
            $message = '   |- reload dialplan...';
            $startTime = microtime(true);
            SystemMessages::echoWithSyslog($message);
            $elapsedTime = round(microtime(true) - $startTime, 2);
            SystemMessages::echoResultMsgWithTime($message, SystemMessages::RESULT_DONE, $elapsedTime);
        }else{
            $this->stop();
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
     * Starts the Asterisk process.
     */
    public function start(): bool
    {
        if (System::isBooting()) {
            Processes::mwExec($this->startCommand);
        }
        $result = $this->monitWaitStart();
        // Send notifications to modules
        PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::ON_AFTER_PBX_STARTED);
        return $result;
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
    private static function rotatePbxLog(string $fileName): void
    {
        $di           = Di::getDefault();
        $asterisk = Util::which(self::PROC_NAME);
        if ($di === null) {
            return;
        }
        $max_size    = 10;
        $log_dir     = Directories::getDir(Directories::CORE_LOGS_DIR) . '/asterisk/';
        $text_config = "$log_dir$fileName {
    nocreate
    nocopytruncate
    compress
    delaycompress
    start 0
    rotate 9
    size {$max_size}M
    missingok
    noolddir
    postrotate
        $asterisk -rx 'logger reload' > /dev/null 2> /dev/null
    endscript
}";
        $varEtcDir  = Directories::getDir(Directories::CORE_VAR_ETC_DIR);
        $path_conf   = $varEtcDir . '/asterisk_logrotate_' . $fileName . '.conf';
        file_put_contents($path_conf, $text_config);
        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize("$log_dir$fileName") > $mb10) {
            $options = '-f';
        }
        $logrotate = Util::which('logrotate');
        Processes::mwExecBg("$logrotate $options '$path_conf' > /dev/null 2> /dev/null");
    }

    /**
     * Refreshes the features configs and reloads the features module.
     *
     * @deprecated Use FeaturesConf::reload() instead
     * @see \MikoPBX\Core\Asterisk\Configs\FeaturesConf::reload()
     */
    public static function featuresReload(): void
    {
        FeaturesConf::reload();
    }

    /**
     * Reloads the Asterisk core.
     *
     */
    public static function coreReload(): void
    {
        FeaturesConf::reload();
        AsteriskConf::reload();
        IndicationConf::reload();
    }

    /**
     * Restarts the Asterisk core.
     *
     */
    public static function coreRestart(): void
    {
        AsteriskConf::restart();
    }

    /**
     * Reloads the Asterisk manager interface module.
     *
     * @deprecated Use ManagerConf::reload() instead
     * @see \MikoPBX\Core\Asterisk\Configs\ManagerConf::reload()
     */
    public static function managerReload(): void
    {
        ManagerConf::reload();
    }

    /**
     * Reloads the Asterisk REST Interface (ARI) module.
     *
     * @deprecated Use AriConf::reload() instead
     * @see \MikoPBX\Core\Asterisk\Configs\AriConf::reload()
     */
    public static function ariReload(): void
    {
        AriConf::reload();
    }

    /**
     * Reloads the Asterisk music on hold module.
     *
     * @deprecated Use MusicOnHoldConf::reload() instead
     * @see \MikoPBX\Core\Asterisk\Configs\MusicOnHoldConf::reload()
     */
    public static function musicOnHoldReload(): void
    {
        MusicOnHoldConf::reload();
    }

    /**
     * Reloads the Asterisk conference bridge module.
     *
     * @deprecated Use ConferenceConf::reload() instead
     * @see \MikoPBX\Core\Asterisk\Configs\ConferenceConf::reload()
     */
    public static function confBridgeReload(): void
    {
        ConferenceConf::reload();
    }

    /**
     * Reloads the Asterisk voicemail module.
     *
     * @deprecated Use VoiceMailConf::reload() instead
     * @see \MikoPBX\Core\Asterisk\Configs\VoiceMailConf::reload()
     */
    public static function voicemailReload(): void
    {
        VoiceMailConf::reload();
    }

    /**
     * Reloads the Asterisk modules.
     *
     * @deprecated Use ModulesConf::reload() instead
     * @see \MikoPBX\Core\Asterisk\Configs\ModulesConf::reload()
     * @return array
     */
    public static function modulesReload(): array
    {
        return ModulesConf::reload();
    }

    /**
     * Checks if a codec exists and creates it if not.
     * @param string $name The name of the codec.
     * @param string $desc The description of the codec.
     * @param string $type The type of the codec.
     */
    public static function checkCodec(string $name, string $desc, string $type): void
    {
        $codec = Codecs::findFirst('name="' . $name . '"');
        if ($codec === null) {
            $codec              = new Codecs();
            $codec->name        = $name;
            $codec->type        = $type;
            $codec->description = $desc;
            $codec->save();
        }
    }

    /**
     * Refreshes the SIP configurations and reloads the PJSIP module.
     *
     * @deprecated Use SIPConf::reload() instead
     * @see \MikoPBX\Core\Asterisk\Configs\SIPConf::reload()
     */
    public static function sipReload():void
    {
        SIPConf::reload();
    }

    /**
     * Updates the RTP config file.
     *
     * @deprecated Use RtpConf::reload() instead
     * @see \MikoPBX\Core\Asterisk\Configs\RtpConf::reload()
     */
    public static function rtpReload(): void
    {
        RtpConf::reload();
    }

    /**
     * Refreshes the IAX configurations and reloads the iax2 module.
     *
     * @deprecated Use IAXConf::reload() instead
     * @see \MikoPBX\Core\Asterisk\Configs\IAXConf::reload()
     */
    public static function iaxReload(): void
    {
        IAXConf::reload();
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

        $timeout  = Util::which('timeout');
        $asterisk = Util::which(self::PROC_NAME);
        while (true) {
            $execResult = Processes::mwExec(
                "$timeout $options 1 $asterisk -rx'core waitfullybooted'",
                $out
            );
            if ($execResult === 0 && implode('', $out) === 'Asterisk has fully booted.') {
                $result = true;
                break;
            }
            usleep(500000);
            $time = microtime(true) - $time_start;
            if ($time > 60) {
                SystemMessages::sysLogMsg(__CLASS__, 'Error: Asterisk has not booted');
                break;
            }
        }

        return $result;
    }

    /**
     * Refreshes the extensions.conf file and reloads the Asterisk dialplan.
     *
     * @deprecated Use ExtensionsConf::reload() instead
     * @see \MikoPBX\Core\Asterisk\Configs\ExtensionsConf::reload()
     */
    public static function dialplanReload(): void
    {
        ExtensionsConf::reload();
    }

    /**
     * Save information on the period of storage of conversation recordings.
     * @param string $value
     * @return void
     */
    public static function updateSavePeriod(string $value = ''):void{
        if(empty($value)){
            $value = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_SAVE_PERIOD);
        }
        $filename   = '/var/etc/record-save-period';
        file_put_contents($filename, $value);
    }

    /**
     * Attempts to start the service via Monit when a failure is detected.
     *
     * This method is typically used as a fallback action to manually restart
     * the service using Monit if it fails unexpectedly. The current implementation
     * does not wait for the service to fully start, but the timeout parameter
     * may be used in extended implementations.
     *
     * @return void
     */
    public function monitFailStartAction(): void
    {
        sleep(1);
    }

}
