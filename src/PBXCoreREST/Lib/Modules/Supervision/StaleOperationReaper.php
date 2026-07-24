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

namespace MikoPBX\PBXCoreREST\Lib\Modules\Supervision;

use MikoPBX\Common\Models\ModuleOperations;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\Modules\Journal\ModuleOperationsRepository;
use MikoPBX\PBXCoreREST\Lib\Modules\ModuleInstallationBase;
use MikoPBX\PBXCoreREST\Lib\Modules\UnifiedModulesEvents;
use MikoPBX\PBXCoreREST\Lib\Modules\UpdateAllModulesAction;
use MikoPBX\PBXCoreREST\Workers\WorkerModuleOperations;
use MikoPBX\PBXCoreREST\Workers\WorkerModuleStateRunner;
use Throwable;

/**
 * Class StaleOperationReaper
 *
 * Supervision of module operations: finds journal rows whose heartbeat died
 * (orchestrator killed, power loss, legacy dual-write row of a crashed
 * WorkerApiCommands) and finalizes them so nothing stays "running" forever:
 *
 *  1. the fencing token is invalidated FIRST — from that moment the original
 *     process (or its zombie children) can no longer write anything;
 *  2. the recorded process group is killed (only for orchestrator-owned rows
 *     that stored a pgid; legacy rows carry the long-dead WorkerApiCommands
 *     pid and no group);
 *  3. the row is transitioned to failed with the new token;
 *  4. a terminal nchan push unfreezes any browser still watching the channel;
 *  5. a batch member additionally advances its Update All batch via
 *     failModule(), so a stuck module cannot freeze the whole batch.
 *
 * Called from WorkerSafeScriptsCore's main loop (rate limited by the caller).
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules\Supervision
 */
class StaleOperationReaper
{
    /**
     * Heartbeat age after which an active operation is presumed dead.
     * Mirrors ModuleOperationsRepository::HEARTBEAT_STALE_AFTER.
     */
    public const int STALE_AFTER_SEC = ModuleOperationsRepository::HEARTBEAT_STALE_AFTER;

    /**
     * Finds and finalizes all stale operations.
     *
     * @return int Number of reaped operations
     */
    public function reap(): int
    {
        $reaped = 0;
        try {
            $repository = new ModuleOperationsRepository();
            $threshold = time() - self::STALE_AFTER_SEC;
            foreach ($repository->getAllActive() as $row) {
                if ((int)($row['heartbeatAt'] ?? 0) >= $threshold) {
                    continue; // alive
                }
                if ($this->reapOne($repository, $row)) {
                    $reaped++;
                }
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(__CLASS__, 'Reaping failed: ' . $e->getMessage(), LOG_ERR);
        }
        return $reaped;
    }

    /**
     * Finalizes a single stale operation.
     *
     * @param ModuleOperationsRepository $repository
     * @param array $row The stale journal row
     * @return bool True when the operation was reaped
     */
    private function reapOne(ModuleOperationsRepository $repository, array $row): bool
    {
        $uid = (string)$row['operationUid'];
        $pgid = (int)($row['pgid'] ?? 0);

        // Legacy dual-write rows (no orchestrator pgid) heartbeat only on
        // stage pushes and have silent windows well over the stale threshold
        // (module hooks, uninstall of the previous version, license calls).
        // While the owning WorkerApiCommands process is alive the operation
        // is presumed live — only rows of a DEAD process are reaped.
        if ($pgid <= 1) {
            $legacyPid = (int)($row['pid'] ?? 0);
            if ($legacyPid > 1 && @posix_getpgid($legacyPid) !== false) {
                return false;
            }
        }

        // Fence out the original process before anything else: after this CAS
        // its heartbeat fails and every further write is rejected.
        $newToken = $repository->invalidateToken($uid);
        if ($newToken === null) {
            return false; // finished or already reaped concurrently
        }

        // Re-fetch AFTER the fence: a stalled-then-resumed orchestrator could
        // have recorded a fresh childPgid between our snapshot and the fence.
        $row = $repository->getByUid($uid) ?? $row;

        $this->killProcessGroup(
            $pgid,
            WorkerModuleOperations::class . '-' . $uid
        );
        // The runner lives in its own session — clean its group up as well
        $this->killProcessGroup(
            (int)($row['childPgid'] ?? 0),
            WorkerModuleStateRunner::class
        );

        $errorMessage = TranslationProvider::translate('ext_OperationStalledError');
        $repository->transition(
            $uid,
            $newToken,
            ModuleOperations::ACTIVE_STATES,
            ModuleOperations::STATE_FAILED,
            ['errorData' => json_encode(['error' => [$errorMessage]], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)]
        );

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf(
                'Reaped stale module operation %s (%s on %s), heartbeat died at %d',
                $uid,
                (string)$row['operation'],
                (string)$row['moduleUniqueId'],
                (int)($row['heartbeatAt'] ?? 0)
            ),
            LOG_WARNING
        );

        $this->notifyWatchers($row, $errorMessage);
        return true;
    }

    /**
     * Kills a recorded process group after verifying it still belongs to us.
     * Legacy dual-write rows store the WorkerApiCommands pid without setsid —
     * their pgid is never recorded and this method is never called for them.
     *
     * @param int $pgid Recorded process group id (== leader pid after setsid)
     * @param string $expectedTitleFragment Process title the leader must carry
     */
    private function killProcessGroup(int $pgid, string $expectedTitleFragment): void
    {
        // Killing group 0/1 or a foreign group would take down innocents.
        if ($pgid <= 1 || @posix_getpgid($pgid) !== $pgid) {
            return;
        }
        // PID-recycling guard: the leader must still be OUR process. The
        // orchestrator/runner set unique cli titles which are visible in
        // /proc/<pid>/cmdline; a recycled pid will not match.
        $cmdline = @file_get_contents("/proc/$pgid/cmdline");
        $shortFragment = substr($expectedTitleFragment, strrpos($expectedTitleFragment, '\\') + 1);
        if ($cmdline === false || !str_contains($cmdline, $shortFragment)) {
            return;
        }
        @posix_kill(-$pgid, SIGKILL);
    }

    /**
     * Sends the terminal nchan push and advances an Update All batch.
     *
     * @param array $row The reaped journal row
     * @param string $errorMessage Human readable reason
     */
    private function notifyWatchers(array $row, string $errorMessage): void
    {
        $channelId = (string)($row['channelId'] ?? '');
        $moduleUniqueId = (string)($row['moduleUniqueId'] ?? '');
        $batchId = (string)($row['batchId'] ?? '');
        $messages = ['error' => [$errorMessage]];

        try {
            if ($channelId !== '') {
                $events = new UnifiedModulesEvents($channelId, $moduleUniqueId, $batchId);
                $events->pushMessageToBrowser(
                    ModuleInstallationBase::STAGE_VII_FINAL_STATUS,
                    ['result' => false, 'messages' => $messages]
                );
            }
            if ($batchId !== '') {
                UpdateAllModulesAction::failModule($batchId, $moduleUniqueId, $messages);
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                'Failed to notify watchers about reaped operation: ' . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
}
