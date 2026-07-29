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

namespace MikoPBX\PBXCoreREST\Lib\Modules\Journal;

use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\Modules\ModuleInstallationBase;
use MikoPBX\PBXCoreREST\Lib\Modules\UninstallModuleAction;
use Throwable;

/**
 * Class OperationJournal
 *
 * Fail-safe facade over ModuleOperationsRepository for the legacy module
 * pipeline (dual-write). Journal write failures are logged and swallowed:
 * observability must never break an installation that would otherwise
 * succeed. The new orchestrator (WorkerModuleOperations) uses the repository
 * directly, where journal failures ARE fatal.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules\Journal
 */
class OperationJournal
{
    /**
     * Legacy stage name -> approximate progress percent for the journal.
     * The orchestrator pipeline writes precise progress instead.
     */
    private const array STAGE_PROGRESS = [
        ModuleInstallationBase::STAGE_I_GET_RELEASE => 5,
        ModuleInstallationBase::STAGE_I_UPLOAD_MODULE => 5,
        ModuleInstallationBase::STAGE_II_CHECK_LICENSE => 15,
        ModuleInstallationBase::STAGE_III_GET_LINK => 25,
        ModuleInstallationBase::STAGE_IV_DOWNLOAD_MODULE => 45,
        ModuleInstallationBase::STAGE_V_INSTALL_MODULE => 70,
        ModuleInstallationBase::STAGE_VI_ENABLE_MODULE => 90,
        ModuleInstallationBase::STAGE_VII_FINAL_STATUS => 100,
        UninstallModuleAction::STAGE_I_DISABLE_MODULE => 10,
        UninstallModuleAction::STAGE_II_STOP_PROCESSES => 25,
        UninstallModuleAction::STAGE_III_BACKUP_DB => 40,
        UninstallModuleAction::STAGE_IV_RUN_INNER_UNINSTALLER => 55,
        UninstallModuleAction::STAGE_IV_RUN_FAILOVER_UNINSTALLER => 55,
        UninstallModuleAction::STAGE_V_DELETE_MODULE_FOLDER => 75,
        UninstallModuleAction::STAGE_VI_UNREGISTER_MODULE => 90,
        'Stage_I_ModuleEnable' => 90,
        'Stage_I_ModuleDisable' => 90,
    ];

    /**
     * Opens a journal row for a legacy pipeline operation.
     *
     * @return array{0: string, 1: string}|null [operationUid, fencingToken] or null on failure
     */
    public static function begin(
        string $moduleUniqueId,
        string $operation,
        array $params = [],
        string $channelId = '',
        string $batchId = ''
    ): ?array {
        try {
            $repository = new ModuleOperationsRepository();
            return $repository->open($moduleUniqueId, $operation, $params, $channelId, $batchId);
        } catch (Throwable $e) {
            self::logFailure(__FUNCTION__, $e);
            return null;
        }
    }

    /**
     * Records a stage push from the legacy pipeline.
     * Stage_VII_FinalStatus finalizes the row using the pushed result flag
     * (state, stage and progress land in a single CAS UPDATE).
     *
     * NOTE (legacy install two-phase gap): the legacy install flow pushes
     * Stage_VII when Phase 1 (download/extract/register) completes, and the
     * possible Phase 2 re-enable after the worker restart happens on a fresh
     * instance without a journal context. The journal therefore mirrors what
     * the browser sees today: Phase 1 Stage_VII is the terminal signal, a
     * Phase 2 re-enable failure is retried by processModulePostInstallations
     * and is not reflected here. The PR3 orchestrator pipeline removes the
     * two-phase split entirely (enable runs inside the operation).
     *
     * @param array $stageDetails The payload pushed to the browser
     */
    public static function recordStage(?array $context, string $stage, array $stageDetails): void
    {
        if ($context === null) {
            return;
        }
        [$uid, $token] = $context;
        try {
            $repository = new ModuleOperationsRepository();
            if ($stage === ModuleInstallationBase::STAGE_VII_FINAL_STATUS) {
                $success = (bool)($stageDetails['result'] ?? false);
                $messages = is_array($stageDetails['messages'] ?? null) ? $stageDetails['messages'] : [];
                $repository->finish($uid, $token, $success, $messages, $stage);
            } else {
                $repository->updateStage($uid, $token, $stage, self::STAGE_PROGRESS[$stage] ?? null);
            }
        } catch (Throwable $e) {
            self::logFailure(__FUNCTION__, $e);
        }
    }

    /**
     * Fixes up the module id of an operation opened before it was known
     * (install from package starts with only the upload fileId).
     */
    public static function updateModuleUniqueId(?array $context, string $moduleUniqueId): void
    {
        if ($context === null || $moduleUniqueId === '') {
            return;
        }
        [$uid, $token] = $context;
        try {
            $repository = new ModuleOperationsRepository();
            $repository->setFields($uid, $token, ['moduleUniqueId' => $moduleUniqueId]);
        } catch (Throwable $e) {
            self::logFailure(__FUNCTION__, $e);
        }
    }

    /**
     * Finalizes a journal row explicitly (flows without a Stage_VII push).
     */
    public static function finish(?array $context, bool $success, array $messages = []): void
    {
        if ($context === null) {
            return;
        }
        [$uid, $token] = $context;
        try {
            $repository = new ModuleOperationsRepository();
            $repository->finish($uid, $token, $success, $messages);
        } catch (Throwable $e) {
            self::logFailure(__FUNCTION__, $e);
        }
    }

    /**
     * Checks whether a live (non-stale) module operation is in progress.
     * Used by the legacy pipeline as a guard against running concurrently
     * with an orchestrator-driven operation. Fails open: journal problems
     * must not block the legacy flow.
     */
    public static function hasAliveOperation(): bool
    {
        try {
            $repository = new ModuleOperationsRepository();
            $threshold = time() - ModuleOperationsRepository::HEARTBEAT_STALE_AFTER;
            foreach ($repository->getAllActive() as $row) {
                if ((int)($row['heartbeatAt'] ?? 0) >= $threshold) {
                    return true;
                }
            }
        } catch (Throwable $e) {
            self::logFailure(__FUNCTION__, $e);
        }
        return false;
    }

    private static function logFailure(string $method, Throwable $e): void
    {
        SystemMessages::sysLogMsg(
            self::class,
            "Journal write failed in $method: " . $e->getMessage(),
            LOG_WARNING
        );
    }
}
