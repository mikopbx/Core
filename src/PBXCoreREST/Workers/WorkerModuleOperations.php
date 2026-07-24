<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Workers;

require_once 'Globals.php';

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\ModuleOperations;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\PBXCoreREST\Lib\Modules\Journal\ModuleOperationsRepository;
use MikoPBX\PBXCoreREST\Lib\Modules\ModuleInstallationBase;
use MikoPBX\PBXCoreREST\Lib\Modules\Pipeline\InstallPipeline;
use MikoPBX\PBXCoreREST\Lib\Modules\Pipeline\RollbackService;
use MikoPBX\PBXCoreREST\Lib\Modules\UnifiedModulesEvents;
use MikoPBX\PBXCoreREST\Lib\Modules\UpdateAllModulesAction;
use Throwable;

/**
 * Class WorkerModuleOperations
 *
 * Detached orchestrator of a single module operation. Spawned by
 * ModulesManagementProcessor after a successful journal claim:
 *
 *   php -f WorkerModuleOperations.php start <operationUid>
 *
 * Design:
 *  - runs in its own session/process group (posix_setsid), so it survives
 *    restartAllWorkers() and the supervisor can kill the whole group by pgid;
 *  - all MODULE code (enable/disable hooks, license client) executes in a
 *    short-lived child process (WorkerModuleStateRunner) with a hard timeout,
 *    while the orchestrator keeps its journal heartbeat ticking every second;
 *  - a failed heartbeat CAS means the fencing token was invalidated by the
 *    supervisor's reaper — the orchestrator kills its child and exits, so a
 *    reaped operation can never finalize anything (zombie protection);
 *  - stage pushes go through UnifiedModulesEvents with the journal context
 *    attached, so nchan messages and journal records stay in sync and the
 *    Stage_VII_FinalStatus push finalizes the journal row.
 *
 * The process title is unique per operation and never matches the
 * supervisor's prepareWorkersList() classes — it must not be adopted,
 * restarted or killed by the generic worker monitoring.
 *
 * @package MikoPBX\PBXCoreREST\Workers
 */
class WorkerModuleOperations extends WorkerBase
{
    // Hard timeout for a single child step running module code
    public const int CHILD_STEP_TIMEOUT = 120;

    private ModuleOperationsRepository $repository;
    private string $operationUid = '';
    private string $fencingToken = '';
    private UnifiedModulesEvents $events;

    /**
     * Entry point of the orchestrator process.
     *
     * @param array $argv The command-line arguments passed to the worker.
     */
    public function start(array $argv): void
    {
        $this->operationUid = $argv[2] ?? '';
        $mode = $argv[3] ?? '';
        if ($this->operationUid === '') {
            SystemMessages::sysLogMsg(__CLASS__, 'Started without an operationUid', LOG_ERR);
            exit(1);
        }

        // Own session: survives restartAllWorkers, reaper kills the group
        if (posix_setsid() === -1) {
            SystemMessages::sysLogMsg(__CLASS__, 'posix_setsid() failed', LOG_WARNING);
        }
        cli_set_process_title(__CLASS__ . '-' . $this->operationUid);

        $this->repository = new ModuleOperationsRepository();
        $row = $this->repository->getByUid($this->operationUid);
        if ($row === null) {
            SystemMessages::sysLogMsg(__CLASS__, "Operation {$this->operationUid} not found", LOG_ERR);
            exit(1);
        }

        $expectedState = $mode === 'rollback'
            ? ModuleOperations::STATE_ROLLING_BACK
            : ModuleOperations::STATE_PENDING;
        if ($row['state'] !== $expectedState) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Operation {$this->operationUid} is not $expectedState ({$row['state']}), refusing to start",
                LOG_WARNING
            );
            exit(1);
        }

        $this->fencingToken = (string)$row['fencingToken'];
        $pid = getmypid();
        if ($mode === 'rollback') {
            // The reaper handed the operation over with a fresh token; adopt
            // the row by recording our pid/pgid and reviving the heartbeat.
            if (!$this->repository->setFields($this->operationUid, $this->fencingToken, ['pid' => $pid, 'pgid' => $pid])
                || !$this->repository->heartbeat($this->operationUid, $this->fencingToken)) {
                SystemMessages::sysLogMsg(__CLASS__, "Rollback of {$this->operationUid} was fenced", LOG_WARNING);
                exit(1);
            }
        } elseif (!$this->repository->startRunning($this->operationUid, $this->fencingToken, $pid, $pid)) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Operation {$this->operationUid} was fenced before start",
                LOG_WARNING
            );
            exit(1);
        }

        $this->events = new UnifiedModulesEvents(
            (string)$row['channelId'],
            (string)$row['moduleUniqueId'],
            (string)$row['batchId']
        );
        $this->events->setJournalContext([$this->operationUid, $this->fencingToken]);

        try {
            if ($mode === 'rollback') {
                $this->runRollback($row);
                return;
            }
            switch ($row['operation']) {
                case ModuleOperations::OPERATION_ENABLE:
                    $this->runStateChange('enable', $row);
                    break;
                case ModuleOperations::OPERATION_DISABLE:
                    $this->runStateChange('disable', $row);
                    break;
                case ModuleOperations::OPERATION_INSTALL_REPO:
                case ModuleOperations::OPERATION_INSTALL_PACKAGE:
                    $pipeline = new InstallPipeline(
                        $this->repository,
                        $this->operationUid,
                        $this->fencingToken,
                        $this->events,
                        fn(string $command, string $moduleUniqueId, array $extraArgs, int $timeout): array =>
                            $this->runChildStep($command, $moduleUniqueId, $extraArgs, $timeout)
                    );
                    $pipeline->run($row);
                    break;
                default:
                    $this->pushFinalStatus(false, ['error' => ["Unsupported operation: {$row['operation']}"]]);
            }
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $messages = ['error' => [$e->getMessage()]];
            // A batch member must advance its batch on ANY failure path
            $batchId = (string)($row['batchId'] ?? '');
            if ($batchId !== '') {
                try {
                    UpdateAllModulesAction::failModule($batchId, (string)$row['moduleUniqueId'], $messages);
                } catch (Throwable $batchError) {
                    SystemMessages::sysLogMsg(
                        __CLASS__,
                        'Batch advancement failed: ' . $batchError->getMessage(),
                        LOG_ERR
                    );
                }
            }
            $this->pushFinalStatus(false, $messages);
        }
    }

    /**
     * Rollback mode: restores the system state of a reaped install operation.
     * The row is in rolling_back state with a token handed over by the reaper.
     *
     * @param array $row The journal row
     */
    private function runRollback(array $row): void
    {
        $rollback = new RollbackService();
        $problems = $rollback->rollback(
            $row,
            fn(string $moduleUniqueId): bool =>
                ($this->runChildStep('enable', $moduleUniqueId, [], 120)['result'] ?? false) === true
        );

        $messages = ['error' => [TranslationProvider::translate('ext_OperationStalledError')]];
        foreach ($problems as $severity => $texts) {
            foreach ((array)$texts as $text) {
                $messages[$severity][] = $text;
            }
        }

        $this->repository->transition(
            $this->operationUid,
            $this->fencingToken,
            [ModuleOperations::STATE_ROLLING_BACK],
            ModuleOperations::STATE_FAILED,
            ['errorData' => json_encode($messages, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)]
        );

        $batchId = (string)($row['batchId'] ?? '');
        if ($batchId !== '') {
            UpdateAllModulesAction::failModule($batchId, (string)$row['moduleUniqueId'], $messages);
        }
        // Journal already finalized above: this push only unfreezes browsers
        $this->events->setJournalContext(null);
        $this->events->pushMessageToBrowser(
            ModuleInstallationBase::STAGE_VII_FINAL_STATUS,
            ['result' => false, 'messages' => $messages]
        );
    }

    /**
     * Executes an enable/disable operation: module code runs in a
     * WorkerModuleStateRunner child under timeout, the outcome is pushed to
     * the browser on the legacy stage names and finalizes the journal.
     *
     * @param string $command 'enable' or 'disable'
     * @param array $row The journal row of the operation
     */
    private function runStateChange(string $command, array $row): void
    {
        $params = json_decode((string)$row['params'], true) ?: [];
        $moduleUniqueId = (string)$row['moduleUniqueId'];

        $extraArgs = [];
        if ($command === 'disable') {
            $extraArgs = [(string)($params['reason'] ?? ''), (string)($params['reasonText'] ?? '')];
        }
        $result = $this->runChildStep($command, $moduleUniqueId, $extraArgs, self::CHILD_STEP_TIMEOUT);

        // A fenced-out orchestrator must not talk to the browser either: the
        // reaper already pushed its own terminal status.
        if (!$this->repository->heartbeat($this->operationUid, $this->fencingToken)) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Operation {$this->operationUid} was fenced before finalization, discarding result",
                LOG_WARNING
            );
            exit(1);
        }

        // Legacy stage name keeps the toggle UI working unchanged
        $stageName = $command === 'enable' ? 'Stage_I_ModuleEnable' : 'Stage_I_ModuleDisable';
        $this->events->pushMessageToBrowser($stageName, $result);

        // Guaranteed terminal push: finalizes the journal row via the attached
        // journal context and feeds the UI polling fallback
        $this->events->pushMessageToBrowser(
            ModuleInstallationBase::STAGE_VII_FINAL_STATUS,
            $result
        );
    }

    /**
     * Runs a WorkerModuleStateRunner child step and returns its result array.
     * Timeouts and missing results are converted into failure payloads.
     *
     * @param string $command Runner command (enable/disable/install/captureFeature)
     * @param string $moduleUniqueId Module the step works on
     * @param array $extraArgs Extra argv passed to the runner after resultFile
     * @param int $timeout Hard timeout of the step in seconds
     * @return array PBXApiResult::getResult()-shaped array
     */
    private function runChildStep(string $command, string $moduleUniqueId, array $extraArgs, int $timeout): array
    {
        $tempDir = $this->di->getShared('config')->path('core.tempDir');
        $resultFile = "$tempDir/module-operation-{$this->operationUid}-" . uniqid('', false) . '.json';

        $php = Util::which('php');
        $runnerPath = Util::getFilePathByClassName(WorkerModuleStateRunner::class);
        // argv array form: no shell wrapper, proc signals reach the runner
        $cmd = array_merge(
            [$php, '-f', $runnerPath, 'start', $command, $moduleUniqueId, $resultFile],
            array_map('strval', $extraArgs)
        );

        [$finished, $timedOut] = $this->runChildWithHeartbeat($cmd, $timeout);

        $result = [];
        if (is_file($resultFile)) {
            $result = json_decode((string)file_get_contents($resultFile), true) ?: [];
            unlink($resultFile);
        }

        if ($timedOut) {
            $result = [
                'result' => false,
                'messages' => ['error' => [TranslationProvider::translate('ext_OperationStalledError')]],
            ];
        } elseif (!$finished || $result === []) {
            $result = [
                'result' => false,
                'messages' => ['error' => [TranslationProvider::translate('ext_ModuleChangeStatusError')]],
            ];
        }
        return $result;
    }

    /**
     * Pushes an explicit terminal status (used for unsupported operations and
     * unexpected orchestrator failures).
     */
    private function pushFinalStatus(bool $success, array $messages): void
    {
        $this->events->pushMessageToBrowser(
            ModuleInstallationBase::STAGE_VII_FINAL_STATUS,
            ['result' => $success, 'messages' => $messages]
        );
    }

    /**
     * Runs a child command while heartbeating the journal every second.
     *
     * The runner makes its own session (posix_setsid), so its pgid equals its
     * pid: on timeout or fencing the WHOLE child group is killed, including
     * grandchildren spawned by module hooks. The child pgid is recorded in
     * the journal so the supervisor's reaper can also clean it up when the
     * orchestrator itself dies.
     *
     * A failed heartbeat CAS means the supervisor invalidated the fencing
     * token (the operation was reaped) — the child group is killed and the
     * process exits immediately.
     *
     * @param string[] $command Child argv (no shell involved)
     * @param int $timeoutSec Hard timeout for the child
     * @return array{0: bool, 1: bool} [finishedWithZeroExit, timedOut]
     */
    private function runChildWithHeartbeat(array $command, int $timeoutSec): array
    {
        $descriptors = [
            0 => ['file', '/dev/null', 'r'],
            1 => ['file', '/dev/null', 'w'],
            2 => ['file', '/dev/null', 'w'],
        ];
        $process = proc_open($command, $descriptors, $pipes);
        if (!is_resource($process)) {
            return [false, false];
        }

        $childPid = (int)(proc_get_status($process)['pid'] ?? 0);
        // After the runner's setsid its pgid equals its pid; record it so the
        // reaper can group-kill the child if this orchestrator dies.
        $this->repository->setFields($this->operationUid, $this->fencingToken, ['childPgid' => $childPid]);

        $startedAt = time();
        while (true) {
            $status = proc_get_status($process);
            if (!$status['running']) {
                proc_close($process);
                $this->repository->setFields($this->operationUid, $this->fencingToken, ['childPgid' => null]);
                return [$status['exitcode'] === 0, false];
            }
            if (!$this->repository->heartbeat($this->operationUid, $this->fencingToken)) {
                // Fenced out by the reaper: we are a zombie now.
                $this->killChildGroup($process, $childPid);
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Operation {$this->operationUid} was fenced out, terminating",
                    LOG_WARNING
                );
                exit(1);
            }
            if (time() - $startedAt > $timeoutSec) {
                $this->killChildGroup($process, $childPid);
                $this->repository->setFields($this->operationUid, $this->fencingToken, ['childPgid' => null]);
                return [false, true];
            }
            sleep(1);
        }
    }

    /**
     * Kills the child runner together with its whole process group.
     *
     * @param resource $process proc_open handle
     * @param int $childPid Pid (== pgid after the runner's setsid)
     */
    private function killChildGroup($process, int $childPid): void
    {
        if ($childPid > 1) {
            @posix_kill(-$childPid, SIGKILL);
        }
        proc_terminate($process, SIGKILL);
        proc_close($process);
    }
}

// Start a worker process
WorkerModuleOperations::startWorker($argv ?? []);
