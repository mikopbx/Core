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
use MikoPBX\Common\Models\{CustomFiles, ModelsBase, PbxSettings};
use MikoPBX\Common\Providers\BeanstalkConnectionModelsProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigInterface;
use MikoPBX\Core\Providers\AsteriskConfModulesProvider;
use MikoPBX\Core\System\{BeanstalkClient, SystemMessages};
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadCloudDescriptionAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadCloudParametersAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadConferenceAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadCrondAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadDialplanAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadFail2BanConfAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadFeaturesAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadH323Action;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadHepAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadIAXAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadLicenseAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadManagerAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadModulesConfAction;
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
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRecordingSettingsAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRecordSavePeriodAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRestAPIWorkerAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRTPAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadSentryAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadSSHAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadSyslogDAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadTimezoneAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadVoicemailAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadWorkerCallEventsAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\RestartPBXCoreAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\ProcessOtherModels;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\ProcessPBXSettings;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadFirewallAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\ProcessCustomFiles;
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
    private int $last_change;

    // Array of planned reload actions that need to be started
    private array $plannedReloadActions = [];

    private int $timeout = 5;

    // Array of core conf objects
    private array $arrAsteriskConfObjects;

    // Array of reload actions sorted by its priority
    private array $reloadActions = [];

    private array $otherModelsDependencyTable = [];
    private array $pbxSettingsDependencyTable = [];
    private array $customFilesDependencyTable = [];

    private BeanstalkClient $beanstalkClient;


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

        $this->last_change = time() - $this->timeout;

        // Array of core conf objects
        $this->arrAsteriskConfObjects = $this->di->getShared(AsteriskConfModulesProvider::SERVICE_NAME);

        // Initializes the PBX settings model dependency table.
        $this->pbxSettingsDependencyTable = ProcessPBXSettings::getDependencyTable();

        // Initializes the custom files models dependency table.
        $this->customFilesDependencyTable = ProcessCustomFiles::getDependencyTable();

        // Initializes the models dependency table.
        $this->otherModelsDependencyTable = ProcessOtherModels::getDependencyTable();

        // Initializes the possible reload actions table.
        $this->reloadActions = $this->getReloadActionsWithPriority();

        $this->plannedReloadActions = [];
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
    private function getReloadActionsWithPriority(): array
    {
        return [
            ReloadModuleStateAction::class,
            ReloadTimezoneAction::class,
            ReloadSyslogDAction::class,
            ReloadRestAPIWorkerAction::class,
            ReloadNetworkAction::class,
            ReloadFirewallAction::class,
            ReloadFail2BanConfAction::class,
            ReloadSSHAction::class,
            ReloadLicenseAction::class,
            ReloadSentryAction::class,
            ReloadNatsAction::class,
            ReloadNTPAction::class,
            ReloadPHPFPMAction::class,
            ReloadNginxAction::class,
            ReloadNginxConfAction::class,
            ReloadCrondAction::class,
            RestartPBXCoreAction::class,
            ReloadPBXCoreAction::class,
            ReloadModulesConfAction::class,
            ReloadFeaturesAction::class,
            ReloadPJSIPAction::class,
            ReloadRTPAction::class,
            ReloadIAXAction::class,
            ReloadH323Action::class,
            ReloadHepAction::class,
            ReloadDialplanAction::class,
            ReloadParkingAction::class,
            ReloadQueuesAction::class,
            ReloadConferenceAction::class,
            ReloadManagerAction::class,
            ReloadVoicemailAction::class,
            ReloadMOHAction::class,
            ReloadWorkerCallEventsAction::class,
            ReloadRecordingSettingsAction::class,
            ReloadRecordSavePeriodAction::class,
            ReloadCloudDescriptionAction::class,
            ReloadCloudParametersAction::class
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
        // Check if there aren't any planned reload actions
        if (count($this->plannedReloadActions) === 0) {
            SystemMessages::sysLogMsg(__METHOD__, "No planed actions for reload", LOG_DEBUG);
            return;
        }

        // Check if enough time has passed since the last change
        if ((time() - $this->last_change)<$this->timeout) {
            SystemMessages::sysLogMsg(__METHOD__, "Wait more time before starting the reload.", LOG_DEBUG);
            return;
        }

        $executedActions = [];
        // Process changes for each method in priority order
        foreach ($this->reloadActions as $actionClassName) {
            // Skip if there is no change for this method
            if (!array_key_exists($actionClassName, $this->plannedReloadActions)) {
                continue;
            }
            // Call the method if it exists
            try {
                $parameters = $this->plannedReloadActions[$actionClassName]['parameters'];
                $hashes = array_keys($parameters);
                SystemMessages::sysLogMsg($actionClassName, "Start action for the next parameters hashes: ".PHP_EOL . json_encode($hashes, JSON_PRETTY_PRINT), LOG_DEBUG);

                $actionObject = new $actionClassName();
                $actionObject->execute($parameters);
                $executedActions[] = $actionClassName;
            } catch (Throwable $exception) {
                CriticalErrorsHandler::handleExceptionWithSyslog($exception);
            }

        }
        if (count($executedActions)>0){
            SystemMessages::sysLogMsg(__METHOD__, "Reload actions were executed in the next order: ".PHP_EOL . json_encode($executedActions, JSON_PRETTY_PRINT), LOG_DEBUG);
        }

        // Send information about models changes to additional modules bulky without any details
        PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::MODELS_EVENT_NEED_RELOAD, [$this->plannedReloadActions]);

        // Reset the modified tables array
        $this->plannedReloadActions = [];
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
                && in_array($receivedMessage['action'], $this->reloadActions)) {
                // Store the modified table and its parameters
                $this->planReloadAction($receivedMessage['action'], $receivedMessage['parameters']);

            } elseif ($receivedMessage['source'] === BeanstalkConnectionModelsProvider::SOURCE_MODELS_CHANGED) {
                // Fill the modified tables array with the changes from the received message
                $this->fillModifiedTables($receivedMessage);

                // Check the model events to renew advice cache
                WorkerPrepareAdvice::afterModelEvents($receivedMessage);
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
        $countPlannedActions = count($this->plannedReloadActions);
        $modifiedModel = $data['model'] ?? '';
        if (empty($modifiedModel)){
            return;
        }

        SystemMessages::sysLogMsg(__METHOD__, "New changes received:".PHP_EOL . json_encode($data, JSON_PRETTY_PRINT), LOG_DEBUG);

        // Clear cache for the called class
        ModelsBase::clearCache($modifiedModel);

        // Get new settings for dependent modules
        $this->getNewSettingsForDependentModules($modifiedModel);

        // Plan new reload actions
        $this->planReloadActionsForCustomFiles($modifiedModel, $data);
        $this->planReloadActionsForPbxSettings($modifiedModel, $data);
        $this->planReloadActionsForOtherModels($modifiedModel, $data);

        // Start counting time when the new reload actions were received
        if ($countPlannedActions === 0 && count($this->plannedReloadActions) > 0) {
            $this->last_change = time();
        }
    }

    /**
     * Retrieves new settings for dependent modules based on the called class.
     *
     * @param string $modifiedModel The called class for which to retrieve settings.
     * @return void
     */
    private function getNewSettingsForDependentModules(string $modifiedModel): void
    {
        foreach ($this->arrAsteriskConfObjects as $configClassObj) {
            try {
                $dependencies = call_user_func([$configClassObj, AsteriskConfigInterface::GET_DEPENDENCE_MODELS]);
                // Check if the called class is a dependency and the config class has the GET_SETTINGS method
                if (in_array($modifiedModel, $dependencies, true) && method_exists($configClassObj, AsteriskConfigInterface::GET_SETTINGS)) {
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
     * @param string $modifiedModel The called model class.
     * @param array $modelData Data received during model change.
     * @return void
     */
    private function planReloadActionsForOtherModels(string $modifiedModel, array $modelData): void
    {
        foreach ($this->otherModelsDependencyTable as $dependencyData) {
            if (!in_array($modifiedModel, $dependencyData['modelClasses'], true)) {
                continue;
            }
            foreach ($dependencyData['actions'] as $action) {
                $this->planReloadAction($action, $modelData);
            }
        }
    }

    /**
     * Fills the modified tables array based on the custom files data, the called class, and the record ID.
     *
     * @param string $modifiedModel The modified model class (Must be CustomFiles)
     * @param array $modelData Data received during model change.
     * @return void
     */
    private function planReloadActionsForCustomFiles(string $modifiedModel, array $modelData): void
    {
        // Check if the called class is not CustomFiles
        if (CustomFiles::class !== $modifiedModel || empty($modelData['recordId'])) {
            return;
        }

        $changedCustomFile = CustomFiles::findFirstById($modelData['recordId']);
        if ($changedCustomFile === null || $changedCustomFile->changed !== '1') {
            return;
        }

        foreach ($this->customFilesDependencyTable as $dependencyData) {
            // The rule for all files or the rule only for specific file
            if ($dependencyData['filePath'] === '*' || strcasecmp($changedCustomFile->filepath, $dependencyData['filePath']) === 0) {
                foreach ($dependencyData['actions'] as $action) {
                    $this->planReloadAction($action, $modelData);
                }
            }
        }

        // After actions are invoked, reset the changed status and save the file data
        $changedCustomFile->writeAttribute("changed", '0');
        $changedCustomFile->save();
    }

    /**
     * Add new reload action with parameters to the planned reload actions array.
     *
     * @param string $action The name of the action to be executed.
     * @param array $parameters The parameters to be passed to the action.
     * @return void
     */
    private function planReloadAction(string $action, array $parameters = []): void
    {
        $newHash = $this->createUniqueKeyFromArray($parameters);
        if (!array_key_exists($action, $this->plannedReloadActions)) {
            $this->plannedReloadActions[$action]['parameters'][$newHash] = $parameters;
            SystemMessages::sysLogMsg(__METHOD__, "New reload task $action planned with parameters (hash=$newHash):".PHP_EOL . json_encode($parameters, JSON_PRETTY_PRINT), LOG_DEBUG);
        } else {
            foreach ($this->plannedReloadActions[$action]['parameters'] as $oldHash=>$existParameters) {
                if ($newHash === $oldHash) {
                    return;
                }
                $this->plannedReloadActions[$action]['parameters'][$newHash] = $parameters;
                SystemMessages::sysLogMsg(__METHOD__, "Existing reload task $action received a new parameters (hash=$newHash)".PHP_EOL . json_encode($parameters, JSON_PRETTY_PRINT), LOG_DEBUG);
            }
        }

    }

    /**
     * Fills the modified tables array based on the PBX settings data, the called class, and the record ID.
     *
     * @param string $modifiedModel The modified model class (Must be PbxSettings)
     * @param array $modelData Data received during model change.
     * @return void
     */
    private function planReloadActionsForPbxSettings(string $modifiedModel, array $modelData): void
    {
        // Check if the called class is not PbxSettings
        if (PbxSettings::class !== $modifiedModel  || empty($modelData['recordId'])) {
            return;
        }

        // Clear cache for PbxSettings
        PbxSettings::clearCache(PbxSettings::class);

        // Find the PbxSettings record
        /** @var PbxSettings $pbxSettings */
        $pbxSettings = PbxSettings::findFirstByKey($modelData['recordId']);
        if ($pbxSettings === null) {
            return;
        }
        $key = $pbxSettings->key;

        // Iterate through the PBX settings dependency table and update the modified tables array
        foreach ($this->pbxSettingsDependencyTable as $data) {
            $additionalConditions = (isset($data['strPosKey']) && strpos($key, $data['strPosKey']) !== false);

            // Check additional conditions and the setting name
            if (!$additionalConditions && !in_array($key, $data['keys'], true)) {
                continue;
            }

            // Update the modified tables array for each function
            foreach ($data['actions'] as $action) {
                $this->planReloadAction($action, $modelData);
            }
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

    /**
     * Callback for the ping to keep the connection alive.
     *
     * @param BeanstalkClient $message The received message.
     *
     * @return void
     */
    public function pingCallBack(BeanstalkClient $message): void
    {
        // Start the reload process if there are modified tables
        $this->startReload();
        $message->reply(json_encode($message->getBody() . ':pong'));
    }

    private function createUniqueKeyFromArray(array $array) {
        // Convert the array to JSON string
        $json = json_encode($array);

        // Create an MD5 hash of the JSON string
        return md5($json);
    }
}

/**
 * The start point
 */
WorkerModelsEvents::startWorker($argv ?? []);