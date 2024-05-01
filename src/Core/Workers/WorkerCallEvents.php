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

use MikoPBX\Core\System\{BeanstalkClient, Directories, SystemMessages, Util};
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\Asterisk\Configs\CelConf;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\ActionCelAnswer;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\ActionCelAttendedTransfer;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\SelectCDR;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\UpdateDataInDB;
use Phalcon\Di;
use Phalcon\Exception;
use Phalcon\Text;
use Throwable;
use DateTime;

/**
 * Class WorkerCallEvents
 *
 * Worker class that handles call events.
 * It can add/remove/exist active channels, enable monitor,
 * start/stop mix monitor, and update recording options among other things.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerCallEvents extends WorkerBase
{
    public const CACHE_KEY_RECORDINGS = 'Workers:WorkerCallEvents:RecordingsSettingsSynced';
    public array $mixMonitorChannels = [];
    public array $checkChanHangupTransfer = [];
    protected bool $record_calls = true;
    protected bool $split_audio_thread = false;
    private array $activeChannels = [];
    private array $innerNumbers = [];
    private array $exceptionsNumbers = [];
    private bool $notRecInner = false;

    private int $deleteCdrTimer = 61;

    /**
     * Adds a new active channel to the cache.
     *
     * @param string $channel The name of the channel to be added.
     *
     * @return void
     */
    public function addActiveChan(string $channel, string $id = ''): void
    {
        // Exclude local channels
        if (stripos($channel, 'local') === 0) {
            return;
        }
        $this->activeChannels[$channel] = $id;
    }

    /**
     * Removes an active channel from the cache.
     *
     * @param string $channel The name of the channel to be removed.
     *
     * @return void
     */
    public function removeActiveChan(string $channel): void
    {
        unset($this->activeChannels[$channel]);
    }

    /**
     * Checks whether a channel exists in the cache.
     *
     * @param string $channel The name of the channel to check.
     *
     * @return bool True if the channel exists, false otherwise.
     */
    public function existsActiveChan(string $channel): bool
    {
        return isset($this->activeChannels[$channel]);
    }

    /**
     * Get chan linked ID.
     *
     * @param string $channel The name of the channel to check.
     *
     * @return string channel ID
     */
    public function getActiveChanId(string $channel): string
    {
        return $this->activeChannels[$channel]??'';
    }

    /**
     * Determines whether to enable the monitor for a given source and destination.
     *
     * @param string $src Source.
     * @param string $dst Destination.
     *
     * @return bool True if monitor should be enabled, false otherwise.
     */
    public function enableMonitor(string $src, string $dst): bool
    {
        $src = substr($src, -9);
        $dst = substr($dst, -9);
        $enable = true;
        $isInner = in_array($src, $this->innerNumbers, true) && in_array($dst, $this->innerNumbers, true);
        if (($this->notRecInner && $isInner) ||
            in_array($src, $this->exceptionsNumbers, true) || in_array($dst, $this->exceptionsNumbers, true)) {
            $enable = false;
        }
        return $enable;
    }

    /**
     * Initiates the recording of a conversation on a channel.
     *
     * @param string $channel The name of the channel where recording will be initiated.
     * @param string $file_name Optional name of the file where the recording will be saved.
     * @param string $sub_dir Optional subdirectory where the recording file will be saved.
     * @param string $full_name Optional full name for the recording file.
     * @param string $actionID Optional action ID for the recording action.
     *
     * @return string The name of the result file.
     */
    public function MixMonitor(string $channel, string $file_name = '', string $sub_dir = '', string $full_name = '', string $actionID = ''): string
    {
        $resFile = $this->mixMonitorChannels[$channel] ?? '';
        if ($resFile !== '') {
            return $resFile;
        }
        $resFile = '';
        $file_name = str_replace('/', '_', $file_name);
        if ($this->record_calls) {
            [$f, $options] = $this->setMonitorFilenameOptions($full_name, $sub_dir, $file_name);
            $arr = $this->am->GetChannels(false);
            if (!in_array($channel, $arr, true)) {
                return '';
            }
            $srcFile = "{$f}.wav";
            $resFile = "{$f}.mp3";
            $this->am->MixMonitor($channel, $srcFile, $options, '', $actionID);
            $this->mixMonitorChannels[$channel] = $resFile;
            $this->am->UserEvent('StartRecording', ['recordingfile' => $resFile, 'recchan' => $channel]);
        }
        return $resFile;
    }

    /**
     * Sets the file name options for the monitor.
     *
     * @param string $full_name The full name of the file. If it exists, it will be used as is.
     * @param string $sub_dir The subdirectory where the file will be stored.
     * @param string $file_name The name of the file.
     *
     * @return array An array containing the full file path and the options for the recording.
     *               If $this->split_audio_thread is true, options will be set to split audio in two separate files (in/out).
     *               Otherwise, 'ab' will be returned as options.
     */
    public function setMonitorFilenameOptions(string $full_name, string $sub_dir, string $file_name): array
    {
        $full_name = Util::trimExtensionForFile($full_name).'.wav';
        if (!file_exists($full_name)) {
            $monitor_dir = Directories::getDir(Directories::AST_MONITOR_DIR);
            if (empty($sub_dir)) {
                $sub_dir = date('Y/m/d/H/');
            }
            $f = "{$monitor_dir}/{$sub_dir}{$file_name}";
        } else {
            $f = Util::trimExtensionForFile($full_name);
        }
        if ($this->split_audio_thread) {
            $options = "abr({$f}_in.wav)t({$f}_out.wav)";
        } else {
            $options = 'ab';
        }
        return array($f, $options);
    }

    /**
     * Stops the MixMonitor (conversation recording) on a specified channel.
     *
     * @param string $channel The name of the channel on which the MixMonitor will be stopped.
     * @param string $actionID (Optional) ActionID for the MixMonitor stop command, useful for tracking the request in Asterisk.
     *                         Default is an empty string.
     *
     * @return void This function does not return any value.
     */
    public function StopMixMonitor($channel, string $actionID = ''): void
    {
        if (isset($this->mixMonitorChannels[$channel])) {
            unset($this->mixMonitorChannels[$channel]);
        } else {
            return;
        }
        if ($this->record_calls) {
            $this->am->StopMixMonitor($channel, $actionID);
        }
    }

    /**
     * Starts the process, sets up initial options and worker subscribers.
     *
     * @param array $argv The command-line arguments passed to the worker.
     *
     * @return void This function does not return any value.
     * @throws Exception
     */
    public function start(array $argv): void
    {
        // Update the recording options for the worker
        $this->updateRecordingOptions();
        $this->deleteOldRecords();

        // Initialize the mixMonitorChannels and checkChanHangupTransfer arrays
        $this->mixMonitorChannels = [];
        $this->checkChanHangupTransfer = [];

        // Get the asterisk manager interface
        $this->am = Util::getAstManager('off');

        // Create a new Beanstalk client
        $client = new BeanstalkClient(self::class);
        if ($client->isConnected() === false) {
            // Log the failed connection and pause for 2 seconds before returning
            SystemMessages::sysLogMsg(self::class, 'Fail connect to beanstalkd...');
            sleep(2);
            return;
        }

        // Subscribe to different tubes for different worker tasks
        $client->subscribe(CelConf::BEANSTALK_TUBE, [$this, 'callEventsWorker']);
        $client->subscribe(self::class, [$this, 'otherEvents']);
        $client->subscribe(WorkerCdr::SELECT_CDR_TUBE, [$this, 'selectCDRWorker']);
        $client->subscribe(WorkerCdr::UPDATE_CDR_TUBE, [$this, 'updateCDRWorker']);

        // Subscribe to ping tube for keep alive checks
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);

        // Set the error handler for the client
        $client->setErrorHandler([$this, 'errorHandler']);

        // Keep the worker process running as long as a restart is not required
        while ($this->needRestart === false) {
            $client->wait();
        }
    }

    /**
     * This function is used to update the recording options of the system.
     *
     * @return void This function does not return any value.
     */
    private function updateRecordingOptions(): void
    {
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);
        $synced = $managedCache->get(self::CACHE_KEY_RECORDINGS);
        if ($synced !== null) {
            return;
        }

        // Reset variables to prevent memory leak
        $this->innerNumbers = [];
        $this->exceptionsNumbers = [];

        // Initialize an array to store users' numbers
        $usersNumbers = [];

        // Initialize an array to store users' data
        $users = [];

        // Define a filter to get specific data from Extensions
        $filter = [
            'conditions' => 'userid <> "" and userid>0 ',
            'columns' => 'userid,number,type',
            'order' => 'type DESC'
        ];
        $extensionsData = Extensions::find($filter);
        // Loop through each extension
        /** @var Extensions $extension */
        foreach ($extensionsData as $extension) {
            if ($extension->type === "SIP") {
                // If the extension type is SIP, store the number
                $usersNumbers[$extension->number][] = $extension->number;
                $users[$extension->userid] = $extension->number;
            } else {
                // Otherwise, store the internal number
                $internalNumber = $users[$extension->userid] ?? '';
                if ($internalNumber !== '') {
                    $usersNumbers[$internalNumber][] = $extension->number;
                }
            }
        }
        // Clear the users and extensionsData arrays for memory efficiency
        unset($users, $extensionsData);

        // Define a new filter to get specific data from Sip
        $filter = [
            'conditions' => 'type="peer"',
            'columns' => 'extension,enableRecording',
        ];

        $peers = Sip::find($filter);

         // Loop through each peer
        foreach ($peers as $peer) {
            // Get the numbers associated with this peer
            $numbers = $usersNumbers[$peer->extension] ?? [];
            foreach ($numbers as $num) {
                // Trim the last 9 characters from the number
                $num = substr($num, -9);

                // Store the number
                $this->innerNumbers[] = $num;

                // If recording is not enabled for this peer, store it as an exception
                if ($peer->enableRecording === '0') {
                    $this->exceptionsNumbers[] = $num;
                }
            }
        }

        // Set some class properties based on the PbxSettings values
        $this->notRecInner = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_RECORD_CALLS_INNER) === '0';
        $this->record_calls = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_RECORD_CALLS) === '1';
        $this->split_audio_thread = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_SPLIT_AUDIO_THREAD) === '1';

        // Store the current timestamp in the cache to track the last execution
        $managedCache->set(self::CACHE_KEY_RECORDINGS, time(), 86400); // Repeat every day
    }

    /**
     * Reset a cache key to rebuild recording settings
     * @return void
     */
    public static function afterChangeRecordingsSettings(): void
    {
        $di = Di::getDefault();
        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $managedCache->delete(self::CACHE_KEY_RECORDINGS);
    }

    /**
     * Ping callback for keep alive check
     *
     * @param BeanstalkClient $message
     */
    public function pingCallBack(BeanstalkClient $message): void
    {
        parent::pingCallBack($message);
        $this->updateRecordingOptions();
        $this->deleteOldRecords();
    }

    /**
     * Calls the events worker.
     *
     * @param  BeanstalkClient $tube object.
     *
     * @return void
     */
    public function callEventsWorker(BeanstalkClient $tube): void
    {
        // Decode the body of the tube object
        $data = json_decode($tube->getBody(), true);

        // Get the event name from the data array
        $event = $data['EventName'] ?? '';

        // If event is 'ANSWER', call ActionCelAnswer::execute and return
        if ('ANSWER' === $event) {
            ActionCelAnswer::execute($this, $data);
        }
        if('ATTENDEDTRANSFER' === $event){
            ActionCelAttendedTransfer::execute($this, $data);
        }
        // If event is not 'USER_DEFINED', return
        if ('USER_DEFINED' !== $event) {
            return;
        }

        // Try to decode the 'AppData' field from base64 and handle any errors
        try {
            $data = json_decode(
                base64_decode($data['AppData'] ?? ''),
                true,
                512,
                JSON_THROW_ON_ERROR
            );
        } catch (Throwable $e) {
            $data = [];
        }

        // Call the 'otherEvents' method with the updated data
        $this->otherEvents($tube, $data);
    }

    /**
     * Handles other events.
     *
     * @param BeanstalkClient $tube The tube object.
     * @param array $data The data array (optional).
     *
     * @return void
     */
    public function otherEvents(BeanstalkClient $tube, array $data = []): void
    {
        // If data array is empty, decode the body of the tube object
        if (empty($data)) {
            $data = json_decode($tube->getBody(), true);
        }

        // Construct the function name based on the action in the data array
        $funcName = "Action_" . $data['action'] ?? '';

        // Check if the function exists in the current class and call it
        if (method_exists($this, $funcName)) {
            $this->$funcName($data);
        }

        // Generate the class name based on the function name
        $className = __NAMESPACE__ . '\Libs\WorkerCallEvents\\' . Text::camelize($funcName, '_');

        // Check if the 'execute' method exists in the generated class and call it
        if (method_exists($className, 'execute')) {
            $className::execute($this, $data);
        }
    }

    /**
     * Updates the CDR worker.
     *
     * @param BeanstalkClient $tube The tube object.
     *
     * @return void
     */
    public function updateCDRWorker(BeanstalkClient $tube): void
    {
        // Get the task from the tube's body
        $task = $tube->getBody();

        // Decode the task into an associative array
        $data = json_decode($task, true);

        // Execute the UpdateDataInDB class with the data
        UpdateDataInDB::execute($data);

        // Reply with a JSON-encoded boolean value indicating success
        $tube->reply(json_encode(true));
    }

    /**
     * Selects the CDR worker.
     *
     * @param BeanstalkClient $tube The tube object.
     *
     * @return void
     */
    public function selectCDRWorker(BeanstalkClient $tube): void
    {
        // Decode the filter from the tube's body
        $filter = json_decode($tube->getBody(), true);

        // Execute the SelectCDR class with the filter and get the result data
        $res_data = SelectCDR::execute($filter);

        // Reply with the result data
        $tube->reply($res_data);
    }

    /**
     * Error handler.
     *
     * @param mixed $m The error message.
     *
     * @return void
     */
    public function errorHandler($m): void
    {
        SystemMessages::sysLogMsg(self::class . '_ERROR', $m, LOG_ERR);
    }

    /**
     * Clearing old cdr records
     * @return void
     */
    public function deleteOldRecords(): void
    {
        // Cleaning will be performed every ping
        $this->deleteCdrTimer++;
        if($this->deleteCdrTimer <= 61){
            return;
        }
        $this->deleteCdrTimer = 0;
        $savePeriod = (int)PbxSettings::getValueByKey(PbxSettingsConstants::PBX_RECORD_SAVE_PERIOD);
        if($savePeriod < 30){
            return;
        }
        $limitData  = (new DateTime())->modify("-$savePeriod days")->format('Y-m-d');
        $connection = $this->di->get(CDRDatabaseProvider::SERVICE_NAME);
        $connection->execute("DELETE FROM cdr_general WHERE start < '$limitData'");
    }
}


// Start worker process
WorkerCallEvents::startWorker($argv ?? []);