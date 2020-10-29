<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

namespace MikoPBX\PBXCoreREST\Lib;


use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\CallDetailRecords;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\IncomingRoutingTable;
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
use MikoPBX\Modules\Setup\PbxExtensionSetupFailure;
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
            case 'getDate':
                $res->success           = true;
                $res->data['timestamp'] = time();
                break;
            case 'setDate':
                $res->success = System::setDate($data['timestamp'], $data['userTimeZone']);
                break;
            case 'updateCoreLanguage':
                self::updateCoreLanguageAction();
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
            case 'unBanIp':
                $res = FirewallManagementProcessor::fail2banUnbanAll($data['ip']);
                break;
            case 'getBanIp':
                $res = FirewallManagementProcessor::getBanIp();
                break;
            case 'upgrade':
                $res = SystemManagementProcessor::upgradeFromImg($data['temp_filename']);
                break;
            case 'installNewModule':
                $filePath = $request['data']['filePath'];
                $res      = SystemManagementProcessor::installModuleFromFile($filePath);
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
                $res            = self::uninstallModule($moduleUniqueID, $keepSettings);
                break;
            case 'restoreDefault':
                $res = self::restoreDefaultSettings();
                break;
            case 'convertAudioFile':
                $mvPath = Util::which('mv');
                Util::mwExec("{$mvPath} {$request['data']['temp_filename']} {$request['data']['filename']}");
                $res = self::convertAudioFile($request['data']['filename']);
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
        $di = DI::getDefault();
        if ($di===null){
            $res->messages[]='Error on DI initialize';
            return $res;
        }

        $res->success                    = true;
        $res->data['needRestartWorkers'] = true;
        $rm                              = Util::which('rm');

        // Pre delete some types
        $clearThisModels=[
            [Providers::class=>''],
            [OutgoingRoutingTable::class=>''],
            [IncomingRoutingTable::class=>''],
            [OutWorkTimes::class=>''],
            [AsteriskManagerUsers::class=>''],
            [Extensions::class=>'type="'.Extensions::TYPE_IVR_MENU.'"'],  // IVR Menu
            [Extensions::class=>'type="'.Extensions::TYPE_CONFERENCE.'"'],  // CONFERENCE
            [Extensions::class=>'type="'.Extensions::TYPE_QUEUE.'"'],  // QUEUE
        ];

        foreach ($clearThisModels as [$class_name, $parameters]){
            $records =  call_user_func([$class_name, 'find'], $parameters);
            if ( ! $records->delete()) {
                $res->messages[] = $records->getMessages();
                $res->success    = false;
            }
        }

        // Other extensions
        $parameters     = [
            'conditions' => 'not number IN ({ids:array})',
            'bind'       => [
                'ids' => [
                    '000063', // Reads back the extension
                    '000064', // 0000MILLI
                    '10003246',// Echo test
                    '10000100' // Voicemail
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

        // Delete CallRecords
        $records = CallDetailRecords::find();
        if ( ! $records->delete()) {
            $res->messages[] = $records->getMessages();
            $res->success    = false;
        }

        // Delete CallRecords sound files
        $callRecordsPath  = $di->getShared('config')->path('asterisk.monitordir');
        if (stripos($callRecordsPath, '/storage/usbdisk1/mikopbx') !== false) {
             Util::mwExec("{$rm} -rf {$callRecordsPath}/*");
        }

        return $res;
    }

    /**
     * Install new additional extension module
     *
     * @param $filePath
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     *
     */
    public static function installModuleFromFile($filePath): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $moduleMetadata = FilesManagementProcessor::getMetadataFromModuleFile($filePath);
        if ( ! $moduleMetadata->success) {
            return $moduleMetadata;
        } else {
            $moduleUniqueID = $moduleMetadata->data['uniqid'];
            $res            = self::installModule($filePath, $moduleUniqueID);
        }

        return $res;
    }

    /**
     * Install module from file
     *
     * @param string $filePath
     *
     * @param string $moduleUniqueID
     *
     * @return PBXApiResult
     */
    public static function installModule(string $filePath, string $moduleUniqueID): PBXApiResult
    {
        $res              = new PBXApiResult();
        $res->processor   = __METHOD__;
        $res->success     = true;
        $currentModuleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
        $needBackup       = is_dir($currentModuleDir);

        if ($needBackup) {
            self::uninstallModule($moduleUniqueID, true);
        }

        $semZaPath = Util::which('7za');
        Util::mwExec("{$semZaPath} e -spf -aoa -o{$currentModuleDir} {$filePath}");
        Util::addRegularWWWRights($currentModuleDir);

        $pbxExtensionSetupClass = "\\Modules\\{$moduleUniqueID}\\Setup\\PbxExtensionSetup";
        if (class_exists($pbxExtensionSetupClass)
            && method_exists($pbxExtensionSetupClass, 'installModule')) {
            $setup = new $pbxExtensionSetupClass($moduleUniqueID);
            if ( ! $setup->installModule()) {
                $res->success    = false;
                $res->messages[] = $setup->getMessages();
            }
        } else {
            $res->success    = false;
            $res->messages[] = "Install error: the class {$pbxExtensionSetupClass} not exists";
        }

        if ($res->success) {
            $res->data['needRestartWorkers'] = true;
        }

        return $res;
    }

    /**
     * Uninstall module
     *
     * @param string $moduleUniqueID
     *
     * @param bool   $keepSettings
     *
     * @return PBXApiResult
     */
    public static function uninstallModule(string $moduleUniqueID, bool $keepSettings): PBXApiResult
    {
        $res              = new PBXApiResult();
        $res->processor   = __METHOD__;
        $currentModuleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
        // Kill all module processes
        if (is_dir("{$currentModuleDir}/bin")) {
            $busyboxPath = Util::which('busybox');
            $killPath    = Util::which('kill');
            $lsofPath    = Util::which('lsof');
            $grepPath    = Util::which('grep');
            $awkPath     = Util::which('awk');
            $uniqPath    = Util::which('uniq');
            Util::mwExec(
                "{$busyboxPath} {$killPath} -9 $({$lsofPath} {$currentModuleDir}/bin/* |  {$busyboxPath} {$grepPath} -v COMMAND | {$busyboxPath} {$awkPath}  '{ print $2}' | {$busyboxPath} {$uniqPath})"
            );
        }
        // Uninstall module with keep settings and backup db
        $moduleClass = "\\Modules\\{$moduleUniqueID}\\Setup\\PbxExtensionSetup";

        try {
            if (class_exists($moduleClass)
                && method_exists($moduleClass, 'uninstallModule')) {
                $setup = new $moduleClass($moduleUniqueID);
            } else {
                // Заглушка которая позволяет удалить модуль из базы данных, которого нет на диске
                $moduleClass = PbxExtensionSetupFailure::class;
                $setup       = new $moduleClass($moduleUniqueID);
            }
            $setup->uninstallModule($keepSettings);
        } finally {
            if (is_dir($currentModuleDir)) {
                // Broken or very old module. Force uninstall.
                $rmPath = Util::which('rm');
                Util::mwExec("{$rmPath} -rf {$currentModuleDir}");

                $moduleClass = PbxExtensionSetupFailure::class;
                $setup       = new $moduleClass($moduleUniqueID);
                $setup->unregisterModule();
            }
        }
        $res->success                    = true;
        $res->data['needRestartWorkers'] = true;

        return $res;
    }

    /**
     * Converts file to wav file with 8000 bitrate
     *
     * @param $filename
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public static function convertAudioFile($filename): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        if ( ! file_exists($filename)) {
            $res->success    = false;
            $res->messages[] = "File '{$filename}' not found.";

            return $res;
        }
        $out          = [];
        $tmp_filename = '/tmp/' . time() . "_" . basename($filename);
        if (false === copy($filename, $tmp_filename)) {
            $res->success    = false;
            $res->messages[] = "Unable to create temporary file '{$tmp_filename}'.";

            return $res;
        }

        // Принудительно устанавливаем расширение файла в wav.
        $n_filename     = Util::trimExtensionForFile($filename) . ".wav";
        $n_filename_mp3 = Util::trimExtensionForFile($filename) . ".mp3";
        // Конвертируем файл.
        $tmp_filename = escapeshellcmd($tmp_filename);
        $n_filename   = escapeshellcmd($n_filename);
        $soxPath      = Util::which('sox');
        Util::mwExec("{$soxPath} -v 0.99 -G '{$tmp_filename}' -c 1 -r 8000 -b 16 '{$n_filename}'", $out);
        $result_str = implode('', $out);

        $lamePath = Util::which('lame');
        Util::mwExec("{$lamePath} -b 32 --silent '{$n_filename}' '{$n_filename_mp3}'", $out);
        $result_mp3 = implode('', $out);

        // Чистим мусор.
        unlink($tmp_filename);
        if ($result_str !== '' && $result_mp3 !== '') {
            // Ошибка выполнения конвертации.
            $res->success    = false;
            $res->messages[] = $result_str;

            return $res;
        }

        if (file_exists($filename)
            && $filename !== $n_filename
            && $filename !== $n_filename_mp3) {
            unlink($filename);
        }

        $res->success = true;
        $res->data[]  = $n_filename_mp3;

        return $res;
    }

    /**
     * Changes core language
     */
    private static function updateCoreLanguageAction(): void
    {
        $di = Di::getDefault();
        $di->remove('messages');
        $di->remove('translation');
        $di->register(new MessagesProvider());
        $di->register(new TranslationProvider());
    }
}