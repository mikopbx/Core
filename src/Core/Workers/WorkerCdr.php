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

use MikoPBX\Common\Models\{Extensions, ModelsBase, PbxSettings, Users};
use MikoPBX\Core\System\{BeanstalkClient, Directories, SystemMessages, Util};
use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use Phalcon\Di\Di;

/**
 * Class WorkerCdr
 *
 * It is a class that extends WorkerBase. It processes and manages
 * call data records (CDR) retrieved from the database, handles system settings,
 * and manages emails related to unanswered calls.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerCdr extends WorkerBase
{
    // Tube names for Beanstalk queues.
    public const string SELECT_CDR_TUBE = 'select_cdr_tube';
    public const string UPDATE_CDR_TUBE = 'update_cdr_tube';

    // Define properties
    private BeanstalkClient $clientQueue;
    private array $internal_numbers = [];
    private array $no_answered_calls = [];
    private string $emailForMissed = '';
    private int $lastCheckCdr = 0;

    /**
     * The main entry point for the worker.
     *
     * @param array $argv The command-line arguments passed to the worker.
     */
    public function start(array $argv): void
    {
        // Establish connection with Beanstalk queue
        $this->clientQueue = new BeanstalkClient(self::SELECT_CDR_TUBE);
        $this->clientQueue->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);

        // Initialize system settings
        $this->initSettings();

        // Process call data records
        while ($this->needRestart === false) {
            if(time() - $this->lastCheckCdr > 5){
                $result = CDRDatabaseProvider::getCdr();
                if (!empty($result)) {
                    $this->updateCdr($result);
                }
                $this->lastCheckCdr = time();
            }
            $this->clientQueue->wait();
        }
    }

    /**
     * Initializes system settings and internal users' data.
     */
    private function initSettings(): void
    {
        // Retrieve system settings
        $this->internal_numbers = [];
        $this->no_answered_calls = [];
        $this->emailForMissed = PbxSettings::getValueByKey(PbxSettings::SYSTEM_EMAIL_FOR_MISSED);

        // Construct parameters for user data query
        $cacheKey = ModelsBase::makeCacheKey(Users::class, 'Workers-WorkerCdr-initSettings');
        $redis = Di::GetDefault()->getShared(ManagedCacheProvider::SERVICE_NAME);
        $results = $redis->get($cacheKey);
        if (empty($results)) {
            // Define parameters for user data query
            $usersClass = Users::class;
            $parameters = [
                'columns' => [
                    'email' => 'email',
                    'language' => 'language',
                    'number' => 'Extensions.number'
                ],
                'joins' => [
                    'Extensions' => [
                        0 => Extensions::class,
                        1 => "Extensions.userid=$usersClass.id",
                        2 => 'Extensions',
                        3 => 'INNER',
                    ],
                ]
            ];

            // Get user data and populate internal_numbers array
            $results = Users::find($parameters);
            $redis->set($cacheKey, $results, 300);
        }

        foreach ($results as $record) {
            if (empty($record->email)) {
                continue;
            }
            $this->internal_numbers[$record->number] = [
                'email' => $record->email,
                'language' => $record->language,
            ];
        }
    }

    /**
     * Updates CDR and processes active call chains and unanswered calls.
     *
     * @param array $result CDR data
     * @throws \Exception
     */
    private function updateCdr(array $result): void
    {
        // Re-initialize system settings for each call to this function
        // to ensure we have the most up-to-date settings.
        $this->initSettings();
        $arr_update_cdr = [];

        // Fetch identifiers for all currently active channels.
        // Active channels are those that are involved in ongoing calls.
        $channels_id = $this->getActiveIdChannels();

        // Process each Call Detail Record (CDR) from the result set.
        foreach ($result as $row) {

            // If the linked ID for this CDR is present in the active channels,
            // that means this call chain is still ongoing. We will skip processing
            // this CDR for now and will process it in a future iteration when
            // the call has completed.
            if (array_key_exists($row['linkedid'], $channels_id)) {
                continue;
            }

            // Calculate timestamps and durations
            $start = strtotime($row['start']);
            $answer = strtotime($row['answer']);
            $end = strtotime($row['endtime']);
            $dialstatus = trim($row['dialstatus']);

            $duration = max(($end - $start), 0);
            $billsec = ($end && $answer) ? ($end - $answer) : 0;

            // Update disposition based on the billable seconds and dial status
            [$disposition, $row] = $this->setDisposition($billsec, $dialstatus, $row);

            // Check the billable seconds and make recording file
            [$row, $billsec] = $this->checkBillsecMakeRecFile($billsec, $row);

            // Prepare the data for updating the CDR.
            $data = [
                'work_completed' => 1,
                'duration' => $duration,
                'billsec' => $billsec,
                'disposition' => $disposition,
                'UNIQUEID' => $row['UNIQUEID'],
                'recordingfile' => $row['recordingfile'],
                'tmp_linked_id' => $row['linkedid'],
            ];

            // Add the updated data to the array that will be used to update all CDRs
            $arr_update_cdr[] = $data;

            // Check if the call was not answered and, if so, add it to the list of
            // calls to be notified about.
            $this->checkNoAnswerCall(array_merge($row, $data));
        }

        // Update the statuses of the processed CDRs in the database and publish them
        // to the UPDATE_CDR_TUBE for further processing by other workers.
        $this->setStatusAndPublish($arr_update_cdr);

        // If there are any unanswered calls, notify the respective users by email.
        $this->notifyByEmail();
    }

    /**
     * Fetches all active channels from the Asterisk Manager Interface (AMI).
     *
     * @return array The array of active channels.
     * The array key is the Linkedid of the channel, and the value is an array of channel details.
     * @throws \Exception
     */
    private function getActiveIdChannels(): array
    {
        // The getAstManager method from the Util class is used to obtain an instance of the Asterisk Manager Interface (AMI).
        // The 'off' argument specifies that we want the AMI instance with events turned off.
        // The GetChannels method of the AMI instance is then used to retrieve all currently active channels.
        return Util::getAstManager('off')->GetChannels(true);
    }

    /**
     * Sets the call disposition status and manages the call's recording file.
     * It defines the call's disposition status based on the billable seconds and dial status.
     * If the disposition is not 'ANSWERED', it removes the call's recording file if it exists.
     * If the disposition is 'ANSWERED' and the recording file does not exist, it retrieves the file from the database.
     *
     * @param int $billsec The billable seconds of the call.
     * @param string $dialstatus The status of the dialed call.
     * @param array $row The array containing the call details.
     *
     * @return array An array consisting of the disposition status and the modified row.
     */
    private function setDisposition(int $billsec, string $dialstatus, array $row): array
    {

        // Set the default disposition to 'NOANSWER'
        $disposition = 'NOANSWER';

        // If the call was answered (billsec > 0), set disposition to 'ANSWERED'
        if ($billsec > 0) {
            $disposition = 'ANSWERED';
        } elseif ('' !== $dialstatus) {
            // If the dialstatus is 'ANSWERED', keep the disposition as is, otherwise set it to dialstatus
            $disposition = ($dialstatus === 'ANSWERED') ? $disposition : $dialstatus;
        }

        // If recordingfile is set but neither the converted .webm nor any source format exists,
        // try to retrieve the recording path from another CDR row for this call leg
        $basePath = Util::trimExtensionForFile($row['recordingfile']);
        $sourceExists = file_exists($basePath . '.wav48')
            || file_exists($basePath . '.wav16')
            || file_exists($basePath . '.wav');
        if (!empty($row['recordingfile']) &&
            !file_exists($row['recordingfile']) &&
            !$sourceExists) {

            // If the disposition is 'ANSWERED' and the recording file doesn't exist, retrieve it from the database
            $filter = [
                "linkedid='{$row['linkedid']}' AND dst_chan='{$row['dst_chan']}'",
                'limit' => 1,
                'miko_tmp_db' => true
            ];
            $data = CDRDatabaseProvider::getCdr($filter);
            $recordingfile = $data[0]['recordingfile'] ?? '';
            if (!empty($recordingfile)) {
                $row['recordingfile'] = $recordingfile;
            }
        }

        // Return the updated disposition and row
        return array($disposition, $row);
    }

    /**
     * Validates billable seconds and manages recording files.
     * If the billable seconds is less or equal to zero, no recording file can exist. Otherwise, it triggers a process to convert the recording file to mp3.
     *
     * @param int $billsec The billable seconds of the call.
     * @param array $row The array containing the call details.
     *
     * @return array An array consisting of the modified row and billsec.
     */
    private function checkBillsecMakeRecFile(int $billsec, array $row): array
    {
        if (!empty(trim($row['recordingfile']))) {
            $p_info = pathinfo($row['recordingfile']);

            // Validate filename — empty basename means a bug in MixMonitor call
            if (empty($p_info['filename'])) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf(
                        'Empty recording filename for linkedid=%s, skipping conversion task (path: %s)',
                        $row['linkedid'] ?? 'unknown',
                        $row['recordingfile']
                    ),
                    LOG_WARNING
                );
                $row['recordingfile'] = '';
                return [$row, $billsec];
            }

            // Create JSON task file for WorkerWav2Webm to process
            $monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);
            $tasksDir = $monitorDir . '/conversion-tasks';

            if (!is_dir($tasksDir)) {
                Util::mwMkdir($tasksDir, true);
            }

            $deleteSourceFiles = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_DELETE_SOURCE_AFTER_CONVERT);

            $taskData = [
                'linkedid' => $row['linkedid'] ?? '',
                'src_num' => $row['src_num'] ?? '',
                'dst_num' => $row['dst_num'] ?? '',
                'start' => $row['start'] ?? '',
                'duration' => $row['duration'] ?? '',
                'billsec' => $billsec,
                'disposition' => $row['disposition'] ?? '',
                'uniqueid' => $row['UNIQUEID'] ?? '',
                'input_path' => $p_info['dirname'] . '/' . $p_info['filename'],
                'delete_source' => $deleteSourceFiles,
                'created_at' => time(),
                'attempts' => 0
            ];

            $jsonData = json_encode($taskData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            if ($jsonData === false) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf(
                        'Failed to encode conversion task JSON for linkedid=%s: %s',
                        $row['linkedid'] ?? 'unknown',
                        json_last_error_msg()
                    ),
                    LOG_ERR
                );
                $row['recordingfile'] = preg_replace('/\.(wav|wav16|wav48)$/i', '.webm', $row['recordingfile']);
                return [$row, $billsec];
            }

            $taskFile = $tasksDir . '/' . ($row['linkedid'] ?? 'unknown') . '_' . uniqid() . '.json';
            $written = file_put_contents($taskFile, $jsonData);

            if ($written === false) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    sprintf(
                        'Failed to write conversion task file %s for linkedid=%s',
                        basename($taskFile),
                        $row['linkedid'] ?? 'unknown'
                    ),
                    LOG_ERR
                );
                // Don't update recordingfile to .webm — the conversion task was not created,
                // so the .webm file will never exist. Keep the original source path in CDR.
                return [$row, $billsec];
            }

            // Update recordingfile path to point to WebM file (supports .wav, .wav16, .wav48)
            $row['recordingfile'] = preg_replace('/\.(wav|wav16|wav48)$/i', '.webm', $row['recordingfile']);
        } else {
            $row['recordingfile'] = '';
        }
        return [$row, $billsec];
    }

    /**
     * Checks if the given call was not answered, and if so, records the call details for further processing.
     *
     * @param array $row The details of the call, including call start, end, and answer times, and the source and destination numbers.
     * @return void
     */
    private function checkNoAnswerCall(array $row): void
    {
        if ($row['disposition'] === 'ANSWERED') {
            // If the call was answered, record this fact and stop further processing
            $this->no_answered_calls[$row['linkedid']]['ANSWERED'] = true;
            return;
        }
        $isInternal = false;

        // Check if this is an internal call (i.e., the source number is in the list of internal numbers)
        if ((array_key_exists($row['src_num'], $this->internal_numbers))) {
            $isInternal = true;
        }

        // Resolve destination internal data once (may be empty for external/queue/voicemail destinations)
        $destInternal = $this->internal_numbers[$row['dst_num']] ?? [];

        // Attempt to find the email address associated with the destination number
        $email = $destInternal['email'] ?? '';

        // If no email was found and this is not an internal call, use the default email for missed calls
        if (empty($email) && !$isInternal) {
            $email = $this->emailForMissed;
        }

        // If still no email address is available, stop processing
        if (empty($email)) {
            return;
        }

        // Determine language: destination user → system default
        $language = $destInternal['language'] ?? PbxSettings::getValueByKey(PbxSettings::PBX_LANGUAGE);

        // Record the details of the call for later processing
        $this->no_answered_calls[$row['linkedid']][] = [
            'from_number' => $row['src_num'],
            'from_name' => $row['src_name'] ?? '',
            'to_number' => $row['dst_num'],
            'start' => $row['start'],
            'answer' => $row['answer'],
            'endtime' => $row['endtime'],
            'email' => $email,
            'language' => $language,
            'is_internal' => $isInternal,
            'duration' => $row['duration'],
            'NOANSWER' => true
        ];
    }

    /**
     * Updates the status and publishes the call detail records (CDRs).
     * Removes any answered calls from the list of non-answered calls.
     *
     * @param array $arr_update_cdr The array containing CDRs to be updated.
     *
     * @return void
     */
    private function setStatusAndPublish(array $arr_update_cdr): void
    {
        // Initialize an array to store identifiers for calls that are to be deleted
        $idForDelete = [];

        // Iterate over all the CDRs to be updated
        foreach ($arr_update_cdr as $data) {
            // Extract the linkedId from the data
            $linkedId = $data['tmp_linked_id'];

            // Set the global status of the call to the disposition of the call
            $data['GLOBAL_STATUS'] = $data['disposition'];

            // If the call has been answered
            if (isset($this->no_answered_calls[$linkedId]['ANSWERED'])) {

                // Set the global status of the call to 'ANSWERED'
                $data['GLOBAL_STATUS'] = 'ANSWERED';

                // This call has been answered. Add it to the list of calls to be deleted from the non-answered calls list
                $idForDelete[$linkedId] = true;
            }
            // Remove the temporary linkedId from the data
            unset($data['tmp_linked_id']);

            // Publish the updated CDR to the queue
            $this->clientQueue->publish(json_encode($data), self::UPDATE_CDR_TUBE);
        }

        // Clean up memory by removing answered calls from the non-answered calls list
        foreach ($idForDelete as $linkedId => $data) {
            unset($this->no_answered_calls[$linkedId]);
        }
    }

    /**
     * Notifies the concerned parties via email about the unanswered calls.
     * After processing all the calls, the list of unanswered calls is cleared.
     *
     * @return void
     */
    private function notifyByEmail(): void
    {
        // Iterate over all unanswered calls
        foreach ($this->no_answered_calls as $call) {

            // Publish the call details to a queue for a worker that will send the notification email
            $this->clientQueue->publish(json_encode($call), WorkerNotifyByEmail::class);
        }

        // After all calls have been processed, reset the list of unanswered calls
        $this->no_answered_calls = [];
    }

}

// Start a worker process
WorkerCdr::startWorker($argv ?? []);