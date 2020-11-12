<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 10 2020
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
    SoundFiles};
use MikoPBX\Core\Asterisk\Configs\QueueConf;
use MikoPBX\Core\System\{BeanstalkClient,
    Configs\CronConf,
    Configs\IptablesConf,
    Configs\NatsConf,
    Configs\NginxConf,
    Configs\NTPConf,
    Configs\PHPConf,
    Configs\SSHConf,
    PBX,
    System,
    Util};
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Throwable;

ini_set('error_reporting', E_ALL);
ini_set('display_startup_errors', 1);

class WorkerModelsEvents extends WorkerBase
{
    private const R_MANAGERS = 'reloadManager';

    private const R_QUEUES = 'reloadQueues';

    private const R_DIALPLAN = 'reloadDialplan';

    private const R_CUSTOM_F = 'updateCustomFiles';

    private const R_FIREWALL = 'reloadFirewall';

    private const R_NETWORK = 'networkReload';

    private const R_IAX = 'reloadIax';

    private const R_SIP = 'reloadSip';

    private const R_FEATURES = 'reloadFeatures';

    private const R_CRON = 'reloadCron';

    private const R_NGINX = 'reloadNginx';

    private const R_PHP_FPM = 'reloadPHPFPM';

    private const R_TIMEZONE = 'updateTomeZone';

    private const R_SSH = 'reloadSSH';

    private const R_LICENSE = 'reloadLicense';

    private const R_NATS = 'reloadNats';

    private const R_VOICEMAIL = 'reloadVoicemail';

    private const R_REST_API_WORKER = 'reloadRestAPIWorker';

    private const R_CALL_EVENTS_WORKER = 'reloadWorkerCallEvents';

    private const R_MOH = 'reloadMoh';

    private const R_CONF_MODULES = 'reloadPbxConfModules';

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

        $this->arrObject = $this->di->getShared('pbxConfModules');

        $this->PRIORITY_R = [
            self::R_CONF_MODULES,
            self::R_REST_API_WORKER,
            self::R_NETWORK,
            self::R_FIREWALL,
            self::R_SSH,
            self::R_LICENSE,
            self::R_NATS,
            self::R_TIMEZONE,
            self::R_NTP,
            self::R_PHP_FPM,
            self::R_NGINX,
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
        ];

        $this->modified_tables = [];

        $client = new BeanstalkClient();
        $client->subscribe(self::class, [$this, 'processModelChanges']);
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        $client->setTimeoutHandler([$this, 'timeoutHandler']);


        while (true) {
            $client->wait();
        }
    }

    /**
     * Parses for received Beanstalk message
     *
     * @param BeanstalkClient $message
     */
    public function processModelChanges(BeanstalkClient $message): void
    {
        $receivedMessage = json_decode($message->getBody(), true);
        $this->fillModifiedTables($receivedMessage);
        $this->startReload();

        // Send information about models changes to additional modules
        foreach ($this->arrObject as $appClass) {
            $appClass->modelsEventChangeData($receivedMessage);
        }
    }

    /**
     * Collects changes to determine which modules must be reloaded or reconfigured
     *
     * @param $data
     */
    private function fillModifiedTables($data): void
    {
        $count_changes = count($this->modified_tables);
        $called_class = $data['model'] ?? '';

        // Clear all caches on any changed models
        PbxSettings::clearCache($called_class);

        // Обновление настроек в объектах, в оперативной памяти.
        $additionalModules = $this->di->getShared('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            // Проверим, зависит ли объект от измененных данных.
            $dependences = $appClass->dependenceModels();
            if (in_array($called_class, $dependences, true)){
                // Получаем новые настройки.
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
                $this->modified_tables[self::R_SIP]     = true;
                break;
            case SoundFiles::class:
                $this->modified_tables[self::R_MOH] = true;
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
                if ($pbxSettings===null){
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
                    $this->modified_tables[self::R_TIMEZONE]    = true;
                    $this->modified_tables[self::R_NGINX]    = true;
                    $this->modified_tables[self::R_PHP_FPM]    = true;
                    $this->modified_tables[self::R_REST_API_WORKER] = true;
                }
                if ($pbxSettings->itHasNTPSettings()) {
                    $this->modified_tables[self::R_NTP]    = true;
                }
                if ($pbxSettings->itHasCallRecordSettings()) {
                    $this->modified_tables[self::R_CALL_EVENTS_WORKER]  = true;
                    $this->modified_tables[self::R_DIALPLAN]  = true;
                }
                break;
            case PbxExtensionModules::class:
                $this->modified_tables[self::R_CONF_MODULES] = true;
                $this->modified_tables[self::R_CRON] = true;
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
            $action = $this->modified_tables[$method_name] ?? null;
            if ($action === null) {
                continue;
            }
            if (method_exists($this, $method_name)) {
                $this->$method_name();
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
    public function reloadNats():void
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
        $nginxConf  = new NginxConf();
        $nginxConf->generateConf();
        $nginxConf->reStart();
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
        Util::processPHPWorker(WorkerApiCommands::class);
    }


    /**
     *  Reloads WorkerCallEvents worker
     */
    public function reloadWorkerCallEvents(): void
    {
        Util::processPHPWorker(WorkerCallEvents::class);
    }

    /**
     *  Reloads modules property
     */
    public function reloadPbxConfModules():void
    {
        $this->arrObject = $this->di->getShared('pbxConfModules');
    }

    /**
     * Timeout handles
     */
    public function timeoutHandler():void
    {
        $this->last_change = time() - $this->timeout;
        $this->startReload();
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