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

namespace MikoPBX\Core\Workers;

require_once 'Globals.php';

use MikoPBX\Common\Models\{AsteriskManagerUsers,
    CallQueueMembers,
    CallQueues,
    Codecs,
    ConferenceRooms,
    CustomFiles,
    DialplanApplications,
    ExtensionForwardingRights,
    Extensions,
    ExternalPhones,
    Fail2BanRules,
    FirewallRules,
    Iax,
    IncomingRoutingTable,
    IvrMenu,
    IvrMenuActions,
    LanInterfaces,
    NetworkFilters,
    OutgoingRoutingTable,
    OutWorkTimes,
    PbxExtensionModules,
    PbxSettings,
    Sip,
    SoundFiles
};
use MikoPBX\Common\Providers\BeanstalkConnectionModelsProvider;
use MikoPBX\Core\Asterisk\Configs\QueueConf;
use MikoPBX\Core\System\{BeanstalkClient,
    Configs\CronConf,
    Configs\Fail2BanConf,
    Configs\IptablesConf,
    Configs\NatsConf,
    Configs\NginxConf,
    Configs\NTPConf,
    Configs\PHPConf,
    Configs\SSHConf,
    Configs\SyslogConf,
    PBX,
    Processes,
    System,
    Util};
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Di;
use Pheanstalk\Contract\PheanstalkInterface;
use Throwable;

ini_set('error_reporting', E_ALL);
ini_set('display_startup_errors', 1);

class WorkerModelsEvents extends WorkerBase
{
    private const R_MANAGERS     = 'reloadManager';

    public const R_NEED_RESTART  = 'needRestart';

    private const R_QUEUES = 'reloadQueues';

    private const R_DIALPLAN = 'reloadDialplan';

    private const R_CUSTOM_F = 'updateCustomFiles';

    private const R_FIREWALL = 'reloadFirewall';

    private const R_NETWORK = 'networkReload';

    private const R_IAX = 'reloadIax';

    private const R_SIP = 'reloadSip';

    private const R_FEATURES = 'reloadFeatures';

    private const R_CRON = 'reloadCron';

    public const  R_NGINX = 'reloadNginx';

    public const  R_NGINX_CONF    = 'reloadNginxConf';

    public const  R_FAIL2BAN_CONF = 'reloadFail2BanConf';

    private const R_PHP_FPM = 'reloadPHPFPM';

    private const R_TIMEZONE = 'updateTomeZone';

    private const R_SYSLOG   = 'restartSyslogD';

    private const R_SSH = 'reloadSSH';

    private const R_LICENSE = 'reloadLicense';

    private const R_NATS = 'reloadNats';

    private const R_VOICEMAIL = 'reloadVoicemail';

    private const R_REST_API_WORKER = 'reloadRestAPIWorker';

    private const R_CALL_EVENTS_WORKER = 'reloadWorkerCallEvents';

    private const R_PBX_EXTENSION_STATE = 'afterModuleStateChanged';

    private const R_MOH = 'reloadMoh';

    private const R_NTP = 'reloadNtp';

    private int $last_change;
    private array $modified_tables;

    private int $timeout = 2;
    private array $arrObject;
    private array $PRIORITY_R;


    /**
     * Entry point
     *
     * @param $argv
     */
    public function start($argv): void
    {
        $this->last_change = time() - 2;
        $this->arrObject = $this->di->getShared('pbxConfModules');

        $this->PRIORITY_R = [
            self::R_TIMEZONE,
            self::R_SYSLOG,
            self::R_REST_API_WORKER,
            self::R_NETWORK,
            self::R_FIREWALL,
            self::R_FAIL2BAN_CONF,
            self::R_SSH,
            self::R_LICENSE,
            self::R_NATS,
            self::R_NTP,
            self::R_PHP_FPM,
            self::R_NGINX,
            self::R_NGINX_CONF,
            self::R_CRON,
            self::R_FEATURES,
            self::R_SIP,
            self::R_IAX,
            self::R_DIALPLAN,
            self::R_QUEUES,
            self::R_MANAGERS,
            self::R_CUSTOM_F,
            self::R_VOICEMAIL,
            self::R_MOH,
            self::R_CALL_EVENTS_WORKER,
            self::R_PBX_EXTENSION_STATE,
        ];

        $this->modified_tables = [];

        /** @var BeanstalkClient $client */
        $client = $this->di->getShared(BeanstalkConnectionModelsProvider::SERVICE_NAME);
        $client->subscribe(self::class, [$this, 'processModelChanges']);
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        $client->setTimeoutHandler([$this, 'timeoutHandler']);

        while ($this->needRestart === false) {
            $client->wait(1);
        }
        // Execute all collected changes before exit
        $this->timeoutHandler();
    }

    /**
     * Parses for received Beanstalk message
     *
     * @param BeanstalkClient $message
     * @throws \JsonException
     */
    public function processModelChanges(BeanstalkClient $message): void
    {
        $data = $message->getBody();
        $receivedMessage = null;
        if($data === self::R_NEED_RESTART){
            $this->needRestart();
        }
        if(in_array($data, $this->PRIORITY_R, true)){
            $this->modified_tables[$data] = true;
        }else{
            $receivedMessage = json_decode($message->getBody(), true, 512, JSON_THROW_ON_ERROR);
            $this->fillModifiedTables($receivedMessage);

        }
        $this->startReload();
        if(!$receivedMessage){
            return;
        }
        // Send information about models changes to additional modules
        foreach ($this->arrObject as $appClass) {
            $appClass->modelsEventChangeData($receivedMessage);
        }
    }

    /**
     * Collects changes to determine which modules must be reloaded or reconfigured
     *
     * @param array $data
     */
    private function fillModifiedTables(array $data): void
    {

        $count_changes = count($this->modified_tables);
        $called_class  = $data['model'] ?? '';
        Util::sysLogMsg(__METHOD__, "New changes ".$called_class, LOG_DEBUG);

        // Clear all caches on any changed models on backend
        PbxSettings::clearCache($called_class, false);

        // Get new settings gor dependence modules
        foreach ($this->arrObject as $appClass) {
            $dependencies = $appClass->dependenceModels();
            if (in_array($called_class, $dependencies, true)) {
                $appClass->getSettings();
            }
        }

        switch ($called_class) {
            case AsteriskManagerUsers::class:
                $this->modified_tables[self::R_MANAGERS] = true;
                break;
            case CallQueueMembers::class:
                $this->modified_tables[self::R_QUEUES] = true;
                break;
            case CallQueues::class:
                $this->modified_tables[self::R_QUEUES]   = true;
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case ExternalPhones::class:
            case Extensions::class:
            case DialplanApplications::class:
            case IncomingRoutingTable::class:
            case IvrMenu::class:
            case IvrMenuActions::class:
            case OutgoingRoutingTable::class:
            case OutWorkTimes::class:
            case ConferenceRooms::class:
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case CustomFiles::class:
                $this->modified_tables[self::R_CUSTOM_F] = true;
                break;
            case Sip::class:
            case ExtensionForwardingRights::class:
                $this->modified_tables[self::R_SIP]      = true;
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case FirewallRules::class:
            case Fail2BanRules::class:
                $this->modified_tables[self::R_FIREWALL] = true;
                break;
            case Iax::class:
                $this->modified_tables[self::R_IAX]      = true;
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case Codecs::class:
                $this->modified_tables[self::R_IAX] = true;
                $this->modified_tables[self::R_SIP] = true;
                break;
            case SoundFiles::class:
                $this->modified_tables[self::R_MOH]      = true;
                $this->modified_tables[self::R_DIALPLAN] = true;
                break;
            case LanInterfaces::class:
                $this->modified_tables[self::R_NETWORK] = true;
                $this->modified_tables[self::R_IAX]     = true;
                $this->modified_tables[self::R_SIP]     = true;
                break;
            case NetworkFilters::class:
                $this->modified_tables[self::R_FIREWALL] = true;
                $this->modified_tables[self::R_SIP]      = true;
                $this->modified_tables[self::R_MANAGERS] = true;
                break;
            case PbxSettings::class:
                $pbxSettings = PbxSettings::findFirstByKey($data['recordId']);
                if ($pbxSettings === null) {
                    return;
                }
                if ($pbxSettings->itHasFeaturesSettingsChanges()) {
                    $this->modified_tables[self::R_FEATURES] = true;
                    $this->modified_tables[self::R_DIALPLAN] = true;
                }
                if ($pbxSettings->itHasAMIParametersChanges()) {
                    $this->modified_tables[self::R_MANAGERS] = true;
                }
                if ($pbxSettings->itHasIaxParametersChanges()) {
                    $this->modified_tables[self::R_IAX] = true;
                }
                if ($pbxSettings->itHasSipParametersChanges()) {
                    $this->modified_tables[self::R_SIP] = true;
                }
                if ($pbxSettings->itHasSSHParametersChanges()) {
                    $this->modified_tables[self::R_SSH] = true;
                }
                if ($pbxSettings->itHasFirewallParametersChanges()) {
                    $this->modified_tables[self::R_FIREWALL] = true;
                }
                if ($pbxSettings->itHasWebParametersChanges()) {
                    $this->modified_tables[self::R_NGINX] = true;
                }
                if ($pbxSettings->itHasCronParametersChanges()) {
                    $this->modified_tables[self::R_CRON] = true;
                }
                if ($pbxSettings->itHasDialplanParametersChanges()) {
                    $this->modified_tables[self::R_DIALPLAN] = true;
                }
                if ($pbxSettings->itHasVoiceMailParametersChanges()) {
                    $this->modified_tables[self::R_VOICEMAIL] = true;
                }
                if ($pbxSettings->itHasVisualLanguageSettings()) {
                    $this->modified_tables[self::R_REST_API_WORKER] = true;
                }
                if ($pbxSettings->itHasLicenseSettings()) {
                    $this->modified_tables[self::R_LICENSE] = true;
                    $this->modified_tables[self::R_NATS]    = true;
                }
                if ($pbxSettings->itHasTimeZoneSettings()) {
                    $this->modified_tables[self::R_TIMEZONE]        = true;
                    $this->modified_tables[self::R_NGINX]           = true;
                    $this->modified_tables[self::R_PHP_FPM]         = true;
                    $this->modified_tables[self::R_REST_API_WORKER] = true;
                    $this->modified_tables[self::R_SYSLOG]        = true;
                }
                if ($pbxSettings->itHasNTPSettings()) {
                    $this->modified_tables[self::R_NTP] = true;
                }
                if ($pbxSettings->itHasCallRecordSettings()) {
                    $this->modified_tables[self::R_CALL_EVENTS_WORKER] = true;
                    $this->modified_tables[self::R_DIALPLAN]           = true;
                }
                break;
            case PbxExtensionModules::class:
                $moduleSettings                                                   = PbxExtensionModules::findFirstById(
                    $data['recordId']
                );
                $this->modified_tables[self::R_PBX_EXTENSION_STATE]               = true;
                $this->modified_tables['parameters'][self::R_PBX_EXTENSION_STATE] = $moduleSettings;
                $this->modified_tables[self::R_CRON]                              = true;
                break;
            default:
        }

        if ($count_changes === 0 && count($this->modified_tables) > 0) {
            // Начинаем отсчет времени при получении первой задачи.
            $this->last_change = time();
        }
    }

    /**
     * Apply changes
     *
     * @return void
     */
    private function startReload(): void
    {
        if (count($this->modified_tables) === 0) {
            return;
        }
        $delta = time() - $this->last_change;
        if ($delta < $this->timeout) {
            return;
        }

        foreach ($this->PRIORITY_R as $method_name) {
            $action     = $this->modified_tables[$method_name] ?? null;
            $parameters = $this->modified_tables['parameters'][$method_name] ?? null;
            if ($action === null) {
                continue;
            }
            if (method_exists($this, $method_name)) {
                Util::sysLogMsg(__METHOD__, "Process changes by {$method_name}", LOG_DEBUG);
                if ($parameters === null) {
                    $this->$method_name();
                } else {
                    $this->$method_name($parameters);
                }
            }
        }

        foreach ($this->arrObject as $appClass) {
            $appClass->modelsEventNeedReload($this->modified_tables);
        }
        $this->modified_tables = [];
    }


    /**
     * Restarts gnats queue server daemon
     */
    public function reloadNats(): void
    {
        $natsConf = new NatsConf();
        $natsConf->reStart();
    }


    /**
     * Reloads Asterisk dialplan
     */
    public function reloadDialplan(): void
    {
        PBX::dialplanReload();
    }

    /**
     * Reloads Asterisk manager interface module
     */
    public function reloadManager(): void
    {
        PBX::managerReload();
    }

    /**
     * Generates queue.conf and restart asterisk queue module
     */
    public function reloadQueues(): void
    {
        QueueConf::queueReload();
    }

    /**
     * Updates custom changes in config files
     */
    public function updateCustomFiles(): void
    {
        System::updateCustomFiles();
    }

    /**
     * Apply iptable settings and restart firewall
     */
    public function reloadFirewall(): void
    {
        IptablesConf::reloadFirewall();
    }

    /**
     *  Refresh networks configs and restarts network daemon
     */
    public function networkReload(): void
    {
        System::networkReload();
    }

    /**
     * Refresh IAX configs and reload iax2 module
     */
    public function reloadIax(): void
    {
        PBX::iaxReload();
    }

    /**
     * Reload MOH file list in Asterisk.
     */
    public function reloadMoh(): void
    {
        PBX::mohReload();
    }

    /**
     * Refresh SIP configs and reload PJSIP module
     */
    public function reloadSip(): void
    {
        PBX::sipReload();
    }

    /**
     *  Refresh features configs and reload features module
     */
    public function reloadFeatures(): void
    {
        PBX::featuresReload();
    }

    /**
     * Restarts CROND daemon
     */
    public function reloadCron(): void
    {
        $cron = new CronConf();
        $cron->reStart();
    }

    /**
     * Restarts NTP daemon
     */
    public function reloadNtp(): void
    {
        NTPConf::configure();
    }

    /**
     * Restarts Nginx daemon
     */
    public function reloadNginx(): void
    {
        $nginxConf = new NginxConf();
        $nginxConf->generateConf();
        $nginxConf->reStart();
    }

    /**
     * Restarts Nginx daemon
     */
    public function reloadNginxConf(): void
    {
        // Обновляем конфигурацию Nginx.
        $nginxConf = new NginxConf();
        $nginxConf->generateModulesConf();
        $nginxConf->reStart();
    }

    /**
     * Restarts Nginx daemon
     */
    public function reloadFail2BanConf(): void{
        Fail2BanConf::reloadFail2ban();
    }

    /**
     * Restarts Nginx daemon
     */
    public function needRestart(): void{
        $this->needRestart = true;
    }

    /**
     * Restarts PHP-FPM daemon
     */
    public function reloadPHPFPM(): void
    {
        PHPConf::reStart();
    }

    /**
     * Configure SSH settings
     */
    public function reloadSSH(): void
    {
        $sshConf = new SSHConf();
        $sshConf->configure();
    }

    /**
     * Reconfigure TomeZone settings
     */
    public function updateTomeZone(): void
    {
        System::timezoneConfigure();
    }

    /**
     * Перезапуск rsyslog.
     */
    public function restartSyslogD(): void
    {
        // Рестарт демона Syslog.
        $syslogConf = new SyslogConf();
        $syslogConf->reStart();
    }

    /**
     *  Reloads Asterisk voicemail module
     */
    public function reloadVoicemail(): void
    {
        PBX::voicemailReload();
    }

    /**
     *  Reloads WorkerApiCommands worker
     */
    public function reloadRestAPIWorker(): void
    {
        Processes::processPHPWorker(WorkerApiCommands::class);
    }


    /**
     *  Reloads WorkerCallEvents worker
     */
    public function reloadWorkerCallEvents(): void
    {
        Processes::processPHPWorker(WorkerCallEvents::class);
    }


    /**
     * Timeout handles
     */
    public function timeoutHandler(): void
    {
        $this->last_change = time() - $this->timeout;
        $this->startReload();
    }


    /**
     *  Process after PBXExtension state changes
     *
     * @param \MikoPBX\Common\Models\PbxExtensionModules $record
     */
    public function afterModuleStateChanged(PbxExtensionModules $record): void
    {
        $className       = str_replace('Module', '', $record->uniqid);
        $configClassName = "\\Modules\\{$record->uniqid}\\Lib\\{$className}Conf";
        if (class_exists($configClassName)) {
            $configClassName = new $configClassName();
            if ($record->disabled === '1' && method_exists($configClassName, 'onAfterModuleDisable')) {
                $configClassName->onAfterModuleDisable();
            } elseif ($record->disabled === '0' && method_exists($configClassName, 'onAfterModuleEnable')) {
                $configClassName->onAfterModuleEnable();
            }
        }
    }

    public static function invokeAction(string $action, $priority=0):void{
        $di = Di::getDefault();
        /** @var BeanstalkClient $queue */
        $queue = $di->getShared(BeanstalkConnectionModelsProvider::SERVICE_NAME);
        $queue->publish(
            $action,
            self::class,
            $priority,
            PheanstalkInterface::DEFAULT_DELAY,
            3600
        );
    }
}

/**
 * Start point
 */
$workerClassname = WorkerModelsEvents::class;
if (isset($argv) && count($argv) > 1 && $argv[1] === 'start') {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (Throwable $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        sleep(1);
    }
}