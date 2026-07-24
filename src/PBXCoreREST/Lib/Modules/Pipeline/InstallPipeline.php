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

namespace MikoPBX\PBXCoreREST\Lib\Modules\Pipeline;

use MikoPBX\Common\Models\ModuleOperations;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Lib\Files\FilesConstants;
use MikoPBX\PBXCoreREST\Lib\Files\StatusUploadFileAction;
use MikoPBX\PBXCoreREST\Lib\Modules\GetMetadataFromModulePackageAction;
use MikoPBX\PBXCoreREST\Lib\Modules\GetModuleInfoAction;
use MikoPBX\PBXCoreREST\Lib\Modules\GetModuleLinkAction;
use MikoPBX\PBXCoreREST\Lib\Modules\Journal\ModuleOperationsRepository;
use MikoPBX\PBXCoreREST\Lib\Modules\ModuleInstallationBase;
use MikoPBX\PBXCoreREST\Lib\Modules\UnifiedModulesEvents;
use MikoPBX\PBXCoreREST\Lib\Modules\UpdateAllModulesAction;
use RuntimeException;
use Throwable;

/**
 * Class InstallPipeline
 *
 * Atomic install/update of a module, executed inside the detached
 * orchestrator (WorkerModuleOperations). The previous version is never
 * destroyed before the new one succeeds:
 *
 *   A. resolve release / capture license (child) / resolve link /
 *      download (inline, progress keeps the heartbeat alive) or wait for
 *      the uploaded package; extract into {modulesDir}/.staging/;
 *   B. disable the CURRENT version in a child process (old module code);
 *   C. swap: kill bin/ holders, snapshot the registration row, keep the
 *      legacy Backup/{uniqid}/db contract, live -> .backup, staging -> live;
 *   D. run Setup::installModule() of the NEW code in a child process;
 *   E. re-enable in a child when the module was enabled before;
 *   F. finalize, deferred removal of the backup.
 *
 * On failure: before the swap only staging is removed; after the swap the
 * RollbackService restores the previous version, its registration row and
 * its enabled state. Stage names and payload shapes match the legacy
 * pipeline, so the browser UI works unchanged.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules\Pipeline
 */
class InstallPipeline
{
    // Waiting budget for the uploaded package merge (matches legacy)
    private const int UPLOAD_TIMEOUT = 120;

    private ModuleOperationsRepository $repository;
    private string $operationUid;
    private string $fencingToken;
    private UnifiedModulesEvents $events;

    /**
     * Runs a child step through the orchestrator:
     * fn(string $command, string $moduleUniqueId, array $extraArgs, int $timeout): array
     * Returns the PBXApiResult::getResult()-shaped array of the step.
     * @var callable
     */
    private $runChildStep;

    private string $moduleUniqueId = '';
    private string $batchId = '';
    private bool $wasEnabled = false;
    private bool $swapDone = false;

    public function __construct(
        ModuleOperationsRepository $repository,
        string $operationUid,
        string $fencingToken,
        UnifiedModulesEvents $events,
        callable $runChildStep
    ) {
        $this->repository = $repository;
        $this->operationUid = $operationUid;
        $this->fencingToken = $fencingToken;
        $this->events = $events;
        $this->runChildStep = $runChildStep;
    }

    /**
     * Executes the whole install/update operation.
     *
     * @param array $row The journal row of the operation
     */
    public function run(array $row): void
    {
        $params = json_decode((string)$row['params'], true) ?: [];
        $this->moduleUniqueId = (string)$row['moduleUniqueId'];
        $this->batchId = (string)$row['batchId'];

        $result = ['result' => true, 'messages' => []];
        try {
            if ($row['operation'] === ModuleOperations::OPERATION_INSTALL_REPO) {
                $zipFile = $this->phaseAcquireFromRepo((int)($params['releaseId'] ?? 0));
            } else {
                $zipFile = $this->phaseAcquireFromPackage(
                    (string)($params['filePath'] ?? ''),
                    (string)($params['fileId'] ?? '')
                );
            }

            $stagingDir = $this->phaseExtractToStaging($zipFile);
            $this->phaseDisableCurrent();
            $this->phaseSwap($stagingDir);
            $this->phaseSetupNewVersion();
            $enableFailMessages = $this->phaseReEnable();
            $this->phaseFinalizeSuccess($zipFile);
            if ($enableFailMessages !== null) {
                // The new version is installed correctly — only the re-enable
                // failed. No version rollback; report the enable problem.
                $result = ['result' => false, 'messages' => $enableFailMessages];
            }
        } catch (Throwable $e) {
            $messages = $e instanceof PipelineStepException
                ? $e->getStepMessages()
                : ['error' => [$e->getMessage()]];
            // A fenced-out orchestrator must not run its own rollback: the
            // reaper's rollback process owns the operation now.
            $this->assertNotFenced();
            $this->handleFailure();
            $result = ['result' => false, 'messages' => $messages];
        }

        // Fencing check before finalization and browser pushes as well
        $this->assertNotFenced();

        if ($this->batchId !== '') {
            if ($result['result']) {
                UpdateAllModulesAction::completeModule($this->batchId, $this->moduleUniqueId, $result['messages']);
            } else {
                UpdateAllModulesAction::failModule($this->batchId, $this->moduleUniqueId, $result['messages']);
            }
        }

        // Terminal push finalizes the journal row through the journal context
        $this->events->pushMessageToBrowser(ModuleInstallationBase::STAGE_VII_FINAL_STATUS, $result);
    }

    /**
     * Phase A (repo): release info -> license capture -> link -> download.
     *
     * @return string Path to the downloaded zip
     */
    private function phaseAcquireFromRepo(int $releaseId): string
    {
        // Stage I: resolve the release
        $moduleInfo = GetModuleInfoAction::main($this->moduleUniqueId);
        if (empty($moduleInfo->data['releases'])) {
            $this->failStage(
                ModuleInstallationBase::STAGE_I_GET_RELEASE,
                ['error' => [TranslationProvider::translate(ModuleInstallationBase::ERR_EMPTY_REPO_RESULT)]]
            );
        }
        $releaseInfo = ['releaseID' => 0];
        foreach ($moduleInfo->data['releases'] as $release) {
            if ((int)$release['releaseID'] === $releaseId) {
                $releaseInfo['releaseID'] = $release['releaseID'];
                break;
            }
            if ((int)$release['releaseID'] > $releaseInfo['releaseID']) {
                $releaseInfo['releaseID'] = $release['releaseID'];
            }
        }
        $releaseInfo['licFeatureId'] = (int)($moduleInfo->data['lic_feature_id'] ?? 0);
        $releaseInfo['licProductId'] = (int)($moduleInfo->data['lic_product_id'] ?? 0);
        $this->pushStage(ModuleInstallationBase::STAGE_I_GET_RELEASE, ['result' => true], 5);

        // Stage II: capture the license feature in a child — the license
        // client is compiled code with unmanaged timeouts
        if ($releaseInfo['licFeatureId'] > 0) {
            $licenseResult = ($this->runChildStep)(
                'captureFeature',
                $this->moduleUniqueId,
                [json_encode($releaseInfo, JSON_UNESCAPED_SLASHES)],
                60
            );
            if (($licenseResult['result'] ?? false) !== true) {
                $this->failStage(
                    ModuleInstallationBase::STAGE_II_CHECK_LICENSE,
                    $licenseResult['messages'] ?? ['error' => ['License capture failed']]
                );
            }
        }
        $this->pushStage(ModuleInstallationBase::STAGE_II_CHECK_LICENSE, ['result' => true], 15);

        // Stage III: resolve the download link
        $linkResult = GetModuleLinkAction::main($releaseInfo['releaseID']);
        $modules = $linkResult->data['modules'] ?? [];
        if (!$linkResult->success || count($modules) === 0) {
            $this->failStage(
                ModuleInstallationBase::STAGE_III_GET_LINK,
                $linkResult->success
                    ? ['error' => [TranslationProvider::translate(ModuleInstallationBase::ERR_EMPTY_GET_MODULE_LINK)]]
                    : $linkResult->messages
            );
        }
        $moduleLink = $modules[0];
        $this->pushStage(ModuleInstallationBase::STAGE_III_GET_LINK, ['result' => true], 25);

        // Stage IV: download inline; the progress callback keeps the journal
        // heartbeat alive so no detached downloader is needed
        $zipFile = $this->operationTempDir() . '/module.zip';
        $downloader = new ModuleDownloadService();
        $error = $downloader->download(
            (string)$moduleLink['href'],
            (string)$moduleLink['md5'],
            $zipFile,
            function (int $percent): void {
                // Map download to the 25..50 progress band
                $this->tickProgress(ModuleInstallationBase::STAGE_IV_DOWNLOAD_MODULE, 25 + intdiv($percent, 4));
            }
        );
        if ($error !== '') {
            $this->failStage(ModuleInstallationBase::STAGE_IV_DOWNLOAD_MODULE, ['error' => [$error]]);
        }
        $this->pushStage(ModuleInstallationBase::STAGE_IV_DOWNLOAD_MODULE, ['result' => true], 50);
        return $zipFile;
    }

    /**
     * Phase A (package): waits until the uploaded package is merged.
     *
     * @return string Path to the uploaded zip
     */
    private function phaseAcquireFromPackage(string $filePath, string $fileId): string
    {
        if ($filePath === '' || $fileId === '') {
            $this->failStage(
                ModuleInstallationBase::STAGE_I_UPLOAD_MODULE,
                ['error' => ['Missing uploaded package parameters']]
            );
        }
        $budget = self::UPLOAD_TIMEOUT;
        while ($budget > 0) {
            $status = StatusUploadFileAction::main($fileId);
            if (!$status->success) {
                $this->failStage(ModuleInstallationBase::STAGE_I_UPLOAD_MODULE, $status->messages);
            }
            $state = $status->data[FilesConstants::D_STATUS] ?? FilesConstants::UPLOAD_IN_PROGRESS;
            if ($state === FilesConstants::UPLOAD_COMPLETE) {
                $this->pushStage(ModuleInstallationBase::STAGE_I_UPLOAD_MODULE, ['result' => true], 25);
                return $filePath;
            }
            $this->tickProgress(ModuleInstallationBase::STAGE_I_UPLOAD_MODULE, 5 + intdiv((self::UPLOAD_TIMEOUT - $budget) * 20, self::UPLOAD_TIMEOUT));
            sleep(1);
            $budget--;
        }
        $this->failStage(
            ModuleInstallationBase::STAGE_I_UPLOAD_MODULE,
            ['error' => [TranslationProvider::translate(ModuleInstallationBase::ERR_UPLOAD_TIMEOUT)]]
        );
        return ''; // unreachable
    }

    /**
     * Validates the package metadata and extracts it into the staging dir.
     *
     * @return string The staging directory path
     */
    private function phaseExtractToStaging(string $zipFile): string
    {
        $metadata = GetMetadataFromModulePackageAction::main($zipFile);
        if (!$metadata->success) {
            $this->failStage(ModuleInstallationBase::STAGE_V_INSTALL_MODULE, $metadata->messages);
        }
        $realUniqueId = (string)$metadata->data['uniqid'];

        // Package flow starts with only the upload fileId — fix the identity up
        if ($realUniqueId !== $this->moduleUniqueId) {
            $this->moduleUniqueId = $realUniqueId;
            $this->repository->setFields(
                $this->operationUid,
                $this->fencingToken,
                ['moduleUniqueId' => $realUniqueId]
            );
            $this->events->updateModuleUniqueId($realUniqueId);
        }

        $modulesDir = Directories::getDir(Directories::CORE_MODULES_DIR);
        $stagingDir = "$modulesDir/.staging/$this->moduleUniqueId-$this->operationUid";
        $this->repository->setFields($this->operationUid, $this->fencingToken, ['stagingPath' => $stagingDir]);

        $error = ModuleArchiveExtractor::extract(
            $zipFile,
            $stagingDir,
            function (int $percent): void {
                // Map extraction to the 50..60 progress band
                $this->tickProgress(ModuleInstallationBase::STAGE_V_INSTALL_MODULE, 50 + intdiv($percent, 10));
            }
        );
        if ($error !== '') {
            $this->failStage(ModuleInstallationBase::STAGE_V_INSTALL_MODULE, ['error' => [$error]]);
        }

        // The package must carry an installer for the NEW code phase
        if (!is_file("$stagingDir/Setup/PbxExtensionSetup.php")) {
            $this->failStage(
                ModuleInstallationBase::STAGE_V_INSTALL_MODULE,
                ['error' => ["Package of $this->moduleUniqueId carries no Setup/PbxExtensionSetup.php"]]
            );
        }
        return $stagingDir;
    }

    /**
     * Phase B: disables the current version (old module code, child process).
     */
    private function phaseDisableCurrent(): void
    {
        if (!PbxExtensionUtils::isEnabled($this->moduleUniqueId)) {
            return;
        }
        $this->wasEnabled = true;
        $this->repository->setFields($this->operationUid, $this->fencingToken, ['wasEnabled' => '1']);

        $disableResult = ($this->runChildStep)('disable', $this->moduleUniqueId, [], 120);
        if (($disableResult['result'] ?? false) !== true) {
            $this->failStage(
                ModuleInstallationBase::STAGE_V_INSTALL_MODULE,
                $disableResult['messages'] ?? ['error' => ["Cannot disable $this->moduleUniqueId before update"]]
            );
        }
    }

    /**
     * Phase C: atomic directory swap with registration snapshot.
     */
    private function phaseSwap(string $stagingDir): void
    {
        $modulesDir = Directories::getDir(Directories::CORE_MODULES_DIR);
        $liveDir = PbxExtensionUtils::getModuleDir($this->moduleUniqueId);

        // Snapshot the registration row for rollback (empty for fresh install)
        $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueId);
        $snapshot = $module === null ? [] : $module->toArray();
        $prevVersion = $module?->version ?? '';
        $this->repository->setFields($this->operationUid, $this->fencingToken, [
            'rowSnapshot' => json_encode($snapshot, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'prevVersion' => (string)$prevVersion,
        ]);

        if (is_dir($liveDir)) {
            PbxExtensionUtils::killModuleBinProcesses($liveDir);

            // Legacy contract: installFiles() of the new version restores the
            // previous settings DB from {modulesDir}/Backup/{uniqid}/db
            if (is_dir("$liveDir/db")) {
                $legacyBackup = "$modulesDir/Backup/$this->moduleUniqueId";
                $rm = Util::which('rm');
                $cp = Util::which('cp');
                Processes::mwExec("$rm -rf " . escapeshellarg($legacyBackup));
                Util::mwMkdir($legacyBackup);
                Processes::mwExec(
                    "$cp -r " . escapeshellarg("$liveDir/db") . ' ' . escapeshellarg($legacyBackup . '/')
                );
            }

            $backupDir = "$modulesDir/.backup/$this->moduleUniqueId-$this->operationUid";
            Util::mwMkdir("$modulesDir/.backup");
            // WRITE-AHEAD: record the backup location BEFORE the rename, so a
            // crash between the two leaves a journal that knows where the
            // previous version is. A rejected CAS means we were fenced out —
            // abort before any irreversible move.
            $this->guardJournalWrite(
                $this->repository->setFields($this->operationUid, $this->fencingToken, ['backupPath' => $backupDir])
            );
            if (!rename($liveDir, $backupDir)) {
                throw new RuntimeException("Cannot move $liveDir aside to $backupDir");
            }
        }

        if (!rename($stagingDir, $liveDir)) {
            // Bring the previous version back immediately — nothing else
            // happened yet, so this inline restore keeps the system intact
            if (isset($backupDir) && is_dir($backupDir)) {
                rename($backupDir, $liveDir);
            }
            throw new RuntimeException("Cannot move $stagingDir into place");
        }
        $this->swapDone = true;
        $this->guardJournalWrite(
            $this->repository->setFields($this->operationUid, $this->fencingToken, [
                'swapDone' => '1',
                'stagingPath' => null,
            ])
        );
        Util::addRegularWWWRights($liveDir);
        $this->tickProgress(ModuleInstallationBase::STAGE_V_INSTALL_MODULE, 70);
    }

    /**
     * Dies when the operation was fenced out by the reaper (heartbeat CAS
     * rejected): every action after that point belongs to the reaper.
     */
    private function assertNotFenced(): void
    {
        if ($this->repository->heartbeat($this->operationUid, $this->fencingToken)) {
            return;
        }
        SystemMessages::sysLogMsg(
            self::class,
            "Operation $this->operationUid was fenced, discarding result",
            LOG_WARNING
        );
        exit(1);
    }

    /**
     * A rejected CAS on a swap checkpoint means the reaper fenced us out:
     * stop immediately, before touching anything irreversible — the reaper's
     * rollback process owns the operation now.
     */
    private function guardJournalWrite(bool $casSucceeded): void
    {
        if ($casSucceeded) {
            return;
        }
        SystemMessages::sysLogMsg(
            self::class,
            "Operation $this->operationUid was fenced at a swap checkpoint, aborting",
            LOG_WARNING
        );
        exit(1);
    }

    /**
     * Phase D: Setup::installModule() of the NEW code in a child process.
     */
    private function phaseSetupNewVersion(): void
    {
        $installResult = ($this->runChildStep)('install', $this->moduleUniqueId, [], 120);
        if (($installResult['result'] ?? false) !== true) {
            $this->failStage(
                ModuleInstallationBase::STAGE_V_INSTALL_MODULE,
                $installResult['messages'] ?? ['error' => ["Installation of $this->moduleUniqueId failed"]]
            );
        }
        $newVersion = (string)(PbxExtensionModules::findFirstByUniqid($this->moduleUniqueId)?->version ?? '');
        $this->repository->setFields($this->operationUid, $this->fencingToken, ['newVersion' => $newVersion]);
        $this->pushStage(ModuleInstallationBase::STAGE_V_INSTALL_MODULE, ['result' => true], 90);
    }

    /**
     * Phase E: re-enable when the module was enabled before the operation.
     * An enable failure does NOT roll the version back: the new code is
     * installed correctly, the operator can enable it manually.
     *
     * @return array|null null on success, failure messages otherwise
     */
    private function phaseReEnable(): ?array
    {
        if (!$this->wasEnabled) {
            return null;
        }
        $enableResult = ($this->runChildStep)('enable', $this->moduleUniqueId, [], 120);
        $this->events->pushMessageToBrowser(
            ModuleInstallationBase::STAGE_VI_ENABLE_MODULE,
            $enableResult
        );
        if (($enableResult['result'] ?? false) !== true) {
            return $enableResult['messages']
                ?? ['error' => ["Module $this->moduleUniqueId updated but failed to enable"]];
        }
        return null;
    }

    /**
     * Phase F: success housekeeping.
     */
    private function phaseFinalizeSuccess(string $zipFile): void
    {
        $row = $this->repository->getByUid($this->operationUid) ?? [];
        $backupPath = (string)($row['backupPath'] ?? '');
        $rm = Util::which('rm');

        // Single deferred command: same-second mwExecBg calls share the
        // TEMP_SCRIPTS_DIR/{time()}_noop.sh file and would clobber each other
        $targets = [];
        if ($backupPath !== '') {
            $targets[] = escapeshellarg($backupPath);
        }
        $tempDir = $this->operationTempDir();
        if (is_dir($tempDir)) {
            $targets[] = escapeshellarg($tempDir);
        }
        if (is_file($zipFile) && !str_starts_with($zipFile, $tempDir)) {
            // Uploaded package outside our temp dir — schedule its dir too
            $targets[] = escapeshellarg(dirname($zipFile));
        }
        if ($targets !== []) {
            // Deferred: give a just-in-case manual recovery window
            Processes::mwExecBg("$rm -rf " . implode(' ', $targets), '/dev/null', 600);
        }
    }

    /**
     * Failure path: restore the previous state.
     */
    private function handleFailure(): void
    {
        try {
            $row = $this->repository->getByUid($this->operationUid) ?? [];
            if ($this->swapDone || (string)($row['swapDone'] ?? '0') === '1') {
                $rollback = new RollbackService();
                $rollbackMessages = $rollback->rollback(
                    $row,
                    fn(string $moduleUniqueId): bool =>
                        (($this->runChildStep)('enable', $moduleUniqueId, [], 120)['result'] ?? false) === true
                );
                if ($rollbackMessages !== []) {
                    SystemMessages::sysLogMsg(
                        self::class,
                        'Rollback problems: ' . json_encode($rollbackMessages),
                        LOG_ERR
                    );
                }
            } else {
                $stagingPath = (string)($row['stagingPath'] ?? '');
                if ($stagingPath !== '' && is_dir($stagingPath)) {
                    $rm = Util::which('rm');
                    Processes::mwExec("$rm -rf " . escapeshellarg($stagingPath));
                }
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(self::class, 'Failure handling error: ' . $e->getMessage(), LOG_ERR);
        }
    }

    /**
     * Pushes a stage message and records it in the journal.
     */
    private function pushStage(string $stage, array $details, int $progress): void
    {
        $this->repository->updateStage($this->operationUid, $this->fencingToken, $stage, $progress);
        $this->events->pushMessageToBrowser($stage, $details);
    }

    /**
     * Cheap progress/heartbeat tick without a browser push storm: the journal
     * gets the fresh progress, the browser is notified at stage boundaries.
     */
    private function tickProgress(string $stage, int $progress): void
    {
        $this->repository->updateStage($this->operationUid, $this->fencingToken, $stage, $progress);
    }

    /**
     * Aborts the pipeline from a stage with browser notification.
     */
    private function failStage(string $stage, array $messages): never
    {
        $this->events->pushMessageToBrowser($stage, ['result' => false, 'messages' => $messages]);
        throw new PipelineStepException($messages);
    }

    /**
     * Per-operation temp directory for downloads.
     */
    private function operationTempDir(): string
    {
        $tempDir = Directories::getDir(Directories::CORE_TEMP_DIR) . '/module-operations/' . $this->operationUid;
        if (!is_dir($tempDir)) {
            Util::mwMkdir($tempDir);
        }
        return $tempDir;
    }
}
