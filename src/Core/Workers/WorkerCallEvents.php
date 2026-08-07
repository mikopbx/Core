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

use MikoPBX\Core\System\{BeanstalkClient, Directories, RecordingDeletionLogger, SystemMessages, Util};
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Common\Providers\DatabaseProviderBase;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\ActionCelAnswer;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\ActionCelAttendedTransfer;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\ActionCelLinkedIdEnd;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\DeleteCDR;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\LinkedIdFinalizationQueue;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\SelectCDR;
use MikoPBX\Core\Workers\Libs\WorkerCallEvents\UpdateDataInDB;
use MikoPBX\Core\Asterisk\AsteriskManager;
use Phalcon\Db\Adapter\Pdo\Sqlite as PdoSqliteAdapter;
use Phalcon\Di\Di;
use MikoPBX\Common\Library\Text;
use Throwable;
use DateTime;
use MikoPBX\Core\Asterisk\Configs\CelBeanstalkdConf;

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
    public const string CACHE_KEY_RECORDINGS = 'Workers:WorkerCallEvents:RecordingsSettingsSynced';

    private const float LINKED_ID_FINALIZATION_DELAY_SECONDS = 2.0;

    private BeanstalkClient $clientQueue;

    protected LinkedIdFinalizationQueue $linkedIdFinalizations;

    /**
     * Maximum rows deleted in a single SQLite statement. The writer lock
     * is held for the duration of one chunk, so this bounds how long
     * other CDR writers (Insert/UpdateDataInDB) can be blocked at once.
     * The full-pass budget is governed by {@see self::DELETE_DEADLINE_SECONDS}.
     */
    private const int DELETE_CHUNK_SIZE = 1000;

    /**
     * Hard time-box shared across the entire cleanup pass (general + tmp).
     * Must stay well below the 120s WorkerSafeScripts watchdog so a long
     * purge can't be SIGKILLed mid-DELETE and restarted from scratch — that
     * was the original regression: 100% CPU + no new CDR writes until the
     * user disabled retention.
     */
    private const float DELETE_DEADLINE_SECONDS = 5.0;

    /**
     * Retention for the temporary `cdr` (`CallDetailRecordsTmp`) table.
     * Rows here that are older than this and whose `linkedid` is no longer
     * on Asterisk are crash artefacts (`WorkerCdr` migrates completed calls
     * to `cdr_general` via `afterSave`). Independent from the user-facing
     * PBXRecordSavePeriod, which only governs `cdr_general`. 30 d is chosen
     * to safely cover long-parked calls, abandoned voicemail, and multi-week
     * conferences — anything still in `cdr` past that is debris.
     */
    private const int DELETE_TMP_DAYS = 30;

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
     * @param string $id
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
        return $this->activeChannels[$channel] ?? '';
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
        if (
            ($this->notRecInner && $isInner) ||
            in_array($src, $this->exceptionsNumbers, true) || in_array($dst, $this->exceptionsNumbers, true)
        ) {
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
        $channelInfo = $this->mixMonitorChannels[$channel] ?? null;
        if ($channelInfo !== null) {
            return $channelInfo['result_file'] ?? '';
        }
        $resFile = '';
        $file_name = str_replace('/', '_', $file_name);
        if ($this->record_calls) {
            $fileExt = $this->getRecordingFileExtension($channel);
            // $fileExt is reassigned to the EFFECTIVE extension: on resume it follows the
            // already-existing _in/_out tracks so the mono mix ($srcFile) stays consistent
            // with them and WorkerWav2Webm picks the right tracks to merge.
            [$f, $options, $fileExt] = $this->setMonitorFilenameOptions($full_name, $sub_dir, $file_name, $fileExt);
            $arr = $this->am->GetChannels(false);
            if (!in_array($channel, $arr, true)) {
                return '';
            }
            $srcFile = "$f.$fileExt";
            $resFile = "$f.webm";
            $this->am->MixMonitor($channel, $srcFile, $options, '', $actionID);

            // Store full channel information for later conversion
            $this->mixMonitorChannels[$channel] = [
                'result_file' => $resFile,
                'base_path' => $f,
                'linked_id' => $this->getActiveChanId($channel),
                'file_name' => $file_name,
                'timestamp' => time(),
            ];

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
     * @param string $fileExt The recording file extension (wav48, wav16, or wav).
     *
     * @return array [string $basePath, string $options, string $effectiveExt]. If stereo split
     *               tracks (_in/_out) already exist for this base path, append into them (resume
     *               case) and return their extension as $effectiveExt. Otherwise, if
     *               $this->split_audio_thread is true, options split audio into two separate files
     *               (in/out); else 'ab'. $effectiveExt lets the caller keep the mono mix filename
     *               consistent with the tracks WorkerWav2Webm will merge.
     */
    public function setMonitorFilenameOptions(string $full_name, string $sub_dir, string $file_name, string $fileExt = 'wav'): array
    {
        $full_name = Util::trimExtensionForFile($full_name) . ".$fileExt";
        if (!file_exists($full_name)) {
            $monitor_dir = Directories::getDir(Directories::AST_MONITOR_DIR);
            if (empty($sub_dir)) {
                $sub_dir = date('Y/m/d/H/');
            }
            $f = "$monitor_dir/$sub_dir$file_name";
        } else {
            $f = Util::trimExtensionForFile($full_name);
        }

        // When resuming an interrupted recording (e.g. after a failed attended transfer)
        // the stereo split tracks may already exist on disk. WorkerWav2Webm always merges
        // _in/_out when both are present and ignores the mono mix, so the resumed audio MUST
        // be appended to those same tracks — regardless of the current split_audio_thread
        // value — otherwise it lands only in the mono mix and is silently dropped from the
        // final .webm. Extension priority mirrors WorkerWav2Webm::detectSourceFileExtension().
        foreach (['wav48', 'wav16', 'wav'] as $existingExt) {
            if (file_exists("{$f}_in.$existingExt") && file_exists("{$f}_out.$existingExt")) {
                return [$f, "abr({$f}_in.$existingExt)t({$f}_out.$existingExt)", $existingExt];
            }
        }

        if ($this->split_audio_thread) {
            $options = "abr({$f}_in.$fileExt)t({$f}_out.$fileExt)";
        } else {
            $options = 'ab';
        }
        return array($f, $options, $fileExt);
    }

    /**
     * Determines the optimal recording file extension based on the channel's audio codec.
     *
     * Mirrors the Lua getRecordingFileExtension() in extensions.lua.
     * Queries CHANNEL(audioreadformat) via AMI for both legs to preserve
     * the highest native sample rate across the bridge:
     *   - OPUS (48kHz fullband) → wav48
     *   - G.722/Speex16 (16kHz wideband) → wav16
     *   - Other codecs (8kHz narrowband) → wav
     *
     * @param string $channel The Asterisk channel to query.
     * @return string File extension without dot: "wav48", "wav16", or "wav".
     */
    private function getRecordingFileExtension(string $channel): string
    {
        $audioCodec = strtolower(
            (string)$this->am->GetVar($channel, 'CHANNEL(audioreadformat)', null, false)
        );

        // Also check the other leg's codec via BRIDGEPEER
        $bridgePeer = (string)$this->am->GetVar($channel, 'BRIDGEPEER', null, false);
        if (!empty($bridgePeer)) {
            $peerCodec = strtolower(
                (string)$this->am->GetVar($bridgePeer, 'CHANNEL(audioreadformat)', null, false)
            );
            $audioCodec .= ' ' . $peerCodec;
        }

        if (str_contains($audioCodec, 'opus')) {
            return 'wav48';
        }

        if (str_contains($audioCodec, 'g722') || str_contains($audioCodec, 'speex16') || str_contains($audioCodec, 'slin16')) {
            return 'wav16';
        }

        return 'wav';
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
    public function StopMixMonitor(string $channel, string $actionID = ''): void
    {
        if (!isset($this->mixMonitorChannels[$channel])) {
            return;
        }
        unset($this->mixMonitorChannels[$channel]);

        if ($this->record_calls) {
            $this->am->StopMixMonitor($channel, $actionID);
            // Audio conversion is now handled by WorkerCdr after CDR completion
            // This ensures all call metadata is available for Opus tags
        }
    }

    /**
     * Determines which stereo channel contains src_num audio.
     *
     * In stereo recording mode, MixMonitor splits audio into two files:
     *   _out.wav (transmit/write to channel) = other party's voice → LEFT channel (0)
     *   _in.wav  (receive/read from channel) = this channel's voice → RIGHT channel (1)
     *
     * When MixMonitor runs on dst_chan: src_num is on LEFT (0).
     * When MixMonitor runs on src_chan: src_num is on RIGHT (1).
     *
     * @param string $recChannel Channel MixMonitor is running on
     * @param string $srcChan CDR src_chan
     * @param string $dstChan CDR dst_chan
     * @return string '0'=LEFT, '1'=RIGHT, ''=mono/undetermined
     */
    public function getRecSrcChannel(string $recChannel, string $srcChan, string $dstChan): string
    {
        if (!$this->split_audio_thread || empty($recChannel)) {
            return '';
        }
        if ($recChannel === $dstChan) {
            return '0';
        }
        if ($recChannel === $srcChan) {
            return '1';
        }
        return '';
    }

    /**
     * Starts the process, sets up initial options and worker subscribers.
     *
     * @param array $argv The command-line arguments passed to the worker.
     *
     * @return void This function does not return any value.
     *
     * @throws \DateMalformedStringException
     */
    public function start(array $argv): void
    {
        // Recover CDR tables if missing (issue #1000 — crash loop on "no such table: cdr")
        DatabaseProviderBase::ensureCdrTables();

        // Update the recording options for the worker
        $this->updateRecordingOptions();
        $this->deleteOldRecords();

        // Initialize the mixMonitorChannels and checkChanHangupTransfer arrays
        $this->mixMonitorChannels = [];
        $this->checkChanHangupTransfer = [];

        // Get the asterisk manager interface
        $this->am = Util::getAstManager('off');

        // Create a new Beanstalk client
        $this->clientQueue = new BeanstalkClient(self::class);
        if ($this->clientQueue->isConnected() === false) {
            // Log the failed connection and pause for 2 seconds before returning
            SystemMessages::sysLogMsg(self::class, 'Fail connect to beanstalkd...');
            sleep(2);
            return;
        }

        // Subscribe to different tubes for different worker tasks
        $this->linkedIdFinalizations = new LinkedIdFinalizationQueue(
            self::LINKED_ID_FINALIZATION_DELAY_SECONDS
        );
        $this->clientQueue->subscribe(CelBeanstalkdConf::BEANSTALK_TUBE, [$this, 'callEventsWorker']);
        $this->clientQueue->subscribe(self::class, [$this, 'otherEvents']);
        $this->clientQueue->subscribe(WorkerCdr::SELECT_CDR_TUBE, [$this, 'selectCDRWorker']);
        $this->clientQueue->subscribe(WorkerCdr::UPDATE_CDR_TUBE, [$this, 'updateCDRWorker']);
        $this->clientQueue->subscribe(WorkerCdr::DELETE_CDR_TUBE, [$this, 'deleteCDRWorker']);

        // Subscribe to ping tube for keep alive checks
        $this->clientQueue->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);

        // Set the error handler for the client
        $this->clientQueue->setErrorHandler([$this, 'errorHandler']);
        $this->clientQueue->setTimeoutHandler([$this, 'processPendingLinkedIdFinalizations']);

        // Keep the worker process running as long as a restart is not required
        while ($this->needRestart === false) {
            // One-second queue timeout keeps the two-second LINKEDID_END debounce precise
            // even when the terminal CEL record is the last event of a quiet call.
            $this->clientQueue->wait(1);
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

                // If recording is not enabled for this peer, store it as an exception.
                // enableRecording is an INTEGER column; on PHP 8.1+ PDO_SQLITE returns it
                // as native int via partial-column hydration, so compare numerically.
                if ((int)($peer->enableRecording ?? 1) === 0) {
                    $this->exceptionsNumbers[] = $num;
                }
            }
        }

        // Set some class properties based on the PbxSettings values
        $this->notRecInner = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_CALLS_INNER) === '0';
        $this->record_calls = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_CALLS) === '1';
        $this->split_audio_thread = PbxSettings::getValueByKey(PbxSettings::PBX_SPLIT_AUDIO_THREAD) === '1';

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
     * @throws \DateMalformedStringException
     */
    public function pingCallBack(BeanstalkClient $message): void
    {
        parent::pingCallBack($message);
        $this->processPendingLinkedIdFinalizations();
        $this->updateRecordingOptions();
        $this->deleteOldRecords();
    }

    /**
     * Calls the events worker.
     *
     * @param BeanstalkClient $tube object.
     *
     * @return void
     * @throws \Exception
     */
    public function callEventsWorker(BeanstalkClient $tube): void
    {
        // Decode the body of the tube object
        $data = json_decode($tube->getBody(), true);
        try {
            if (!is_array($data)) {
                return;
            }

            $event = $data['EventName'] ?? '';
            if ('ANSWER' === $event) {
                ActionCelAnswer::execute($this, $data);
            }
            if ('ATTENDEDTRANSFER' === $event) {
                ActionCelAttendedTransfer::execute($this, $data);
            }
            if ('LINKEDID_END' === $event) {
                $this->scheduleLinkedIdFinalization($data);
            }
            if ('USER_DEFINED' !== $event) {
                return;
            }

            // Supports both plain base64 and GZ:-prefixed gzip-compressed payloads.
            try {
                $data = json_decode(
                    AsteriskManager::decodeCdrData($data['AppData'] ?? ''),
                    true,
                    512,
                    JSON_THROW_ON_ERROR
                );
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                $data = [];
            }

            $this->otherEvents($tube, $data);
        } finally {
            $this->processPendingLinkedIdFinalizations();
        }
    }

    protected function scheduleLinkedIdFinalization(array $data): void
    {
        $linkedId = trim((string)($data['LinkedID'] ?? ''));
        $eventTime = trim((string)($data['EventTime'] ?? ''));
        if ($linkedId === '' || $eventTime === '') {
            $this->logLinkedIdFinalization('Ignoring invalid LINKEDID_END', LOG_WARNING);
            return;
        }

        $this->linkedIdFinalizations->schedule($linkedId, $eventTime, $this->monotonicNow());
    }

    public function processPendingLinkedIdFinalizations(): void
    {
        if (!isset($this->linkedIdFinalizations)) {
            return;
        }
        foreach ($this->linkedIdFinalizations->takeDue($this->monotonicNow()) as $linkedId => $eventTime) {
            $updated = $this->finalizeLinkedId($linkedId, $eventTime);
            $this->publishLinkedIdFinalized($linkedId, $eventTime);
            $this->logLinkedIdFinalization(
                sprintf('LINKEDID_END finalized linkedid=%s rows=%d end=%s', $linkedId, $updated, $eventTime),
                LOG_DEBUG
            );
        }
    }

    protected function monotonicNow(): float
    {
        return hrtime(true) / 1_000_000_000;
    }

    protected function finalizeLinkedId(string $linkedId, string $eventTime): int
    {
        return ActionCelLinkedIdEnd::execute($linkedId, $eventTime);
    }

    protected function publishLinkedIdFinalized(string $linkedId, string $eventTime): void
    {
        $this->clientQueue->publish(
            json_encode(['linkedid' => $linkedId, 'eventTime' => $eventTime], JSON_THROW_ON_ERROR),
            WorkerCdr::FINALIZE_CDR_TUBE
        );
    }

    protected function logLinkedIdFinalization(string $message, int $level): void
    {
        SystemMessages::sysLogMsg(__CLASS__, $message, $level);
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
     * Deletes a CDR record through the single-writer tube.
     *
     * Called from the REST API DeleteRecordAction via Beanstalk to serialise
     * all writes on cdr_general through this worker (issue #1000 / #1019).
     */
    public function deleteCDRWorker(BeanstalkClient $tube): void
    {
        $request = json_decode($tube->getBody(), true);
        if (!is_array($request)) {
            $request = [];
        }
        $tube->reply(DeleteCDR::execute($request));
    }

    /**
     * Error handler.
     *
     * @param mixed $m The error message.
     *
     * @return void
     */
    public function errorHandler(mixed $m): void
    {
        SystemMessages::sysLogMsg(self::class . '_ERROR', $m, LOG_ERR);
    }

    /**
     * Periodic CDR retention cleanup.
     *
     * Runs every {@see self::$deleteCdrTimer} ping cycles and trims:
     *   1. `cdr_general` rows older than `PBXRecordSavePeriod` days
     *      (user-facing retention).
     *   2. `cdr` (tmp) rows older than {@see self::DELETE_TMP_DAYS} whose
     *      `linkedid` is not currently on Asterisk — crash artefacts that
     *      `WorkerCdr` never managed to migrate to `cdr_general`.
     *
     * Both passes share a single {@see self::DELETE_DEADLINE_SECONDS}
     * budget via the absolute `$deadline` timestamp. The cap stays well
     * below the 120s WorkerSafeScripts watchdog so a long purge can never
     * be SIGKILLed mid-DELETE and restarted from scratch — that was the
     * original regression: 100% CPU + no new CDR writes until the user
     * disabled retention.
     *
     * @return void
     * @throws \DateMalformedStringException
     */
    public function deleteOldRecords(): void
    {
        // Cleaning will be performed every ping
        $this->deleteCdrTimer++;
        if ($this->deleteCdrTimer <= 61) {
            return;
        }
        $this->deleteCdrTimer = 0;

        try {
            /** @var PdoSqliteAdapter $connection */
            $connection = $this->di->get(CDRDatabaseProvider::SERVICE_NAME);
            $deadline   = microtime(true) + self::DELETE_DEADLINE_SECONDS;

            $totalDeleted  = $this->deleteOldFromGeneral($connection, $deadline);
            $totalDeleted += $this->deleteOldFromTmp($connection, $deadline);

            // Free disk space and bound WAL growth after a successful purge.
            // wal_checkpoint(TRUNCATE) is best-effort: it returns busy when
            // readers hold a snapshot, in which case the next pass will retry.
            if ($totalDeleted > 0) {
                try {
                    $connection->execute('PRAGMA wal_checkpoint(TRUNCATE)');
                } catch (Throwable $e) {
                    SystemMessages::sysLogMsg(
                        self::class,
                        'WAL checkpoint after CDR cleanup did not complete: ' . $e->getMessage(),
                        LOG_DEBUG
                    );
                }
            }
        } catch (Throwable $e) {
            // Prevent crash loop when cdr/cdr_general are missing (issue #1000).
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }

    /**
     * Trims `cdr_general` to PBXRecordSavePeriod days. No-op when retention
     * is set to "unlimited" (savePeriod < 30) or the table is missing.
     */
    private function deleteOldFromGeneral(PdoSqliteAdapter $connection, float $deadline): int
    {
        $savePeriod = (int)PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_SAVE_PERIOD);
        if ($savePeriod < 30) {
            return 0;
        }
        if (!$connection->tableExists('cdr_general')) {
            return 0;
        }

        $limitData = (new DateTime())->modify("-$savePeriod days")->format('Y-m-d');
        RecordingDeletionLogger::log(
            RecordingDeletionLogger::CDR_RETENTION,
            'cdr_general',
            "savePeriod={$savePeriod}days, limitDate={$limitData}"
        );

        // Subquery+rowid form is used because SQLite's `DELETE … LIMIT`
        // requires the SQLITE_ENABLE_UPDATE_DELETE_LIMIT compile flag,
        // which is not enabled in the bundled BusyBox sqlite.
        return $this->deleteInChunks(
            $connection,
            'DELETE FROM cdr_general WHERE rowid IN '
                . '(SELECT rowid FROM cdr_general WHERE start < ? LIMIT ' . self::DELETE_CHUNK_SIZE . ')',
            [$limitData],
            $deadline
        );
    }

    /**
     * Trims abandoned tmp rows from `cdr` older than DELETE_TMP_DAYS, but
     * never touches rows that belong to a still-active call. The same
     * `linkedid NOT IN (active channels)` guard `WorkerCdr::updateCdr()`
     * uses, so a long-running parked call or open voicemail box can never
     * be silently dropped.
     */
    private function deleteOldFromTmp(PdoSqliteAdapter $connection, float $deadline): int
    {
        if (microtime(true) >= $deadline) {
            return 0;
        }
        if (!$connection->tableExists('cdr')) {
            return 0;
        }

        $activeLinkedIds = [];
        try {
            $am              = Util::getAstManager('off');
            $activeLinkedIds = array_keys($am->GetChannels());
        } catch (Throwable $e) {
            // AMI unavailable — bail out. We must not run the DELETE without
            // the live-channel guard, otherwise we'd wipe in-flight calls.
            SystemMessages::sysLogMsg(
                self::class,
                'Skipping cdr (tmp) cleanup: AMI unavailable: ' . $e->getMessage(),
                LOG_WARNING
            );
            return 0;
        }

        $tmpLimit = (new DateTime())->modify('-' . self::DELETE_TMP_DAYS . ' days')->format('Y-m-d');
        RecordingDeletionLogger::log(
            RecordingDeletionLogger::CDR_RETENTION,
            'cdr',
            'tmpRetention=' . self::DELETE_TMP_DAYS . "days, limitDate={$tmpLimit}, "
                . 'activeChannels=' . count($activeLinkedIds)
        );

        $sql  = 'DELETE FROM cdr WHERE rowid IN '
            . '(SELECT rowid FROM cdr WHERE start < ?';
        $bind = [$tmpLimit];
        if (!empty($activeLinkedIds)) {
            $placeholders = implode(',', array_fill(0, count($activeLinkedIds), '?'));
            $sql         .= " AND linkedid NOT IN ($placeholders)";
            $bind         = array_merge($bind, array_values($activeLinkedIds));
        }
        $sql .= ' LIMIT ' . self::DELETE_CHUNK_SIZE . ')';

        return $this->deleteInChunks($connection, $sql, $bind, $deadline);
    }

    /**
     * Run a parameterised DELETE in chunks until either no rows are left
     * or the absolute `$deadline` (microtime) is reached. Returns the
     * total number of rows deleted across chunks.
     *
     * The deadline is shared across the whole cleanup pass, so consecutive
     * calls (cdr_general → cdr) cooperate on a single budget rather than
     * each consuming their own — preventing the writer lock from being
     * held for double the configured limit.
     */
    private function deleteInChunks(
        PdoSqliteAdapter $connection,
        string $sql,
        array $bind,
        float $deadline
    ): int {
        $total = 0;
        do {
            if (microtime(true) >= $deadline) {
                break;
            }
            $connection->execute($sql, $bind);
            $affected = (int)$connection->affectedRows();
            $total   += $affected;
        } while ($affected > 0);
        return $total;
    }
}


// Start a worker process
WorkerCallEvents::startWorker($argv ?? []);
