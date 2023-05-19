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

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Common\Models\ExtensionForwardingRights;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\IvrMenu;
use MikoPBX\Common\Models\IvrMenuActions;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Models\Users;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\System\Notifications;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionState;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\Modules\Setup\PbxExtensionSetupFailure;
use MikoPBX\PBXCoreREST\Workers\WorkerModuleInstaller;
use Phalcon\Di;
use Phalcon\Di\Injectable;


/**
 * Class SystemManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class SystemManagementProcessor extends Injectable
{
    /**
     * Processes System requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
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
            case 'updateMailSettings':
                $notifier     = new Notifications();
                $res->success = $notifier->sendTestMail();
                break;
            case 'sendMail':
                $res = self::sendMail($data);
                break;
            case 'unBanIp':
                $res = FirewallManagementProcessor::fail2banUnbanAll($data['ip']);
                break;
            case 'getBanIp':
                $res = FirewallManagementProcessor::getBanIp();
                break;
            case 'upgrade':
                $res = self::upgradeFromImg($data['temp_filename']);
                break;
            case 'installNewModule':
                $filePath = $request['data']['filePath'];
                $res      = self::installModule($filePath);
                break;
            case 'statusOfModuleInstallation':
                $filePath = $request['data']['filePath'];
                $res      = self::statusOfModuleInstallation($filePath);
                break;
            case 'enableModule':
                $moduleUniqueID = $request['data']['uniqid'];
                $res            = self::enableModule($moduleUniqueID);
                break;
            case 'disableModule':
                $moduleUniqueID = $request['data']['uniqid'];
                $res            = self::disableModule($moduleUniqueID);
                break;
            case 'uninstallModule':
                $moduleUniqueID = $request['data']['uniqid'];
                $keepSettings   = $request['data']['keepSettings'] === 'true';
                $res            = self::uninstallModule($moduleUniqueID, $keepSettings);
                break;
            case 'restoreDefault':
                $ch = 0;
                do{
                    $ch++;
                    $res = self::restoreDefaultSettings();
                    sleep(1);
                }while($ch <= 10 && !$res->success);
                break;
            case 'convertAudioFile':
                $mvPath = Util::which('mv');
                Processes::mwExec("{$mvPath} {$request['data']['temp_filename']} {$request['data']['filename']}");
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
     * Sends an email notification.
     *
     * @param array $data The data containing email, subject, and body.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private static function sendMail(array $data): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        if (isset($data['email']) && isset($data['subject']) && isset($data['body'])) {
            if (isset($data['encode']) && $data['encode'] === 'base64') {
                $data['subject'] = base64_decode($data['subject']);
                $data['body']    = base64_decode($data['body']);
            }
            $notifier = new Notifications();
            $result   = $notifier->sendMail($data['email'], $data['subject'], $data['body']);
            if ($result === true) {
                $res->success = true;
            } else {
                $res->success    = false;
                $res->messages[] = 'Notifications::sendMail method returned false';
            }
        } else {
            $res->success    = false;
            $res->messages[] = 'Not all query parameters were set';
        }

        return $res;
    }

    /**
     * Upgrade the system from an image file.
     *
     * @param string $tempFilename The path to the temporary image file.
     *
     * @return PBXApiResult An object containing the result of the API call.
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
        $dev     = trim(file_get_contents('/var/etc/cfdevice'));
        $storage = new Storage();

        // Generate update script
        $cmd = '/bin/busybox grep "$(/bin/busybox  cat /var/etc/storage_device) " < /etc/fstab | /bin/busybox awk -F"[= ]" "{ print \$2}"';
        $storage_uuid = trim(shell_exec($cmd));
        $cf_uuid      = $storage->getUuid("{$dev}3");
        $data = "#!/bin/sh".PHP_EOL.
                'rm -rf "$0";'.PHP_EOL.
                "export storage_uuid='$storage_uuid';".PHP_EOL.
                "export cf_uuid='$cf_uuid';".PHP_EOL.
                "export updateFile='$tempFilename';".PHP_EOL;

        // Mount boot partition
        $cmd = '/bin/lsblk -o UUID,PKNAME -p | /bin/busybox grep "'.$cf_uuid.'" | /bin/busybox cut -f 2 -d " "';
        $bootDisc = trim(shell_exec($cmd));

        $systemDir = '/system';
        Util::mwMkdir($systemDir);
        $result = Util::mwExec("mount {$bootDisc}1 $systemDir");
        if($result === 0){
            file_put_contents("$systemDir/update.sh", $data);
            // Reboot the system
            System::rebootSyncBg();
        }else{
            $res->success    = false;
            $res->messages[] = "Fail mount boot device...";
        }

        return $res;
    }

    /**
     * Install a new additional extension module.
     *
     * @param string $filePath The path to the module file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function installModule($filePath): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $resModuleMetadata = FilesManagementProcessor::getMetadataFromModuleFile($filePath);
        if ( ! $resModuleMetadata->success) {
            return $resModuleMetadata;
        }

        $moduleUniqueID = $resModuleMetadata->data['uniqid'];
        // Disable the module if it's enabled
        if (PbxExtensionUtils::isEnabled($moduleUniqueID)){
            $res = self::disableModule($moduleUniqueID);
            if (!$res->success){
                return $res;
            }
        }

        $currentModuleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
        $needBackup       = is_dir($currentModuleDir);

        if ($needBackup) {
            self::uninstallModule($moduleUniqueID, true);
        }

        // Start the background process to install the module
        $temp_dir            = dirname($filePath);

        // Create a progress file to track the installation progress
        file_put_contents( $temp_dir . '/installation_progress', '0');

        // Create an error file to store any installation errors
        file_put_contents( $temp_dir . '/installation_error', '');

        $install_settings = [
            'filePath' => $filePath,
            'currentModuleDir' => $currentModuleDir,
            'uniqid' => $moduleUniqueID,
        ];

        // Save the installation settings to a JSON file
        $settings_file  = "{$temp_dir}/install_settings.json";
        file_put_contents(
            $settings_file,
            json_encode($install_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
        );
        $phpPath               = Util::which('php');
        $workerFilesMergerPath = Util::getFilePathByClassName(WorkerModuleInstaller::class);

        // Execute the background process to install the module
        Processes::mwExecBg("{$phpPath} -f {$workerFilesMergerPath} start '{$settings_file}'");
        $res->data['filePath']= $filePath;
        $res->success = true;

        return $res;
    }


    /**
     * Uninstall a module.
     *
     * @param string $moduleUniqueID The unique ID of the module to uninstall.
     * @param bool   $keepSettings   Indicates whether to keep the module settings.
     *
     * @return PBXApiResult An object containing the result of the API call.
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

            // Execute the command to kill all processes related to the module
            Processes::mwExec(
                "{$busyboxPath} {$killPath} -9 $({$lsofPath} {$currentModuleDir}/bin/* |  {$busyboxPath} {$grepPath} -v COMMAND | {$busyboxPath} {$awkPath}  '{ print $2}' | {$busyboxPath} {$uniqPath})"
            );
        }

        // Uninstall module with keep settings and backup db
        $moduleClass = "\\Modules\\{$moduleUniqueID}\\Setup\\PbxExtensionSetup";

        try {
            if (class_exists($moduleClass)
                && method_exists($moduleClass, 'uninstallModule')) {
                // Instantiate the module setup class and call the uninstallModule method
                $setup = new $moduleClass($moduleUniqueID);
            } else {

                // Use a fallback class to uninstall the module from the database if it doesn't exist on disk
                $moduleClass = PbxExtensionSetupFailure::class;
                $setup       = new $moduleClass($moduleUniqueID);
            }
            $setup->uninstallModule($keepSettings);
        } finally {
            if (is_dir($currentModuleDir)) {
                // If the module directory still exists, force uninstallation
                $rmPath = Util::which('rm');

                // Remove the module directory recursively
                Processes::mwExec("{$rmPath} -rf {$currentModuleDir}");

                // Use the fallback class to unregister the module from the database
                $moduleClass = PbxExtensionSetupFailure::class;
                $setup       = new $moduleClass($moduleUniqueID);
                $setup->unregisterModule();
            }
        }
        $res->success = true;

        return $res;
    }

    /**
     * Enables extension module
     *
     * @param string $moduleUniqueID
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private static function enableModule(string $moduleUniqueID): PBXApiResult
    {
        $res                  = new PBXApiResult();
        $res->processor       = __METHOD__;
        $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
        if ($moduleStateProcessor->enableModule() === false) {
            $res->success  = false;
            $res->messages = $moduleStateProcessor->getMessages();
        } else {
            PBXConfModulesProvider::recreateModulesProvider();
            $res->data    = $moduleStateProcessor->getMessages();
            $res->success = true;
        }

        return $res;
    }

    /**
     * Disables extension module
     *
     * @param string $moduleUniqueID
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    private static function disableModule(string $moduleUniqueID): PBXApiResult
    {
        $res                  = new PBXApiResult();
        $res->processor       = __METHOD__;
        $moduleStateProcessor = new PbxExtensionState($moduleUniqueID);
        if ($moduleStateProcessor->disableModule() === false) {
            $res->success  = false;
            $res->messages = $moduleStateProcessor->getMessages();
        } else {
            PBXConfModulesProvider::recreateModulesProvider();
            $res->data    = $moduleStateProcessor->getMessages();
            $res->success = true;
        }

        return $res;
    }

    /**
     * Perform pre-cleaning operations on specific columns of certain models.
     *
     * @param PBXApiResult $res The result object to store any error messages.
     *
     * @return void
     */
    public static function preCleaning(PBXApiResult &$res):void
    {
        $preCleaning = [
            CallQueues::class => [
                'redirect_to_extension_if_empty',
                'redirect_to_extension_if_unanswered',
                'redirect_to_extension_if_repeat_exceeded'
            ],
            IvrMenu::class => [
                'timeout_extension'
            ]
        ];
        foreach ($preCleaning as $class => $columns) {
            $records = call_user_func([$class, 'find']);
            foreach ($records as $record){
                foreach ($columns as $column){
                    $record->$column = '';
                }
                if ( ! $record->save()) {
                    $res->messages[] = $record->getMessages();
                    $res->success    = false;
                }
            }
        }
    }

    /**
     * Perform cleaning operations on main tables.
     *
     * @param PBXApiResult $res The result object to store any error messages.
     *
     * @return void
     */
    public static function cleaningMainTables(&$res):void
    {
        // Define the models and conditions for cleaning
        $clearThisModels = [
            [ExtensionForwardingRights::class => ''],
            [OutWorkTimes::class => ''],
            [IvrMenuActions::class => ''],
            [CallQueueMembers::class => ''],
            [OutgoingRoutingTable::class => ''],
            [IncomingRoutingTable::class => 'id>1'],
            [Sip::class => ''], // All SIP providers
            [Iax::class => ''], // All IAX providers
            [AsteriskManagerUsers::class => ''],
            [Extensions::class => 'type="' . Extensions::TYPE_IVR_MENU . '"'],  // IVR Menu
            [Extensions::class => 'type="' . Extensions::TYPE_CONFERENCE . '"'],  // CONFERENCE
            [Extensions::class => 'type="' . Extensions::TYPE_QUEUE . '"'],  // QUEUE
            [Users::class => 'id>"1"'], // All except root with their extensions
            [CustomFiles::class => ''],
            [NetworkFilters::class=>'permit!="0.0.0.0/0" AND deny!="0.0.0.0/0"'] //Delete all other rules
        ];

        // Iterate over each model and perform deletion based on conditions
        foreach ($clearThisModels as $modelParams) {
            foreach ($modelParams as $key => $value) {
                $records = call_user_func([$key, 'find'], $value);
                if (!$records->delete()) {
                    // If deletion fails, add error messages to the result object
                    $res->messages[] = $records->getMessages();
                    $res->success    = false;
                }
            }
        }
        // Allow all connections for 0.0.0.0/0 in firewall rules
        $firewallRules = FirewallRules::find();
        foreach ($firewallRules as $firewallRule){
            $firewallRule->action = 'allow';
            $firewallRule->save();
        }
    }

    /**
     * Perform cleaning operations on other extensions.
     *
     * @param PBXApiResult $res The result object to store any error messages.
     *
     * @return void
     */
    public static function cleaningOtherExtensions(&$res):void
    {
        // Define the parameters for querying the extensions to delete
        $parameters     = [
            'conditions' => 'not number IN ({ids:array})',
            'bind'       => [
                'ids' => [
                    '000063', // Reads back the extension
                    '000064', // 0000MILLI
                    '10003246',// Echo test
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
    }

    /**
     * Clean up custom sound files.
     *
     * @param PBXApiResult $res The result object to store any error messages.
     *
     * @return void
     */
    public static function cleanSoundFiles(&$res):void
    {
        $rm     = Util::which('rm');
        $parameters = [
            'conditions' => 'category = :custom:',
            'bind'       => [
                'custom' => SoundFiles::CATEGORY_CUSTOM,
            ],
        ];
        $records    = SoundFiles::find($parameters);
        foreach ($records as $record) {
            if (stripos($record->path, '/storage/usbdisk1/mikopbx') !== false) {
                Processes::mwExec("{$rm} -rf {$record->path}");
                if ( ! $record->delete()) {
                    $res->messages[] = $record->getMessages();
                    $res->success    = false;
                }
            }
        }
    }

    /**
     * Restore the default settings of the PBX.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function restoreDefaultSettings(): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = DI::getDefault();
        if ($di === null) {
            $res->messages[] = 'Error on DI initialize';
            return $res;
        }
        $rm     = Util::which('rm');
        $res->success = true;

        // Change incoming rule to default action
        IncomingRoutingTable::resetDefaultRoute();
        self::preCleaning($res);

        self::cleaningMainTables($res);
        self::cleaningOtherExtensions($res);
        self::cleanSoundFiles($res);

        // PbxExtensions
        $records = PbxExtensionModules::find();
        foreach ($records as $record) {
            $moduleDir = PbxExtensionUtils::getModuleDir($record->uniqid);
            Processes::mwExec("{$rm} -rf {$moduleDir}");
            if ( ! $record->delete()) {
                $res->messages[] = $record->getMessages();
                $res->success    = false;
            }
        }

        // Fill PBXSettingsByDefault
        $defaultValues = PbxSettings::getDefaultArrayValues();
        $fixedKeys = [
            'Name',
            'Description',
            'SSHPassword',
            'SSHRsaKey',
            'SSHDssKey',
            'SSHAuthorizedKeys',
            'SSHecdsaKey',
            'SSHLanguage',
            'WEBHTTPSPublicKey',
            'WEBHTTPSPrivateKey',
            'RedirectToHttps',
            'PBXLanguage',
            'PBXVersion',
            'WebAdminLogin',
            'WebAdminPassword',
            'WebAdminLanguage',
        ];
        foreach ($defaultValues as $key=>$defaultValue){
            if (in_array($key, $fixedKeys, true)){
                continue;
            }
            $record = PbxSettings::findFirstByKey($key);
            if ($record===null){
                $record = new PbxSettings();
                $record->key = $key;
            }
            $record->value = $defaultValue;
        }

        // Delete CallRecords from database
        $cdr = CdrDb::getPathToDB();
        Processes::mwExec("{$rm} -rf {$cdr}*");
        $dbUpdater = new UpdateDatabase();
        $dbUpdater->updateDatabaseStructure();

        // Delete CallRecords sound files
        $callRecordsPath = $di->getShared('config')->path('asterisk.monitordir');
        if (stripos($callRecordsPath, '/storage/usbdisk1/mikopbx') !== false) {
            Processes::mwExec("{$rm} -rf {$callRecordsPath}/*");
        }

        $pbxConsole = Util::which('pbx-console');
        shell_exec("$pbxConsole services restart-all");
        return $res;
    }

    /**
     * Convert an audio file to different formats.
     *
     * @param string $filename The path of the audio file to be converted.
     * @return PBXApiResult An object containing the result of the API call.
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

        // Change extension to wav
        $trimmedFileName = Util::trimExtensionForFile($filename);
        $n_filename     = $trimmedFileName . ".wav";
        $n_filename_mp3 = $trimmedFileName . ".mp3";

        // Convert file to wav format
        $tmp_filename = escapeshellcmd($tmp_filename);
        $n_filename   = escapeshellcmd($n_filename);
        $soxPath      = Util::which('sox');
        Processes::mwExec("{$soxPath} -v 0.99 -G '{$tmp_filename}' -c 1 -r 8000 -b 16 '{$n_filename}'", $out);
        $result_str = implode('', $out);

        // Convert wav file to mp3 format
        $lamePath = Util::which('lame');
        Processes::mwExec("{$lamePath} -b 32 --silent '{$n_filename}' '{$n_filename_mp3}'", $out);
        $result_mp3 = implode('', $out);

        // Convert the file to various codecs using Asterisk
        $codecs = ['alaw', 'ulaw', 'gsm', 'g722', 'wav'];
        $rmPath       = Util::which('rm');
        $asteriskPath = Util::which('asterisk');
        foreach ($codecs as $codec){
            $result = shell_exec("$asteriskPath -rx 'file convert $tmp_filename $trimmedFileName.$codec'");
            if(strpos($result, 'Converted') !== 0){
                shell_exec("$rmPath -rf /root/test.{$codec}");
            }
        }

        // Remove temporary file
        unlink($tmp_filename);
        if ($result_str !== '' && $result_mp3 !== '') {
            // Conversion failed
            $res->success    = false;
            $res->messages[] = $result_str;

            return $res;
        }

        if (file_exists($filename)
            && $filename !== $n_filename
            && $filename !== $n_filename_mp3) {
            // Remove the original file if it's different from the converted files
            unlink($filename);
        }

        $res->success = true;
        $res->data[]  = $n_filename_mp3;

        return $res;
    }

    /**
     * Check the status of a module installation.
     *
     * @param string $filePath The path of the module installation file.
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function statusOfModuleInstallation(string $filePath): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = Di::getDefault();
        if ($di === null) {
            $res->messages[] = 'Dependency injector does not initialized';

            return $res;
        }
        $temp_dir            = dirname($filePath);
        $progress_file = $temp_dir . '/installation_progress';
        $error_file = $temp_dir . '/installation_error';
        if (!file_exists($error_file)|| !file_exists($progress_file)){
            $res->success                   = false;
            $res->data['i_status']          = 'PROGRESS_FILE_NOT_FOUND';
            $res->data['i_status_progress'] = '0';
        }
        elseif (file_get_contents($error_file)!=='') {
            $res->success                   = false;
            $res->data['i_status']          = 'INSTALLATION_ERROR';
            $res->data['i_status_progress'] = '0';
            $res->messages[]                = file_get_contents($error_file);
        } elseif ('100' === file_get_contents($progress_file)) {
            $res->success                   = true;
            $res->data['i_status_progress'] = '100';
            $res->data['i_status']          = 'INSTALLATION_COMPLETE';
        } else {
            $res->success                   = true;
            $res->data['i_status']          = 'INSTALLATION_IN_PROGRESS';
            $res->data['i_status_progress'] = file_get_contents($progress_file);
        }

        return $res;
    }
}