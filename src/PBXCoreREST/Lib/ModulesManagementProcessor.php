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

use MikoPBX\PBXCoreREST\Lib\Modules\DisableModule;
use MikoPBX\PBXCoreREST\Lib\Modules\EnableModule;
use MikoPBX\PBXCoreREST\Lib\Modules\GetAvailableModules;
use MikoPBX\PBXCoreREST\Lib\Modules\GetMetadataFromModulePackage;
use MikoPBX\PBXCoreREST\Lib\Modules\GetModuleInfo;
use MikoPBX\PBXCoreREST\Lib\Modules\GetModuleLink;
use MikoPBX\PBXCoreREST\Lib\Modules\InstallFromPackage;
use MikoPBX\PBXCoreREST\Lib\Modules\DownloadStatus;
use MikoPBX\PBXCoreREST\Lib\Modules\InstallFromRepo;
use MikoPBX\PBXCoreREST\Lib\Modules\StartDownload;
use MikoPBX\PBXCoreREST\Lib\Modules\StatusOfModuleInstallation;
use MikoPBX\PBXCoreREST\Lib\Modules\UninstallModule;
use MikoPBX\PBXCoreREST\Lib\Modules\UpdateAll;
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
                    $res = StartDownload::main($module, $url, $md5);
                    break;
                case 'moduleDownloadStatus':
                    $module = $request['data']['uniqid'];
                    $res = DownloadStatus::main($module);
                    break;
                case 'installFromPackage':
                    $filePath = $data['filePath'];
                    $fileId = $data['fileId'];
                    $asyncChannelId = $request['asyncChannelId'];
                    $installer = new InstallFromPackage($asyncChannelId, $filePath, $fileId);
                    $installer->start();
                    $res->success = true;
                    break;
                case 'getMetadataFromModulePackage':
                    $filePath = $data['filePath'];
                    $res = GetMetadataFromModulePackage::main($filePath);
                    break;
                case 'installFromRepo':
                    $asyncChannelId = $request['asyncChannelId'];
                    $moduleUniqueID = $data['uniqid'];
                    $releaseId = intval($data['releaseId'])??0;
                    $installer = new InstallFromRepo($asyncChannelId, $moduleUniqueID, $releaseId);
                    $installer->start();
                    $res->success = true;
                    break;
                case 'updateAll':
                    UpdateAll::main();
                    $res->success = true;
                    break;
                case 'getModuleInfo':
                    $moduleUniqueID = $data['uniqid'];
                    $res = GetModuleInfo::main($moduleUniqueID);
                    break;
                case 'statusOfModuleInstallation':
                    $filePath = $data['filePath'];
                    $res = StatusOfModuleInstallation::main($filePath);
                    break;
                case 'enableModule':
                    $moduleUniqueID = $data['uniqid'];
                    $res = EnableModule::main($moduleUniqueID);
                    break;
                case 'disableModule':
                    $moduleUniqueID = $data['uniqid'];
                    $reason = $data['reason']??'';
                    $reasonText = $data['reasonText']??'';
                    $res = DisableModule::main($moduleUniqueID, $reason, $reasonText);
                    break;
                case 'uninstallModule':
                    $moduleUniqueID = $data['uniqid'];
                    $keepSettings = $data['keepSettings'] === 'true';
                    $res = UninstallModule::main($moduleUniqueID, $keepSettings);
                    break;
                case 'getAvailableModules':
                    $res = GetAvailableModules::main();
                    break;
                case 'getModuleLink':
                    $moduleReleaseId = $data['releaseId'];
                    $res = GetModuleLink::main($moduleReleaseId);
                    break;
                default:
                    $res->messages['error'][] = "Unknown action - $action in ".__CLASS__;
            }
        $res->function = $action;

        return $res;
    }
}