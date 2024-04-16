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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadCloudParametersAction;
use MikoPBX\Common\Models\{ModelsBase, PbxExtensionModules, PbxSettings};
use MikoPBX\Common\Providers\BeanstalkConnectionModelsProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigInterface;
use MikoPBX\Core\Providers\AsteriskConfModulesProvider;
use MikoPBX\Core\System\{BeanstalkClient, SystemMessages, Util};
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadAdviceAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadCloudDescriptionAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadCrondAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadCustomFilesAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadDialplanAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadFail2BanConfAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadFeaturesAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadFirewallAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadIAXAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadLicenseAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadManagerAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadModuleStateAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadMOHAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNatsAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNetworkAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNginxAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNginxConfAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNTPAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadParkingAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadPBXCoreAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadPHPFPMAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadPJSIPAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadQueuesAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRecordSavePeriodAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRestAPIWorkerAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRTPAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadSentryAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadSSHAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadSyslogDAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadTimezoneAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadVoicemailAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadWorkerCallEventsAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\ProcessOtherModels;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\ProcessPBXSettings;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\ReloadManager;
use MikoPBX\Modules\Config\SystemConfigInterface;
use Phalcon\Di;
use Pheanstalk\Contract\PheanstalkInterface;
use RuntimeException;
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
    public const R_MANAGERS = 'reloadManager';
    public const R_QUEUES = 'reloadQueues';
    public const R_DIALPLAN = 'reloadDialplan';
    public const R_PARKING = 'reloadParking';
    public const R_CUSTOM_F = 'updateCustomFiles';
    public const R_FIREWALL = 'reloadFirewall';
    public const R_NETWORK = 'networkReload';
    public const R_IAX = 'reloadIax';
    public const R_SIP = 'reloadSip';
    public const R_RTP = 'rtpReload';
    public const R_PBX_CORE = 'pbxCoreReload';
    public const R_FEATURES = 'reloadFeatures';
    public const R_CRON = 'reloadCron';
    public const  R_NGINX = 'reloadNginx';
    public const  R_NGINX_CONF = 'reloadNginxConf';
    public const  R_FAIL2BAN_CONF = 'reloadFail2BanConf';
    public const R_PHP_FPM = 'reloadPHPFPM';
    public const R_TIMEZONE = 'updateTomeZone';
    public const R_SYSLOG = 'restartSyslogD';
    public const R_SSH = 'reloadSSH';
    public const R_LICENSE = 'reloadLicense';
    public const R_NATS = 'reloadNats';
    public const R_VOICEMAIL = 'reloadVoicemail';
    public const R_REST_API_WORKER = 'reloadRestAPIWorker';
    public const R_CALL_EVENTS_WORKER = 'reloadWorkerCallEvents';
    public const R_PBX_MODULE_STATE = 'afterModuleStateChanged';
    public const R_MOH = 'reloadMoh';
    public const R_NTP = 'reloadNtp';
    public const R_UPDATE_REC_SAVE_PERIOD = 'updateRecordSavePeriod';
    public const R_ADVICE = 'cleanupAdviceCache';
    public const R_RESET_DESCRIPTION = 'resetDescription';
    public const R_SENTRY = 'reloadSentry';
    public const R_CLOUD_PROVISION = 'ReloadCloudParametersAction';

    private int $last_change;
    private array $modified_tables = [];

    private int $timeout = 2;

    // Array of core conf objects
    private array $arrAsteriskConfObjects;

    // Array of reload actions sorted by its priority
    private array $reloadActions = [];
    private array $pbxSettingsDependencyTable = [];
    private array $modelsDependencyTable = [];

    private BeanstalkClient $beanstalkClient;

    private ReloadManager $reloadManager;

    /**
     * Starts the model events worker.
     *
     * This method initializes the worker, subscribes to necessary events, and enters a loop waiting for these events.
     * It acts as the main entry point for the worker's lifecycle.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $this->initializeWorker();
        $this->subscribeToEvents();
        $this->waitForEvents();
    }

    /**
     * Initializes the worker by setting up initial state, loading configurations, and preparing dependencies.
     *
     * It sets the last change time, gets shared instances from the DI container, initializes PBX settings and model dependency tables,
     * and sets up priority actions for reload.
     *
     * @return void
     */
    private function initializeWorker(): void
    {

        $this->beanstalkClient = $this->getBeanstalkClient();

        $this->last_change = time() - 2;

        // Array of core conf objects
        $this->arrAsteriskConfObjects = $this->di->getShared(AsteriskConfModulesProvider::SERVICE_NAME);

        // Initializes the PBX settings dependency table.
        $this->pbxSettingsDependencyTable = ProcessPBXSettings::getDependencyTable();

        // Initializes the models dependency table.
        $this->modelsDependencyTable = ProcessOtherModels::getDependencyTable();

        // Initializes the possible reload actions table.
        $this->reloadActions = $this->getReloadActions();

        // Initializes the reload manager.
        $this->reloadManager = new ReloadManager($this->reloadActions);

        $this->modified_tables = [];
    }

    /**
     * Create BeanstalkClient connection
     * @return BeanstalkClient
     */
    private function getBeanstalkClient(): BeanstalkClient
    {
        $di = Di::getDefault();
        if (!$di) {
            throw new RuntimeException("Dependency Injection container is not set.");
        }
        return $di->getShared(BeanstalkConnectionModelsProvider::SERVICE_NAME);
    }

    /**
     * Get priority reload actions
     * @return array
     */
    private function getReloadActions(): array
    {
        return [
            self::R_PBX_MODULE_STATE => new ReloadModuleStateAction(),
            self::R_TIMEZONE => new ReloadTimezoneAction(),
            self::R_SYSLOG => new ReloadSyslogDAction,
            self::R_REST_API_WORKER => new ReloadRestAPIWorkerAction(),
            self::R_NETWORK => new ReloadNetworkAction(),
            self::R_FIREWALL => new ReloadFirewallAction(),
            self::R_FAIL2BAN_CONF => new ReloadFail2BanConfAction(),
            self::R_SSH => new ReloadSSHAction(),
            self::R_LICENSE => new ReloadLicenseAction(),
            self::R_SENTRY => new ReloadSentryAction(),
            self::R_NATS => new ReloadNatsAction(),
            self::R_NTP => new ReloadNTPAction(),
            self::R_PHP_FPM => new ReloadPHPFPMAction(),
            self::R_NGINX => new ReloadNginxAction(),
            self::R_NGINX_CONF => new ReloadNginxConfAction(),
            self::R_CRON => new ReloadCrondAction(),
            self::R_PBX_CORE => new ReloadPBXCoreAction(),
            self::R_FEATURES => new ReloadFeaturesAction(),
            self::R_SIP => new ReloadPJSIPAction(),
            self::R_RTP => new ReloadRTPAction(),
            self::R_IAX => new ReloadIAXAction(),
            self::R_DIALPLAN => new ReloadDialplanAction(),
            self::R_PARKING => new ReloadParkingAction(),
            self::R_QUEUES => new ReloadQueuesAction(),
            self::R_MANAGERS => new ReloadManagerAction(),
            self::R_CUSTOM_F => new ReloadCustomFilesAction(),
            self::R_VOICEMAIL => new ReloadVoicemailAction(),
            self::R_MOH => new ReloadMOHAction(),
            self::R_CALL_EVENTS_WORKER => new ReloadWorkerCallEventsAction(),
            self::R_UPDATE_REC_SAVE_PERIOD => new ReloadRecordSavePeriodAction(),
            self::R_ADVICE => new ReloadAdviceAction(),
            self::R_RESET_DESCRIPTION => new ReloadCloudDescriptionAction(),
            self::R_CLOUD_PROVISION => new ReloadCloudParametersAction()
        ];
    }

    /**
     * Subscribes the worker to relevant Beanstalk queues for processing model changes and handling pings.
     *
     * It ensures that the worker listens for incoming messages related to model changes and system pings,
     * setting up appropriate callbacks for each.
     *
     * @return void
     */
    private function subscribeToEvents(): void
    {
        $this->beanstalkClient->subscribe(self::class, [$this, 'processModelChanges']);
        $this->beanstalkClient->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        $this->beanstalkClient->setTimeoutHandler([$this, 'timeoutHandler']);
    }

    /**
     * Waits for events in a loop until a restart condition is met.
     *
     * This method keeps the worker in a loop, processing incoming events from the Beanstalk queue.
     * The loop continues until an external condition triggers the need to restart the worker.
     *
     * @return void
     */
    private function waitForEvents(): void
    {
        while ($this->needRestart === false) {
            $this->beanstalkClient->wait();
        }
        $this->timeoutHandler(); // Execute all collected changes before exit
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
        foreach ($this->reloadActions as $method_name => $calledClass) {
            $action = $this->modified_tables[$method_name] ?? null;

            // Skip if there is no change for this method
            if ($action === null) {
                continue;
            }

            // Call the method if it exists
            $className = get_class($calledClass);
            SystemMessages::sysLogMsg(__METHOD__, "Process reload action: {$className}", LOG_DEBUG);
            $parameters = $this->modified_tables['parameters'][$method_name] ?? [];
            $this->reloadManager->processReload($method_name, $parameters);

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
        try {
            // Decode the received message
            $receivedMessage = json_decode($message->getBody(), true, 512, JSON_THROW_ON_ERROR);

            // Check the source of the message and perform actions accordingly
            if ($receivedMessage['source'] === BeanstalkConnectionModelsProvider::SOURCE_INVOKE_ACTION
                && array_key_exists($receivedMessage['action'], $this->reloadActions))
            {
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
        } catch (Throwable $exception) {
            $this->needRestart = true;
            CriticalErrorsHandler::handleExceptionWithSyslog($exception);
        }
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
        SystemMessages::sysLogMsg(__METHOD__, "New changes " . json_encode($data), LOG_DEBUG);

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
                if (in_array($called_class, $dependencies, true) && method_exists($configClassObj, AsteriskConfigInterface::GET_SETTINGS)) {
                    // Retrieve the new settings for the config class
                    call_user_func([$configClassObj, AsteriskConfigInterface::GET_SETTINGS]);
                }
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
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
        $jobData = json_encode(['source' => BeanstalkConnectionModelsProvider::SOURCE_INVOKE_ACTION, 'action' => $action, 'parameters' => $parameters, 'model' => '']);
        // Publish the job to the Beanstalk queue
        $queue->publish($jobData, self::class, $priority, PheanstalkInterface::DEFAULT_DELAY, 3600);
    }
}

/**
 * The start point
 */
WorkerModelsEvents::startWorker($argv ?? []);