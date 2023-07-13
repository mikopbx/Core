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
    ModelsBase,
    NetworkFilters,
    OutgoingRoutingTable,
    OutWorkTimes,
    PbxExtensionModules,
    PbxSettings,
    Sip,
    SipHosts,
    SoundFiles,
    Users
};
use MikoPBX\Common\Providers\BeanstalkConnectionModelsProvider;
use MikoPBX\Common\Providers\ModulesDBConnectionsProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigInterface;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigClass;
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
    Util
};
use MikoPBX\Core\Providers\AsteriskConfModulesProvider;
use MikoPBX\Modules\Config\SystemConfigInterface;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Di;
use Pheanstalk\Contract\PheanstalkInterface;
use Throwable;

ini_set('error_reporting', E_ALL);
ini_set('display_startup_errors', 1);

/**
 * WorkerModelsEvents.
 *
 * @package MikoPBX\Core\Workers
 */
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

    private const R_RTP = 'rtpReload';

    private const R_PBX_CORE = 'pbxCoreReload';

    private const R_FEATURES = 'reloadFeatures';

    private const R_CRON = 'reloadCron';

    public const  R_NGINX = 'reloadNginx';

    public const  R_NGINX_CONF = 'reloadNginxConf';

    public const  R_FAIL2BAN_CONF = 'reloadFail2BanConf';

    private const R_PHP_FPM = 'reloadPHPFPM';

    private const R_TIMEZONE = 'updateTomeZone';

    private const R_SYSLOG = 'restartSyslogD';

    private const R_SSH = 'reloadSSH';

    private const R_LICENSE = 'reloadLicense';

    private const R_NATS = 'reloadNats';

    private const R_VOICEMAIL = 'reloadVoicemail';

    private const R_REST_API_WORKER = 'reloadRestAPIWorker';

    private const R_CALL_EVENTS_WORKER = 'reloadWorkerCallEvents';

    private const R_PBX_MODULE_STATE = 'afterModuleStateChanged';

    private const R_MOH = 'reloadMoh';

    private const R_NTP = 'reloadNtp';

    private const R_UPDATE_REC_SAVE_PERIOD = 'updateRecordSavePeriod';

    private int $last_change;
    private array $modified_tables;

    private int $timeout = 2;

    // Array of core conf objects
    private array $arrAsteriskConfObjects;
    private array $PRIORITY_R;
    private array $pbxSettingsDependencyTable = [];
    private array $modelsDependencyTable = [];

    /**
     * Starts the models events worker.
     *
     * @param array $params The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $params): void
    {
        $this->last_change = time() - 2;

        $this->arrAsteriskConfObjects = $this->di->getShared(AsteriskConfModulesProvider::SERVICE_NAME);

        $this->initPbxSettingsDependencyTable();
        $this->initModelsDependencyTable();

        $this->PRIORITY_R = [
            self::R_PBX_MODULE_STATE,
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
            self::R_PBX_CORE,
            self::R_FEATURES,
            self::R_SIP,
            self::R_RTP,
            self::R_IAX,
            self::R_DIALPLAN,
            self::R_QUEUES,
            self::R_MANAGERS,
            self::R_CUSTOM_F,
            self::R_VOICEMAIL,
            self::R_MOH,
            self::R_CALL_EVENTS_WORKER,
            self::R_UPDATE_REC_SAVE_PERIOD,
        ];

        $this->modified_tables = [];

        /** @var BeanstalkClient $client */
        $client = $this->di->getShared(BeanstalkConnectionModelsProvider::SERVICE_NAME);
        $client->subscribe(self::class, [$this, 'processModelChanges']);
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        $client->setTimeoutHandler([$this, 'timeoutHandler']);

        while ($this->needRestart === false) {
            $client->wait();
        }
        // Execute all collected changes before exit
        $this->timeoutHandler();
    }

    /**
     * Initializes the PBX settings dependency table.
     */
    private function initPbxSettingsDependencyTable(): void
    {
        $tables = [];
        // FeaturesSettings
        $tables[] = [
            'settingName' => [
                'PBXLanguage',
                'PBXInternalExtensionLength',
                'PBXCallParkingExt',
                'PBXCallParkingStartSlot',
                'PBXCallParkingEndSlot',
                'PBXFeatureAttendedTransfer',
                'PBXFeatureBlindTransfer',
                'PBXFeatureDigitTimeout',
                'PBXFeatureAtxferNoAnswerTimeout',
                'PBXFeatureTransferDigitTimeout',
                'PBXFeaturePickupExten',
            ],
            'functions' => [
                self::R_FEATURES,
                self::R_DIALPLAN,
            ],
        ];

        // CallRecordSettings
        $tables[] = [
            'settingName' => [
                'PBXRecordCalls',
                'PBXRecordCallsInner',
                'PBXSplitAudioThread',
            ],
            'functions' => [
                self::R_DIALPLAN,
            ],
        ];

        // CallRecordSettings / The period of storing conversation records
        $tables[] = [
            'settingName' => [
                'PBXRecordSavePeriod',
            ],
            'functions' => [
                self::R_UPDATE_REC_SAVE_PERIOD,
            ],
        ];

        // AMIParameters
        $tables[] = [
            'settingName' => [
                'AMIPort',
                'AJAMPort',
                'AJAMPortTLS',
            ],
            'functions' => [
                self::R_MANAGERS,
            ],
        ];

        // IaxParameters
        $tables[] = [
            'settingName' => [
                'IAXPort',
            ],
            'functions' => [
                self::R_IAX,
            ],
        ];

        // Guest calls without authorization
        $tables[] = [
            'settingName' => [
                'PBXAllowGuestCalls',
                'UseWebRTC',
            ],
            'functions' => [
                self::R_SIP,
                self::R_DIALPLAN,
            ],
        ];

        // SipParameters
        $tables[] = [
            'settingName' => [
                'SIPPort',
                'TLS_PORT',
                'SIPDefaultExpiry',
                'SIPMinExpiry',
                'SIPMaxExpiry',
                'PBXLanguage',
            ],
            'functions' => [
                self::R_SIP,
            ],
        ];

        // RTPParameters
        $tables[] = [
            'settingName' => [
                'RTPPortFrom',
                'RTPPortTo',
                'RTPStunServer',
            ],
            'functions' => [
                self::R_RTP,
            ],
        ];

        // SSHParameters
        $tables[] = [
            'settingName' => [
                'SSHPort',
                'SSHRsaKey',
                'SSHDssKey',
                'SSHPassword',
                'SSHecdsaKey',
                'SSHAuthorizedKeys',
                'SSHDisablePasswordLogins',
            ],
            'functions' => [
                self::R_SSH,
            ],
        ];

        // FirewallParameters
        $tables[] = [
            'settingName' => [
                'SIPPort',
                'TLS_PORT',
                'RTPPortFrom',
                'RTPPortTo',
                'IAXPort',
                'AMIPort',
                'AJAMPort',
                'AJAMPortTLS',
                'WEBPort',
                'WEBHTTPSPort',
                'SSHPort',
                'PBXFirewallEnabled',
                'PBXFail2BanEnabled',
            ],
            'functions' => [
                self::R_FIREWALL,
            ],
            'strPosKey' => 'FirewallSettings',
        ];

        // FirewallParameters
        $tables[] = [
            'settingName' => [
                'WEBPort',
                'WEBHTTPSPort',
                'WEBHTTPSPublicKey',
                'WEBHTTPSPrivateKey',
                'RedirectToHttps',
            ],
            'functions' => [
                self::R_NGINX,
            ],
        ];

        // CronParameters
        $tables[] = [
            'settingName' => [
                'RestartEveryNight',
            ],
            'functions' => [
                self::R_CRON,
            ],
        ];

        // DialplanParameters
        $tables[] = [
            'settingName' => [
                'PBXLanguage',
                'PBXRecordAnnouncementIn',
                'PBXRecordAnnouncementOut',
            ],
            'functions' => [
                self::R_DIALPLAN,
            ],
        ];
        // DialplanParameters
        $tables[] = [
            'settingName' => [
                'PBXLanguage',
            ],
            'functions' => [
                self::R_PBX_CORE,
            ],
        ];

        // VoiceMailParameters
        $tables[] = [
            'settingName' => [
                'MailTplVoicemailSubject',
                'MailTplVoicemailBody',
                'MailTplVoicemailFooter',
                'MailSMTPSenderAddress',
                'MailSMTPUsername',
                'PBXTimezone',
                'VoicemailNotificationsEmail',
                'SystemNotificationsEmail',
                'SystemEmailForMissed',
            ],
            'functions' => [
                self::R_VOICEMAIL,
            ],
        ];

        // VisualLanguageSettings
        $tables[] = [
            'settingName' => [
                'SSHLanguage',
                'WebAdminLanguage',
            ],
            'functions' => [
                self::R_REST_API_WORKER,
            ],
        ];

        // LicenseSettings
        $tables[] = [
            'settingName' => [
                'PBXLicense',
            ],
            'functions' => [
                self::R_LICENSE,
                self::R_NATS,
            ],
        ];

        // TimeZoneSettings
        $tables[] = [
            'settingName' => [
                'PBXTimezone',
            ],
            'functions' => [
                self::R_TIMEZONE,
                self::R_NGINX,
                self::R_PHP_FPM,
                self::R_REST_API_WORKER,
                self::R_CALL_EVENTS_WORKER,
                self::R_SYSLOG,
            ],
        ];

        // NTPSettings
        $tables[] = [
            'settingName' => [
                'PBXManualTimeSettings',
                'NTPServer',
                'PBXTimezone',
            ],
            'functions' => [
                self::R_NTP,
            ],
        ];

        $this->pbxSettingsDependencyTable = $tables;
    }

    /**
     * Initializes the models dependency table.
     */
    private function initModelsDependencyTable(): void
    {
        $tables = [];
        $tables[] = [
            'settingName' => [
                AsteriskManagerUsers::class,
            ],
            'functions' => [
                self::R_MANAGERS,
            ],
        ];

        $tables[] = [
            'settingName' => [
                CallQueueMembers::class,
            ],
            'functions' => [
                self::R_QUEUES,
            ],
        ];

        $tables[] = [
            'settingName' => [
                CallQueues::class,
            ],
            'functions' => [
                self::R_QUEUES,
                self::R_DIALPLAN,
            ],
        ];
        $tables[] = [
            'settingName' => [
                ExternalPhones::class,
                Extensions::class,
                DialplanApplications::class,
                IncomingRoutingTable::class,
                IvrMenu::class,
                IvrMenuActions::class,
                OutgoingRoutingTable::class,
                OutWorkTimes::class,
                ConferenceRooms::class,
            ],
            'functions' => [
                self::R_DIALPLAN,
            ],
        ];

        $tables[] = [
            'settingName' => [
                CustomFiles::class,
            ],
            'functions' => [
                self::R_CUSTOM_F,
            ],
        ];

        $tables[] = [
            'settingName' => [
                Sip::class,
            ],
            'functions' => [
                self::R_SIP,
                self::R_DIALPLAN,
                self::R_FIREWALL,
            ],
        ];

        $tables[] = [
            'settingName' => [
                Users::class,
                ExtensionForwardingRights::class,
            ],
            'functions' => [
                self::R_SIP,
                self::R_DIALPLAN,
            ],
        ];

        $tables[] = [
            'settingName' => [
                FirewallRules::class,
                Fail2BanRules::class,
            ],
            'functions' => [
                self::R_FIREWALL,
            ],
        ];

        $tables[] = [
            'settingName' => [
                Iax::class,
            ],
            'functions' => [
                self::R_IAX,
                self::R_DIALPLAN,
            ],
        ];

        $tables[] = [
            'settingName' => [
                Codecs::class,
            ],
            'functions' => [
                self::R_IAX,
                self::R_SIP,
            ],
        ];

        $tables[] = [
            'settingName' => [
                SoundFiles::class,
            ],
            'functions' => [
                self::R_MOH,
                self::R_DIALPLAN,
            ],
        ];

        $tables[] = [
            'settingName' => [
                LanInterfaces::class,
            ],
            'functions' => [
                self::R_NETWORK,
                self::R_IAX,
                self::R_SIP,
            ],
        ];

        $tables[] = [
            'settingName' => [
                SipHosts::class,
            ],
            'functions' => [
                self::R_FIREWALL,
                self::R_SIP,
            ],
        ];

        $tables[] = [
            'settingName' => [
                NetworkFilters::class,
            ],
            'functions' => [
                self::R_FIREWALL,
                self::R_SIP,
                self::R_MANAGERS,
            ],
        ];

        $this->modelsDependencyTable = $tables;
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
     * Starts the reload process if there are modified tables.
     *
     * @return void
     */
    private function startReload(): void
    {
        // Check if there are any modified tables
        if (count($this->modified_tables) === 0) {
            return;
        }

        // Check if enough time has passed since the last change
        $delta = time() - $this->last_change;
        if ($delta < $this->timeout) {
            return;
        }

        // Process changes for each method in priority order
        foreach ($this->PRIORITY_R as $method_name) {
            $action = $this->modified_tables[$method_name] ?? null;
            $parameters = $this->modified_tables['parameters'][$method_name] ?? null;

            // Skip if there is no change for this method
            if ($action === null) {
                continue;
            }

            // Call the method if it exists
            if (method_exists($this, $method_name)) {
                Util::sysLogMsg(__METHOD__, "Process changes by {$method_name}", LOG_DEBUG);
                if ($parameters === null) {
                    $this->$method_name();
                } else {
                    $this->$method_name($parameters);
                }
            }
        }

        // Send information about models changes to additional modules bulky without any details
        PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::MODELS_EVENT_NEED_RELOAD, [$this->modified_tables]);

        // Reset the modified tables array
        $this->modified_tables = [];
    }

    /**
     * Processes model changes received from the Beanstalk queue.
     *
     * @param BeanstalkClient $message The message received from the Beanstalk queue.
     * @return void
     */
    public function processModelChanges(BeanstalkClient $message): void
    {
        // Decode the received message
        $receivedMessage = json_decode($message->getBody(), true, 512, JSON_THROW_ON_ERROR);

        // Check the source of the message and perform actions accordingly
        if ($receivedMessage['source'] === BeanstalkConnectionModelsProvider::SOURCE_INVOKE_ACTION
            && in_array($receivedMessage['action'], $this->PRIORITY_R, true)) {
            // Store the modified table and its parameters
            $this->modified_tables[$receivedMessage['action']] = true;
            $this->modified_tables['parameters'][$receivedMessage['action']] = $receivedMessage['parameters'];
        } elseif ($receivedMessage['source'] === BeanstalkConnectionModelsProvider::SOURCE_MODELS_CHANGED) {

            // Fill the modified tables array with the changes from the received message
            $this->fillModifiedTables($receivedMessage);
        }

        // Start the reload process if there are modified tables
        $this->startReload();

        if (!$receivedMessage) {
            return;
        }

        // Send information about model changes to additional modules with changed data details
        PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::MODELS_EVENT_CHANGE_DATA, [$receivedMessage]);
    }

    /**
     * Fills the modified tables array with changes based on the received data.
     *
     * @param array $data The data containing the changes.
     * @return void
     */
    private function fillModifiedTables(array $data): void
    {
        $count_changes = count($this->modified_tables);
        $called_class = $data['model'] ?? '';
        Util::sysLogMsg(__METHOD__, "New changes " . $called_class, LOG_DEBUG);

        // Clear cache for the called class
        ModelsBase::clearCache($called_class);

        // Get new settings for dependent modules
        $this->getNewSettingsForDependentModules($called_class);

        // Fill modified tables from models
        $this->fillModifiedTablesFromModels($called_class);

        // Fill modified tables from PBX settings data
        $this->fillModifiedTablesFromPbxSettingsData($called_class, $data['recordId']);

        // Fill modified tables from PBX extension modules
        $this->fillModifiedTablesFromPbxExtensionModules($called_class, $data['recordId']);

        // Start counting time when the first task is received
        if ($count_changes === 0 && count($this->modified_tables) > 0) {
            $this->last_change = time();
        }
    }

    /**
     * Retrieves new settings for dependent modules based on the called class.
     *
     * @param string $called_class The called class for which to retrieve settings.
     * @return void
     */
    private function getNewSettingsForDependentModules(string $called_class): void
    {
        foreach ($this->arrAsteriskConfObjects as $configClassObj) {
            try {
                $dependencies = call_user_func([$configClassObj, AsteriskConfigInterface::GET_DEPENDENCE_MODELS]);

                // Check if the called class is a dependency and the config class has the GET_SETTINGS method
                if (in_array($called_class, $dependencies, true)
                    && method_exists($configClassObj, AsteriskConfigInterface::GET_SETTINGS)
                ) {
                    // Retrieve the new settings for the config class
                    call_user_func([$configClassObj, AsteriskConfigInterface::GET_SETTINGS]);
                }
            } catch (Throwable $e) {
                global $errorLogger;
                $errorLogger->captureException($e);
                Util::sysLogMsg(__METHOD__, $e->getMessage(), LOG_ERR);
                continue;
            }
        }
    }

    /**
     * Fills the modified tables array based on the models dependency table and the called class.
     *
     * @param string $called_class The called class.
     * @return void
     */
    private function fillModifiedTablesFromModels(string $called_class): void
    {
        foreach ($this->modelsDependencyTable as $dependencyData) {
            if (!in_array($called_class, $dependencyData['settingName'], true)) {
                continue;
            }
            foreach ($dependencyData['functions'] as $function) {
                $this->modified_tables[$function] = true;
            }
        }
    }

    /**
     * Fills the modified tables array based on the PBX settings data, the called class, and the record ID.
     *
     * @param string $called_class The called class.
     * @param string $recordId The record ID.
     * @return void
     */
    private function fillModifiedTablesFromPbxSettingsData(string $called_class, string $recordId): void
    {
        // Check if the called class is not PbxSettings
        if (PbxSettings::class !== $called_class) {
            return;
        }

        // Clear cache for PbxSettings
        PbxSettings::clearCache(PbxSettings::class);

        // Find the PbxSettings record
        /** @var PbxSettings $pbxSettings */
        $pbxSettings = PbxSettings::findFirstByKey($recordId);
        if ($pbxSettings === null) {
            return;
        }
        $settingName = $pbxSettings->key;

        // Iterate through the PBX settings dependency table and update the modified tables array
        foreach ($this->pbxSettingsDependencyTable as $data) {
            $additionalConditions = (isset($data['strPosKey']) && strpos($settingName, $data['strPosKey']) !== false);

            // Check additional conditions and the setting name
            if (!$additionalConditions && !in_array($settingName, $data['settingName'], true)) {
                continue;
            }

            // Update the modified tables array for each function
            foreach ($data['functions'] as $function) {
                $this->modified_tables[$function] = true;
            }
        }
    }

    /**
     * Fills the modified tables array based on the PBX extension modules data, the called class, and the record ID.
     *
     * @param string $called_class The called class.
     * @param string $recordId The record ID.
     * @return void
     */
    private function fillModifiedTablesFromPbxExtensionModules(string $called_class, string $recordId): void
    {
        // Check if the called class is not PbxExtensionModules
        if (PbxExtensionModules::class !== $called_class) {
            return;
        }

        // Find the module settings record
        $moduleSettings = PbxExtensionModules::findFirstById($recordId);
        if ($moduleSettings !== null) {

            // Invoke the action for the PBX module state with the module settings data
            self::invokeAction(self::R_PBX_MODULE_STATE, $moduleSettings->toArray(), 50);
        }
    }

    /**
     * Invokes an action by publishing a job to the Beanstalk queue.
     *
     * @param string $action The action to invoke.
     * @param array $parameters The parameters for the action.
     * @param int $priority The priority of the job.
     * @return void
     */
    public static function invokeAction(string $action, array $parameters = [], int $priority = 0): void
    {
        $di = Di::getDefault();
        if (!$di) {
            return;
        }
        /** @var BeanstalkClient $queue */
        $queue = $di->getShared(BeanstalkConnectionModelsProvider::SERVICE_NAME);

        // Prepare the job data
        $jobData = json_encode(
            [
                'source' => BeanstalkConnectionModelsProvider::SOURCE_INVOKE_ACTION,
                'action' => $action,
                'parameters' => $parameters,
                'model' => ''
            ]
        );

        // Publish the job to the Beanstalk queue
        $queue->publish(
            $jobData,
            self::class,
            $priority,
            PheanstalkInterface::DEFAULT_DELAY,
            3600
        );
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
     * Applies iptables settings and restart firewall
     */
    public function reloadFirewall(): void
    {
        IptablesConf::updateFirewallRules();
        IptablesConf::reloadFirewall();
    }

    public function pbxCoreReload(): void
    {
        PBX::coreRestart();
    }

    /**
     *  Refreshes networks configs and restarts network daemon
     */
    public function networkReload(): void
    {
        System::networkReload();
    }

    /**
     * Refreshes IAX configs and reload iax2 module
     */
    public function reloadIax(): void
    {
        PBX::iaxReload();
    }

    /**
     * Reloads MOH file list in Asterisk.
     */
    public function reloadMoh(): void
    {
        PBX::mohReload();
    }

    /**
     * Refreshes SIP configs and reload PJSIP module
     */
    public function reloadSip(): void
    {
        PBX::sipReload();
    }

    /**
     * Update RTP config file.
     */
    public function rtpReload(): void
    {
        PBX::rtpReload();
    }

    /**
     *  Refreshes features configs and reload features module
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
     * Update record save period
     */
    public function updateRecordSavePeriod(): void
    {
        PBX::updateSavePeriod();
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
     * Applies modules locations changes and restarts Nginx daemon
     */
    public function reloadNginxConf(): void
    {
        $nginxConf = new NginxConf();
        $nginxConf->generateModulesConfigs();
        $nginxConf->reStart();
    }

    /**
     * Restarts Fail2Ban daemon
     */
    public function reloadFail2BanConf(): void
    {
        Fail2BanConf::reloadFail2ban();
    }

    /**
     * Restarts PHP-FPM daemon
     */
    public function reloadPHPFPM(): void
    {
        PHPConf::reStart();
    }

    /**
     * Configures SSH settings
     */
    public function reloadSSH(): void
    {
        $sshConf = new SSHConf();
        $sshConf->configure();
    }

    /**
     * Reconfigures TomeZone settings
     */
    public function updateTomeZone(): void
    {
        System::timezoneConfigure();
    }

    /**
     * Restarts rsyslog daemon
     */
    public function restartSyslogD(): void
    {
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
     * Process after PBXExtension state changes
     *
     * @param array $pbxModuleRecord
     */
    public function afterModuleStateChanged(array $pbxModuleRecord): void
    {
        // Recreate modules array
        PBXConfModulesProvider::recreateModulesProvider();

        // Recreate database connections
        ModulesDBConnectionsProvider::recreateModulesDBConnections();

        // Hook module methods if they change system configs
        $className = str_replace('Module', '', $pbxModuleRecord['uniqid']);
        $configClassName = "Modules\\{$pbxModuleRecord['uniqid']}\\Lib\\{$className}Conf";
        if (class_exists($configClassName)) {
            $configClassObj = new $configClassName();

            // Reconfigure fail2ban and restart iptables
            if (method_exists($configClassObj, SystemConfigInterface::GENERATE_FAIL2BAN_JAILS)
                && !empty(call_user_func([$configClassObj, SystemConfigInterface::GENERATE_FAIL2BAN_JAILS]))) {
                $this->modified_tables[self::R_FAIL2BAN_CONF] = true;
            }

            // Refresh Nginx conf if module has any locations
            if (method_exists($configClassObj, SystemConfigInterface::CREATE_NGINX_LOCATIONS)
                && !empty(call_user_func([$configClassObj, SystemConfigInterface::CREATE_NGINX_LOCATIONS]))) {
                $this->modified_tables[self::R_NGINX_CONF] = true;
            }

            // Refresh crontab rules if module has any for it
            if (method_exists($configClassObj, SystemConfigInterface::CREATE_CRON_TASKS)) {
                $tasks = [];
                call_user_func_array([$configClassObj, SystemConfigInterface::CREATE_CRON_TASKS], [&$tasks]);
                if (!empty($tasks)) {
                    $this->modified_tables[self::R_CRON] = true;
                }
            }

            // Reconfigure asterisk manager interface
            if (method_exists($configClassObj, AsteriskConfigInterface::GENERATE_MANAGER_CONF)
                && !empty(call_user_func([$configClassObj, AsteriskConfigInterface::GENERATE_MANAGER_CONF]))) {
                $this->modified_tables[self::R_MANAGERS] = true;
            }

            // Hook modules AFTER_ methods
            if ($pbxModuleRecord['disabled'] === '1'
                && method_exists($configClassObj, SystemConfigInterface::ON_AFTER_MODULE_DISABLE)) {
                call_user_func([$configClassObj, SystemConfigInterface::ON_AFTER_MODULE_DISABLE]);
            } elseif ($pbxModuleRecord['disabled'] === '0'
                && method_exists($configClassObj, SystemConfigInterface::ON_AFTER_MODULE_ENABLE)) {
                call_user_func([$configClassObj, SystemConfigInterface::ON_AFTER_MODULE_ENABLE]);
            }
        }
    }
}

/**
 * The start point
 */
WorkerModelsEvents::startWorker($argv ?? []);