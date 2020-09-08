<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Lib;


use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\Configs\VoiceMailConf;
use MikoPBX\Core\System\Notifications;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionState;
use MikoPBX\PBXCoreREST\Workers\WorkerMergeUploadedFile;
use Phalcon\Di\Injectable;

class SystemManagementProcessor extends Injectable
{
    /**
     * Processes System requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function systemCallBack(array $request): PBXApiResult
    {
        $action         = $request['action'];
        $data           = $request['data'];
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'reboot':
                System::rebootSync();
                $res->success = true;
                break;
            case 'shutdown':
                System::shutdown();
                $res->success = true;
                break;
            case 'mergeUploadedFile':
                $phpPath              = Util::which('php');
                $workerDownloaderPath = Util::getFilePathByClassName(WorkerMergeUploadedFile::class);
                Util::mwExecBg("{$phpPath} -f {$workerDownloaderPath} '{$data['settings_file']}'");
                $res->success = true;
                break;
            case 'setDate':
                $res->success = System::setDate($data['date']);
                break;
            case 'updateMailSettings':
                // TODO
                $res->success = true;
                break;
            case 'sendMail':
                if (isset($data['email']) && isset($data['subject']) && isset($data['body'])) {
                    if (isset($data['encode']) && $data['encode'] === 'base64') {
                        $data['subject'] = base64_decode($data['subject']);
                        $data['body']    = base64_decode($data['body']);
                    }
                    $result = Notifications::sendMail($data['email'], $data['subject'], $data['body']);
                    if ($result === true) {
                        $res->success = true;
                    } else {
                        $res->success    = false;
                        $res->messages[] = $result;
                    }
                } else {
                    $res->success    = false;
                    $res->messages[] = 'Not all query parameters are set';
                }
                break;
            case 'fileReadContent':
                $res = FilesManagementProcessor::fileReadContent($data['filename'], $data['needOriginal']);
                break;
            case 'reloadMsmtp':
                $notifications = new Notifications();
                $notifications->configure();
                $voiceMailConfig = new VoiceMailConf();
                $voiceMailConfig->generateConfig();
                $asteriskPath = Util::which('asterisk');
                Util::mwExec("{$asteriskPath} -rx 'voicemail reload'");
                $res->success = true;
                break;
            case 'unBanIp':
                $res = FirewallManagementProcessor::fail2banUnbanAll($data['ip']);
                break;
            case 'getBanIp':
                $res = FirewallManagementProcessor::getBanIp();
                break;
            case 'downloadNewFirmware':
                $res = FilesManagementProcessor::downloadNewFirmware($request['data']);
                break;
            case 'firmwareDownloadStatus':
                $res = FilesManagementProcessor::firmwareDownloadStatus();
                break;
            case 'upgrade':
                $res = SystemManagementProcessor::upgradeFromImg($data['temp_filename']);
                break;
            case 'removeAudioFile':
                $res = FilesManagementProcessor::removeAudioFile($data['filename']);
                break;
            case 'convertAudioFile':
                $mvPath = Util::which('mv');
                Util::mwExec("{$mvPath} {$data['temp_filename']} {$data['filename']}");
                $res = FilesManagementProcessor::convertAudioFile($data['filename']);
                break;
            case 'downloadNewModule':
                $module = $request['data']['uniqid'];
                $url    = $request['data']['url'];
                $md5    = $request['data']['md5'];
                $res    = FilesManagementProcessor::moduleStartDownload($module, $url, $md5);
                break;
            case 'moduleDownloadStatus':
                $module = $request['data']['uniqid'];
                $res    = FilesManagementProcessor::moduleDownloadStatus($module);
                break;
            case 'installNewModule':
                $filePath = $request['data']['filePath'];
                $res      = FilesManagementProcessor::installModuleFromFile($filePath);
                break;
            case 'enableModule':
                $moduleUniqueID       = $request['data']['uniqid'];
                $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
                if ($moduleStateProcessor->enableModule() === false) {
                    $res->success  = false;
                    $res->messages = $moduleStateProcessor->getMessages();
                } else {
                    PBXConfModulesProvider::recreateModulesProvider();
                    $res->data['needReloadModules'] = true;
                    $res->success                   = true;
                }
                break;
            case 'disableModule':
                $moduleUniqueID       = $request['data']['uniqid'];
                $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
                if ($moduleStateProcessor->disableModule() === false) {
                    $res->success  = false;
                    $res->messages = $moduleStateProcessor->getMessages();
                } else {
                    PBXConfModulesProvider::recreateModulesProvider();
                    $res->data['needReloadModules'] = true;
                    $res->success                   = true;
                }
                break;
            case 'uninstallModule':
                $moduleUniqueID = $request['data']['uniqid'];
                $keepSettings   = $request['data']['keepSettings'] === 'true';
                $res            = FilesManagementProcessor::uninstallModule($moduleUniqueID, $keepSettings);
                break;
            default:
                $res             = new PBXApiResult();
                $res->processor  = __METHOD__;
                $res->messages[] = "Unknown action - {$action} in systemCallBack";
        }

        $res->function = $action;

        return $res;
    }

    /**
     * Upgrade MikoPBX from uploaded IMG file
     *
     * @param string $tempFilename path to uploaded image
     *
     * @return PBXApiResult
     */
    public static function upgradeFromImg(string $tempFilename): PBXApiResult
    {
        $res                  = new PBXApiResult();
        $res->processor       = __METHOD__;
        $res->success         = true;
        $res->data['message'] = 'In progress...';


        if ( ! file_exists($tempFilename)) {
            $res->success    = false;
            $res->messages[] = "Update file '{$tempFilename}' not found.";

            return $res;
        }

        if ( ! file_exists('/var/etc/cfdevice')) {
            $res->success    = false;
            $res->messages[] = "The system is not installed";

            return $res;
        }
        $dev = trim(file_get_contents('/var/etc/cfdevice'));

        $link = '/tmp/firmware_update.img';
        Util::createUpdateSymlink($tempFilename, $link);
        $mikopbx_firmwarePath = Util::which('mikopbx_firmware');
        Util::mwExecBg("{$mikopbx_firmwarePath} recover_upgrade {$link} /dev/{$dev}");

        return $res;
    }

}