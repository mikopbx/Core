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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Common\Models\ModuleOperations;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\Modules\GetAvailableModulesAction;
use MikoPBX\PBXCoreREST\Lib\Modules\GetMetadataFromModulePackageAction;
use MikoPBX\PBXCoreREST\Lib\Modules\GetModuleInfoAction;
use MikoPBX\PBXCoreREST\Lib\Modules\GetModuleLinkAction;
use MikoPBX\PBXCoreREST\Lib\Modules\InstallFromPackageAction;
use MikoPBX\PBXCoreREST\Lib\Modules\DownloadStatusAction;
use MikoPBX\PBXCoreREST\Lib\Modules\InstallFromRepoAction;
use MikoPBX\PBXCoreREST\Lib\Modules\Journal\GetOperationsAction;
use MikoPBX\PBXCoreREST\Lib\Modules\Journal\GetOperationStatusAction;
use MikoPBX\PBXCoreREST\Lib\Modules\Journal\ModuleOperationsRepository;
use MikoPBX\PBXCoreREST\Lib\Modules\ModuleInstallationBase;
use MikoPBX\PBXCoreREST\Lib\Modules\StartDownloadAction;
use MikoPBX\PBXCoreREST\Lib\Modules\StatusOfModuleInstallationAction;
use MikoPBX\PBXCoreREST\Lib\Modules\UnifiedModulesEvents;
use MikoPBX\PBXCoreREST\Lib\Modules\UninstallModuleAction;
use MikoPBX\PBXCoreREST\Lib\Modules\UpdateAllModulesAction;
use MikoPBX\PBXCoreREST\Workers\WorkerModuleOperations;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use Throwable;

/**
 * Class ModulesManagementProcessor
 *
 * Manages external modules for download, install, uninstall, enable, disable.
 *
 * @property Di di
 * @package MikoPBX\PBXCoreREST\Lib
 */
class ModulesManagementProcessor extends Injectable
{
    /**
     * Processes module management requests.
     *
     * @param array $request The request data.
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];
        $data = $request['data'];
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
            switch ($action) {
                case 'startDownload':
                    $module = $request['data']['uniqid'];
                    $url = $request['data']['url'];
                    $md5 = $request['data']['md5'];
                    $res = StartDownloadAction::main($module, $url, $md5);
                    break;
                case 'getDownloadStatus':
                    $module = $request['data']['uniqid'];
                    $res = DownloadStatusAction::main($module);
                    break;
                case 'installFromPackage':
                    $filePath = $data['filePath'];
                    $fileId = $data['fileId'];
                    $asyncChannelId = $request['asyncChannelId'];
                    if (self::useLegacyInstallPipeline()) {
                        $installer = new InstallFromPackageAction($asyncChannelId, $filePath, $fileId);
                        $installer->start();
                        $res->success = true;
                    } else {
                        // The real uniqid is read from the package metadata later
                        $res = self::startModuleOperation(
                            ModuleOperations::OPERATION_INSTALL_PACKAGE,
                            $fileId,
                            ['filePath' => $filePath, 'fileId' => $fileId],
                            $asyncChannelId
                        );
                    }
                    break;
                case 'getMetadataFromPackage':
                    $filePath = $data['filePath'];
                    $res = GetMetadataFromModulePackageAction::main($filePath);
                    break;
                case 'installFromRepo':
                    $asyncChannelId = $request['asyncChannelId'];
                    $moduleUniqueID = $data['uniqid'] ?? $data['id'];
                    $releaseId = intval($data['releaseId']??0);
                    $batchId = $data['batchId'] ?? '';
                    if (self::useLegacyInstallPipeline()) {
                        $installer = new InstallFromRepoAction($asyncChannelId, $moduleUniqueID, $releaseId, $batchId);
                        $installer->start();
                        $res->success = true;
                    } else {
                        $res = self::startModuleOperation(
                            ModuleOperations::OPERATION_INSTALL_REPO,
                            $moduleUniqueID,
                            ['releaseId' => $releaseId],
                            $asyncChannelId,
                            $batchId
                        );
                    }
                    break;
                case 'updateAll':
                    $asyncChannelId = $request['asyncChannelId'];
                    $modulesForUpdate = $data['modulesForUpdate'] ?? [];
                    $res = UpdateAllModulesAction::main($asyncChannelId, is_array($modulesForUpdate) ? $modulesForUpdate : []);
                    break;
                case 'getModuleInfo':
                    $moduleUniqueID = $data['uniqid'] ?? $data['id'] ?? '';
                    $res = GetModuleInfoAction::main($moduleUniqueID);
                    break;
                case 'getInstallationStatus':
                    $filePath = $data['filePath'];
                    $res = StatusOfModuleInstallationAction::main($filePath);
                    break;
                case 'enable':
                    $asyncChannelId = $request['asyncChannelId'];
                    $moduleUniqueID = $data['uniqid'] ?? $data['id'];
                    $res = self::startModuleOperation(
                        ModuleOperations::OPERATION_ENABLE,
                        $moduleUniqueID,
                        [],
                        $asyncChannelId
                    );
                    break;
                case 'disable':
                    $asyncChannelId = $request['asyncChannelId']??'internal-request';
                    $moduleUniqueID = $data['uniqid'] ?? $data['id'];
                    $reason = $data['reason']??'';
                    $reasonText = $data['reasonText']??'';
                    $res = self::startModuleOperation(
                        ModuleOperations::OPERATION_DISABLE,
                        $moduleUniqueID,
                        ['reason' => $reason, 'reasonText' => $reasonText],
                        $asyncChannelId
                    );
                    break;
                case 'uninstall':
                    $asyncChannelId = $request['asyncChannelId'];
                    $moduleUniqueID = $data['uniqid'] ?? $data['id'];
                    $keepSettings = $data['keepSettings'] === 'true';
                    $uninstaller = new UninstallModuleAction( $asyncChannelId, $moduleUniqueID, $keepSettings);
                    $uninstaller->start();
                    $res->success=true;
                    break;
                case 'getAvailableModules':
                    $res = GetAvailableModulesAction::main();
                    break;
                case 'getOperations':
                    $res = GetOperationsAction::main(is_array($data) ? $data : []);
                    break;
                case 'getOperationStatus':
                    $moduleUniqueID = $data['uniqid'] ?? $data['id'] ?? '';
                    $operationUid = $data['operationId'] ?? '';
                    $res = GetOperationStatusAction::main($moduleUniqueID, $operationUid);
                    break;
                case 'getModuleLink':
                    $moduleReleaseId = $data['releaseId'];
                    $res = GetModuleLinkAction::main($moduleReleaseId);
                    break;
                default:
                    $res->messages['error'][] = "Unknown action - $action in ".__CLASS__;
            }
        $res->function = $action;

        return $res;
    }

    /**
     * Claims a module operation in the journal and spawns the detached
     * orchestrator (WorkerModuleOperations) that executes it. Returns
     * immediately: progress and the final result are delivered via nchan
     * and the operations journal, the WorkerApiCommands slot is never
     * blocked for the duration of the operation.
     *
     * @param string $operation One of ModuleOperations::OPERATION_*
     * @param string $moduleUniqueId Module unique id
     * @param array $params Operation parameters stored in the journal
     * @param string $asyncChannelId nchan channel id for browser notifications
     *
     * @return PBXApiResult 409 with the active operation on claim conflict
     */
    private static function startModuleOperation(
        string $operation,
        string $moduleUniqueId,
        array $params,
        string $asyncChannelId,
        string $batchId = ''
    ): PBXApiResult {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Legacy stage names keep the browser UI contract intact: toggles
        // listen for Stage_I_Module*, install flows for Stage_VII
        $failStage = match ($operation) {
            ModuleOperations::OPERATION_ENABLE => 'Stage_I_ModuleEnable',
            ModuleOperations::OPERATION_DISABLE => 'Stage_I_ModuleDisable',
            default => ModuleInstallationBase::STAGE_VII_FINAL_STATUS,
        };

        try {
            $repository = new ModuleOperationsRepository();
            $claim = $repository->claim($moduleUniqueId, $operation, $params, $asyncChannelId, $batchId);

            if (!$claim['claimed']) {
                $res->success = false;
                $res->messages['error'][] = TranslationProvider::translate('ext_ErrAnotherOperationInProgress');
                $res->data['activeOperation'] = $claim['activeOperation'];
                $res->httpCode = 409;
                // Async requests already got HTTP 200 — unfreeze the browser
                // through the notification channel as well.
                self::pushOperationRejection($asyncChannelId, $moduleUniqueId, $failStage, $res->messages);
                if ($batchId !== '') {
                    UpdateAllModulesAction::failModule($batchId, $moduleUniqueId, $res->messages);
                }
                return $res;
            }

            $php = Util::which('php');
            $workerPath = Util::getFilePathByClassName(WorkerModuleOperations::class);
            Processes::mwExecBg("$php -f $workerPath start " . escapeshellarg($claim['operationUid']));

            $res->success = true;
            $res->data['operationId'] = $claim['operationUid'];
        } catch (Throwable $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
            self::pushOperationRejection($asyncChannelId, $moduleUniqueId, $failStage, $res->messages);
            if ($batchId !== '') {
                UpdateAllModulesAction::failModule($batchId, $moduleUniqueId, $res->messages);
            }
        }

        return $res;
    }

    /**
     * Emergency switch: '1' routes install/update back to the legacy
     * mutex-driven pipeline for one release cycle.
     */
    private static function useLegacyInstallPipeline(): bool
    {
        return PbxSettings::getValueByKey(PbxSettings::MODULES_LEGACY_INSTALL_PIPELINE) === '1';
    }

    /**
     * Notifies the browser about a rejected operation start on the legacy
     * stage name, so the toggle UI unfreezes without waiting for its watchdog.
     */
    private static function pushOperationRejection(
        string $asyncChannelId,
        string $moduleUniqueId,
        string $failStage,
        array $messages
    ): void {
        if ($asyncChannelId === '' || $asyncChannelId === 'internal-request') {
            return;
        }
        try {
            $events = new UnifiedModulesEvents($asyncChannelId, $moduleUniqueId);
            $events->pushMessageToBrowser($failStage, ['result' => false, 'messages' => $messages]);
        } catch (Throwable $e) {
            // Notification failure must not mask the original error
        }
    }
}
