<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\PBXCoreREST\Lib;


use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\IvrMenu;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Providers\MessagesProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\Asterisk\Configs\VoiceMailConf;
use MikoPBX\Core\System\Notifications;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionState;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Workers\WorkerMergeUploadedFile;
use Phalcon\Di;
use Phalcon\Di\Injectable;

class SystemManagementProcessor extends Injectable
{
    /**
     * Processes System requests
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     *
     * @throws \Exception
     */
    public static function callBack(array $request): PBXApiResult
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
            case 'getDate':
                $res->success           = true;
                $res->data['timestamp'] = time();
                break;
            case 'setDate':
                $res->success = System::setDate($data['timestamp'], $data['userTimeZone']);
                break;
            case 'updateCoreLanguage':
                $di = Di::getDefault();
                $di->remove('messages');
                $di->remove('translation');
                $di->register(new MessagesProvider());
                $di->register(new TranslationProvider());
                break;
            case 'updateMailSettings':
                // TODO:
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
                    $res->data                       = $moduleStateProcessor->getMessages();
                    $res->data['needRestartWorkers'] = true; //TODO:: Проверить надо ли это
                    $res->success                    = true;
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
                    $res->data                       = $moduleStateProcessor->getMessages();
                    $res->data['needRestartWorkers'] = true; //TODO:: Проверить надо ли это
                    $res->success                    = true;
                }
                break;
            case 'uninstallModule':
                $moduleUniqueID = $request['data']['uniqid'];
                $keepSettings   = $request['data']['keepSettings'] === 'true';
                $res            = FilesManagementProcessor::uninstallModule($moduleUniqueID, $keepSettings);
                break;
            case 'restoreDefault':
                $res = self::restoreDefaultSettings();
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

    /**
     * Deletes all settings and uploaded files
     */
    private static function restoreDefaultSettings(): PBXApiResult
    {
        $res                             = new PBXApiResult();
        $res->processor                  = __METHOD__;
        $res->success                    = true;
        $res->data['needRestartWorkers'] = true;
        $rm                              = Util::which('rm');

        // Delete all providers
        $records = Providers::find();
        if ( ! $records->delete()) {
            $res->messages[] = $records->getMessages();
            $res->success    = false;
        }

        // Delete routes
        $records = OutgoingRoutingTable::find();
        if ( ! $records->delete()) {
            $res->messages[] = $records->getMessages();
            $res->success    = false;
        }

        $records = IncomingRoutingTable::find();
        if ( ! $records->delete()) {
            $res->messages[] = $records->getMessages();
            $res->success    = false;
        }

        // Delete out of work settings
        $records = OutWorkTimes::find();
        if ( ! $records->delete()) {
            $res->messages[] = $records->getMessages();
            $res->success    = false;
        }

        // AMI Users
        $records = AsteriskManagerUsers::find();
        if ( ! $records->delete()) {
            $res->messages[] = $records->getMessages();
            $res->success    = false;
        }

        // Pre delete some extensions type
        // IVR Menu
        $records = Extensions::find('type="'.Extensions::TYPE_IVR_MENU.'"');
        $records->delete();

        // CONFERENCE
        $records = Extensions::find('type="'.Extensions::TYPE_CONFERENCE.'"');
        $records->delete();

        // QUEUE
        $records = Extensions::find('type="'.Extensions::TYPE_QUEUE.'"');
        $records->delete();


        // Other extensions
        $parameters     = [
            'conditions' => 'not number IN ({ids:array})',
            'bind'       => [
                'ids' => [
                    '000063', //Reads back the extension
                    '000064', //0000MILLI
                    '10003246'//Echo test
                ],
            ],
        ];
        $stopDeleting   = false;
        $countRecords   = Extensions::count($parameters);
        $deleteAttempts = 0;
        while ($stopDeleting === false) {
            $record = Extensions::findFirst($parameters);
            if ($record === null) {
                $stopDeleting = true;
                continue;
            }
            if ( ! $record->delete()) {
                $deleteAttempts += 1;
            }
            if ($deleteAttempts > $countRecords * 10) {
                $stopDeleting    = true; // Prevent loop
                $res->messages[] = $record->getMessages();
            }
        }

        // SoundFiles
        $parameters = [
            'conditions' => 'category = :custom:',
            'bind'       => [
                'custom' => SoundFiles::CATEGORY_CUSTOM,
            ],
        ];
        $records    = SoundFiles::find($parameters);

        foreach ($records as $record) {
            if (stripos($record->path, '/storage/usbdisk1/mikopbx') !== false) {
                Util::mwExec("{$rm} -rf {$record->path}");
                if ( ! $record->delete()) {
                    $res->messages[] = $record->getMessages();
                    $res->success    = false;
                }
            }
        }

        // PbxExtensions
        $records = PbxExtensionModules::find();
        foreach ($records as $record) {
            $moduleDir = PbxExtensionUtils::getModuleDir($record->uniqid);
            Util::mwExec("{$rm} -rf {$moduleDir}");
            if ( ! $record->delete()) {
                $res->messages[] = $record->getMessages();
                $res->success    = false;
            }
        }

        return $res;
    }

}