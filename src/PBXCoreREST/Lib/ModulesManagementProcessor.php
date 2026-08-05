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
use MikoPBX\Core\System\SystemMessages;
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
        // Who asked for it: JWT user name and client IP, empty for localhost
        // and internal calls. Used for the audit line in startModuleOperation().
        $sessionContext = $request['sessionContext'] ?? [];
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
                            $asyncChannelId,
                            '',
                            $sessionContext
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
                            $batchId,
                            $sessionContext
                        );
                    }
                    break;
                case 'updateAll':
                    $asyncChannelId = $request['asyncChannelId'];
                    $modulesForUpdate = $data['modulesForUpdate'] ?? [];
                    $res = UpdateAllModulesAction::main(
                        $asyncChannelId,
                        is_array($modulesForUpdate) ? $modulesForUpdate : [],
                        $sessionContext
                    );
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
                        $asyncChannelId,
                        '',
                        $sessionContext
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
                        $asyncChannelId,
                        '',
                        $sessionContext
                    );
                    break;
                case 'uninstall':
                    $asyncChannelId = $request['asyncChannelId'];
                    $moduleUniqueID = $data['uniqid'] ?? $data['id'];
                    $keepSettings = $data['keepSettings'] === 'true';
                    if (self::useLegacyInstallPipeline()) {
                        $uninstaller = new UninstallModuleAction( $asyncChannelId, $moduleUniqueID, $keepSettings);
                        $uninstaller->start();
                        $res->success=true;
                    } else {
                        $res = self::startModuleOperation(
                            ModuleOperations::OPERATION_UNINSTALL,
                            $moduleUniqueID,
                            ['keepSettings' => $keepSettings],
                            $asyncChannelId,
                            '',
                            $sessionContext
                        );
                    }
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
     * @param string $batchId Batch id for bulk update flows
     * @param array $sessionContext REST session context {user_name, remote_addr}
     *
     * @return PBXApiResult 409 with the active operation on claim conflict
     */
    private static function startModuleOperation(
        string $operation,
        string $moduleUniqueId,
        array $params,
        string $asyncChannelId,
        string $batchId = '',
        array $sessionContext = []
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

            self::logOperationInitiator($operation, $moduleUniqueId, $params, $claim['operationUid'], $sessionContext);

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
     * Writes an audit line about who started a module operation.
     *
     * WHY: enable/disable left no trace in system/messages, so answering
     * "who turned this module off" meant digging through nginx/access.log.
     * The line is written once the journal claim succeeded, so rejected (409)
     * attempts are not recorded as operations that ran.
     *
     * @param string $operation One of ModuleOperations::OPERATION_*
     * @param string $moduleUniqueId Module unique id
     * @param array $params Operation parameters (the disable reason lives here)
     * @param string $operationUid Journal operation uid, links the line to the row
     * @param array $sessionContext REST session context {user_name, remote_addr}
     */
    private static function logOperationInitiator(
        string $operation,
        string $moduleUniqueId,
        array $params,
        string $operationUid,
        array $sessionContext
    ): void {
        // Three cases: a JWT caller has user_name; a raw API-Key caller has a
        // session but no user_name (traceable through token_id instead);
        // localhost and internal calls carry no session context at all.
        $hasSession = $sessionContext !== [];
        $context = [
            'operation' => $operation,
            'module' => $moduleUniqueId,
            'user' => (string)($sessionContext['user_name'] ?? ($hasSession ? 'api' : 'system')),
            'ip' => (string)($sessionContext['remote_addr'] ?? 'local'),
            'operationId' => $operationUid,
        ];

        if (empty($sessionContext['user_name']) && !empty($sessionContext['token_id'])) {
            $context['tokenId'] = (string)$sessionContext['token_id'];
        }

        // Tells an admin-initiated disable apart from DISABLED_BY_LICENSE and
        // the crash-loop watchdog, which use the same REST action.
        if ($operation === ModuleOperations::OPERATION_DISABLE && !empty($params['reason'])) {
            $context['reason'] = (string)$params['reason'];
        }

        // Encode as JSON to prevent log injection via crafted user names
        // (e.g. "admin, ip=1.2.3.4" forging fields in the audit string).
        $encoded = json_encode($context, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
        if (!is_string($encoded)) {
            $encoded = '{}';
        }

        // LOG_WARNING, not LOG_NOTICE: the logger threshold is core.logsLevel
        // (4 by default), and anything less severe never reaches system/messages.
        SystemMessages::sysLogMsg(__CLASS__, 'Module operation started: ' . $encoded, LOG_WARNING);
    }

    /**
     * Emergency switch: '1' routes install/update/uninstall back to the
     * legacy mutex-driven pipeline for one release cycle.
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
