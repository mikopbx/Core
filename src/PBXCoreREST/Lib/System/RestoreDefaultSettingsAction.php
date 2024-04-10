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

namespace MikoPBX\PBXCoreREST\Lib\System;

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
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Models\Users;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\System\PBX;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 * Returns MikoPBX into default settings stage without any extensions, providers, cdr and sound files
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class RestoreDefaultSettingsAction extends \Phalcon\Di\Injectable
{
    /**
     * Restore default system settings.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
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
        self::cleaningSoundFiles($res);
        self::cleaningBackups();

        // Delete PbxExtensions modules
        $records = PbxExtensionModules::find();
        foreach ($records as $record) {
            $moduleDir = PbxExtensionUtils::getModuleDir($record->uniqid);
            Processes::mwExec("{$rm} -rf {$moduleDir}");
            if ( ! $record->delete()) {
                $res->messages[] = $record->getMessages();
                $res->success    = false;
            }
        }

        // Reset PBXSettings
        $defaultValues = PbxSettings::getDefaultArrayValues();
        $fixedKeys = [
            PbxSettingsConstants::PBX_NAME,
            PbxSettingsConstants::PBX_DESCRIPTION,
            PbxSettingsConstants::SSH_PASSWORD,
            PbxSettingsConstants::SSH_RSA_KEY,
            PbxSettingsConstants::SSH_DSS_KEY,
            PbxSettingsConstants::SSH_AUTHORIZED_KEYS,
            PbxSettingsConstants::SSH_ECDSA_KEY,
            PbxSettingsConstants::SSH_LANGUAGE,
            PbxSettingsConstants::WEB_HTTPS_PUBLIC_KEY,
            PbxSettingsConstants::WEB_HTTPS_PRIVATE_KEY,
            PbxSettingsConstants::REDIRECT_TO_HTTPS,
            PbxSettingsConstants::PBX_LANGUAGE,
            PbxSettingsConstants::PBX_VERSION,
            PbxSettingsConstants::WEB_ADMIN_LOGIN,
            PbxSettingsConstants::WEB_ADMIN_PASSWORD,
            PbxSettingsConstants::WEB_ADMIN_LANGUAGE,
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

        // Recreate parking slots
        self::createParkingSlots();

        // Restart PBX
        $pbxConsole = Util::which('pbx-console');
        shell_exec("$pbxConsole services restart-all");
        PBX::coreRestart();

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
                    '000063',   // Reads back the extension
                    '000064',   // 0000MILLI
                    '10003246', // Echo test
                    IncomingRoutingTable::ACTION_HANGUP,   // System Extension
                    IncomingRoutingTable::ACTION_BUSY,     // System Extension
                    IncomingRoutingTable::ACTION_DID, // System Extension
                    IncomingRoutingTable::ACTION_VOICEMAIL,// System Extension
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
    public static function cleaningSoundFiles(&$res):void
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
     * Deletes main database (CF) backups
     * @return void
     */
    public static function cleaningBackups():void
    {
        $di = Di::getDefault();
        $dir = $di->getShared('config')->path('core.mediaMountPoint').'/mikopbx/backup';
        if(file_exists($dir)){
            $chAttr     = Util::which('chattr');
            Processes::mwExec("$chAttr -i -R $dir");
            $rm     = Util::which('rm');
            Processes::mwExec("$rm -rf $dir/*");
        }
    }

    /**
     * Create parking extensions.
     *
     * @return void
     */
    public static function createParkingSlots()
    {
        // Delete all parking slots
        $currentSlots = Extensions::findByType(Extensions::TYPE_PARKING);
        foreach ($currentSlots as $currentSlot) {
            if (!$currentSlot->delete()) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    'Can not delete extenison ' . $currentSlot->number . ' from \MikoPBX\Common\Models\Extensions ' . implode($currentSlot->getMessages()),
                    LOG_ERR
                );
            }
        }

        $startSlot = intval(PbxSettings::getValueByKey(PbxSettingsConstants::PBX_CALL_PARKING_START_SLOT));
        $endSlot = intval(PbxSettings::getValueByKey(PbxSettingsConstants::PBX_CALL_PARKING_END_SLOT));
        $reservedSlot = intval(PbxSettings::getValueByKey(PbxSettingsConstants::PBX_CALL_PARKING_EXT));

        // Create an array of new numbers
        $numbers = range($startSlot, $endSlot);
        $numbers[] = $reservedSlot;
        foreach ($numbers as $number) {
            $record = new Extensions();
            $record->type = Extensions::TYPE_PARKING;
            $record->number = $number;
            $record->show_in_phonebook = '0';
            if (!$record->create()) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    'Can not create extenison ' . $record->number . ' from \MikoPBX\Common\Models\Extensions ' . implode($record->getMessages()),
                    LOG_ERR
                );
            }
        }
    }

}