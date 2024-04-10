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

use MikoPBX\PBXCoreREST\Lib\Modules\DisableModuleAction;
use MikoPBX\PBXCoreREST\Lib\Modules\EnableModuleAction;
use MikoPBX\PBXCoreREST\Lib\Modules\GetAvailableModulesAction;
use MikoPBX\PBXCoreREST\Lib\Modules\GetMetadataFromModulePackageAction;
use MikoPBX\PBXCoreREST\Lib\Modules\GetModuleInfoAction;
use MikoPBX\PBXCoreREST\Lib\Modules\GetModuleLinkAction;
use MikoPBX\PBXCoreREST\Lib\Modules\InstallFromPackageAction;
use MikoPBX\PBXCoreREST\Lib\Modules\DownloadStatusAction;
use MikoPBX\PBXCoreREST\Lib\Modules\InstallFromRepoAction;
use MikoPBX\PBXCoreREST\Lib\Modules\StartDownloadAction;
use MikoPBX\PBXCoreREST\Lib\Modules\StatusOfModuleInstallationAction;
use MikoPBX\PBXCoreREST\Lib\Modules\UninstallModuleAction;
use MikoPBX\PBXCoreREST\Lib\Modules\UpdateAllAction;
use Phalcon\Di;
use Phalcon\Di\Injectable;

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
                case 'moduleStartDownload':
                    $module = $request['data']['uniqid'];
                    $url = $request['data']['url'];
                    $md5 = $request['data']['md5'];
                    $res = StartDownloadAction::main($module, $url, $md5);
                    break;
                case 'moduleDownloadStatus':
                    $module = $request['data']['uniqid'];
                    $res = DownloadStatusAction::main($module);
                    break;
                case 'installFromPackage':
                    $filePath = $data['filePath'];
                    $fileId = $data['fileId'];
                    $asyncChannelId = $request['asyncChannelId'];
                    $installer = new InstallFromPackageAction($asyncChannelId, $filePath, $fileId);
                    $installer->start();
                    $res->success = true;
                    break;
                case 'getMetadataFromModulePackage':
                    $filePath = $data['filePath'];
                    $res = GetMetadataFromModulePackageAction::main($filePath);
                    break;
                case 'installFromRepo':
                    $asyncChannelId = $request['asyncChannelId'];
                    $moduleUniqueID = $data['uniqid'];
                    $releaseId = intval($data['releaseId']??0);
                    $installer = new InstallFromRepoAction($asyncChannelId, $moduleUniqueID, $releaseId);
                    $installer->start();
                    $res->success = true;
                    break;
                case 'updateAll':
                    $asyncChannelId = $request['asyncChannelId'];
                    $modulesForUpdate = $data['modulesForUpdate'];
                    UpdateAllAction::main($asyncChannelId, $modulesForUpdate);
                    $res->success = true;
                    break;
                case 'getModuleInfo':
                    $moduleUniqueID = $data['uniqid'];
                    $res = GetModuleInfoAction::main($moduleUniqueID);
                    break;
                case 'statusOfModuleInstallation':
                    $filePath = $data['filePath'];
                    $res = StatusOfModuleInstallationAction::main($filePath);
                    break;
                case 'enableModule':
                    $moduleUniqueID = $data['uniqid'];
                    $res = EnableModuleAction::main($moduleUniqueID);
                    break;
                case 'disableModule':
                    $moduleUniqueID = $data['uniqid'];
                    $reason = $data['reason']??'';
                    $reasonText = $data['reasonText']??'';
                    $res = DisableModuleAction::main($moduleUniqueID, $reason, $reasonText);
                    break;
                case 'uninstallModule':
                    $moduleUniqueID = $data['uniqid'];
                    $keepSettings = $data['keepSettings'] === 'true';
                    $res = UninstallModuleAction::main($moduleUniqueID, $keepSettings);
                    break;
                case 'getAvailableModules':
                    $res = GetAvailableModulesAction::main();
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
}