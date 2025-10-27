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

use MikoPBX\Common\Models\ApiKeys;
use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\AsteriskRestUsers;
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Common\Models\ExtensionForwardingRights;
use MikoPBX\Common\Models\Extensions;
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
use MikoPBX\Common\Models\UserPasskeys;
use MikoPBX\Common\Models\Users;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Configs\MonitConf;
use MikoPBX\Core\System\Configs\CronConf;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Services\TokenValidationService;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Returns MikoPBX into default settings stage without any extensions, providers, cdr and sound files
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class RestoreDefaultSettingsAction extends Injectable
{
    private static ?SystemMaintenanceEvents $eventPublisher = null;
    /**
     * Restore default system settings with optional async progress reporting
     *
     * @param string $asyncChannelId Optional channel ID for WebSocket events
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $asyncChannelId = ''): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $di             = DI::getDefault();
        if ($di === null) {
            $res->messages[] = 'Error on DI initialize';
            return $res;
        }
        
        // Initialize event publisher if channel ID provided
        if (!empty($asyncChannelId)) {
            self::$eventPublisher = new SystemMaintenanceEvents($asyncChannelId);
        }
        
        $rm     = Util::which('rm');
        
        // Stage: Prepare
        self::publishEvent(SystemMaintenanceEvents::DELETE_ALL_STAGE_PREPARE, [
            'messageKey' => 'gs_DeleteAllStageStarting',
            'progress' => 0
        ]);
        
        // Stop monit to prevent service restarts during cleanup
        self::stopMonit();

        // Change incoming rule to default action
        IncomingRoutingTable::resetDefaultRoute();

        // Stage: Clean database tables
        self::publishEvent(SystemMaintenanceEvents::DELETE_ALL_STAGE_CLEAN_TABLES, [
            'messageKey' => 'gs_DeleteAllStageCleaningTables',
            'progress' => 10
        ]);

        // STEP 1: Pre-cleaning - clear all foreign key references to sound files
        // This prevents RESTRICT violations when deleting SoundFiles later
        self::preCleaning($res);

        // STEP 2: Clean main tables (CallQueues, IvrMenu, OutWorkTimes, IncomingRoutingTable, etc.)
        self::cleaningMainTables($res);

        // STEP 3: Clean other extensions (deletes Extensions with circular dependencies)
        self::cleaningOtherExtensions($res);

        // Stage: Clean files
        self::publishEvent(SystemMaintenanceEvents::DELETE_ALL_STAGE_CLEAN_FILES, [
            'messageKey' => 'gs_DeleteAllStageCleaningFiles',
            'progress' => 30
        ]);

        // STEP 4: Clean sound files LAST - after all references are deleted
        // SoundFiles has RESTRICT relations to CallQueues, OutWorkTimes, IvrMenu, IncomingRoutingTable
        // All these tables are already cleaned in previous steps, so deletion should succeed
        self::cleaningSoundFiles($res);

        self::cleaningBackups();
        self::cleaningFail2Ban();
        
        // Stage: Clean logs
        self::publishEvent(SystemMaintenanceEvents::DELETE_ALL_STAGE_CLEAN_LOGS, [
            'messageKey' => 'gs_DeleteAllStageCleaningLogs',
            'progress' => 50
        ]);
        self::cleaningSystemLogs();

        // Stage: Delete modules
        self::publishEvent(SystemMaintenanceEvents::DELETE_ALL_STAGE_CLEAN_MODULES, [
            'messageKey' => 'gs_DeleteAllStageRemovingModules',
            'progress' => 60
        ]);
        
        // Delete module records from database
        $records = PbxExtensionModules::find();
        foreach ($records as $record) {
            if (! $record->delete()) {
                $res->messages[] = $record->getMessages();
                $res->success    = false;
            }
        }
        
        // Delete ALL content in custom_modules directory
        $mediaMountPoint = Directories::getDir(Directories::CORE_MEDIA_MOUNT_POINT_DIR);
        $customModulesDir = $mediaMountPoint . '/mikopbx/custom_modules/';
        
        if (file_exists($customModulesDir)) {
            // Get all items in the directory
            $items = glob($customModulesDir . '*');
            
            foreach ($items as $item) {
                // Remove everything - files and directories
                if (is_dir($item)) {
                    Processes::mwExec("$rm -rf " . escapeshellarg($item));
                } else {
                    unlink($item);
                }
            }
        }

        // Stage: Reset PBX settings
        self::publishEvent(SystemMaintenanceEvents::DELETE_ALL_STAGE_RESET_SETTINGS, [
            'messageKey' => 'gs_DeleteAllStageResettingSettings',
            'progress' => 80
        ]);
        
        // Reset PBXSettings
        $defaultValues = PbxSettings::getDefaultArrayValues();
        $fixedKeys = [
            PbxSettings::PBX_NAME,
            PbxSettings::PBX_DESCRIPTION,
            PbxSettings::PBX_LICENSE,
            PbxSettings::SSH_PORT,               // Keep SSH port
            PbxSettings::SSH_PASSWORD,
            PbxSettings::SSH_RSA_KEY,
            PbxSettings::SSH_DSS_KEY,
            PbxSettings::SSH_ID_RSA,
            PbxSettings::SSH_ID_RSA_PUB,
            PbxSettings::SSH_AUTHORIZED_KEYS,
            PbxSettings::SSH_ECDSA_KEY,
            PbxSettings::SSH_LANGUAGE,
            PbxSettings::WEB_PORT,               // Keep web port
            PbxSettings::WEB_HTTPS_PORT,         // Keep HTTPS port
            PbxSettings::WEB_HTTPS_PUBLIC_KEY,
            PbxSettings::WEB_HTTPS_PRIVATE_KEY,
            PbxSettings::REDIRECT_TO_HTTPS,
            PbxSettings::PBX_LANGUAGE,
            PbxSettings::PBX_VERSION,
            PbxSettings::WEB_ADMIN_LOGIN,
            PbxSettings::WEB_ADMIN_PASSWORD,
            PbxSettings::WEB_ADMIN_LANGUAGE,
        ];
        foreach ($defaultValues as $key => $defaultValue) {
            if (in_array($key, $fixedKeys, true)) {
                continue;
            }
            $record = PbxSettings::findFirstByKey($key);
            if ($record === null) {
                $record = new PbxSettings();
                $record->key = $key;
            }
            $record->value = $defaultValue;
            $record->save();
        }

        // Reset codecs to default values
        self::resetCodecsToDefaults();

        // Delete CallRecords from database
        $cdr = CdrDb::getPathToDB();
        Processes::mwExec("$rm -rf $cdr*");
        $dbUpdater = new UpdateDatabase();
        $dbUpdater->updateDatabaseStructure();

        // Delete CallRecords sound files
        $callRecordsPath = $di->getShared('config')->path('asterisk.monitordir');
        $storagePath = Directories::getDir(Directories::CORE_MEDIA_MOUNT_POINT_DIR);
        if (stripos($callRecordsPath, $storagePath) !== false) {
            Processes::mwExec("$rm -rf $callRecordsPath/*");
        }

        // Recreate parking slots
        self::createParkingSlots();
        
        // Stage: Finalizing
        self::publishEvent(SystemMaintenanceEvents::DELETE_ALL_STAGE_FINAL, [
            'messageKey' => 'gs_DeleteAllStageFinalizing',
            'progress' => 95
        ]);

        // Check if there were errors during deletion
        if (!$res->success && !empty($res->messages)) {
            // Log errors but continue with restart
            SystemMessages::sysLogMsg(__METHOD__, 'Some errors occurred during reset: ' . json_encode($res->messages), LOG_WARNING);
            
            // Reset was mostly successful, continue with restart
            $res->success = true;
        }

        // Stage: Complete
        self::publishEvent(SystemMaintenanceEvents::DELETE_ALL_STAGE_FINAL, [
            'messageKey' => 'gs_DeleteAllStageCompleted',
            'progress' => 100,
            'result' => true
        ]);
        
        // Mark operation as successful (redundant but clear)
        $res->success = true;
        
        // Send restart notification if async
        if (!empty($asyncChannelId)) {
            // Give time for completion message to be sent
            sleep(1);
            
            self::publishEvent(SystemMaintenanceEvents::DELETE_ALL_STAGE_RESTART, [
                'messageKey' => 'gs_DeleteAllStageRestarting',
                'progress' => 100,
                'restart' => true
            ]);
            
            // Give more time for the restart message to be sent and processed
            sleep(3);
        }
        
        // Initiate system restart using unified method
        System::reboot();

        return $res;
    }
    
    /**
     * Publish event to WebSocket if event publisher is initialized
     */
    private static function publishEvent(string $stage, array $data): void
    {
        if (self::$eventPublisher !== null) {
            self::$eventPublisher->pushMessageToBrowser($stage, $data);
        }
    }
    
    /**
     * Cleans fail2ban database
     */
    private static function cleaningFail2Ban(): void
    {
        $mediaMountPoint = Directories::getDir(Directories::CORE_MEDIA_MOUNT_POINT_DIR);
        $fail2banDb = $mediaMountPoint . '/mikopbx/fail2ban/fail2ban.sqlite3';
        if (file_exists($fail2banDb)) {
            unlink($fail2banDb);
        }
    }
    
    /**
     * Cleans all system and module logs
     */
    private static function cleaningSystemLogs(): void
    {
        $rm = Util::which('rm');
        $mediaMountPoint = Directories::getDir(Directories::CORE_MEDIA_MOUNT_POINT_DIR);
        
        // Base log directory
        $logBaseDir = $mediaMountPoint . '/mikopbx/log/';
        
        // System log directories
        $systemLogDirs = ['system', 'php', 'nginx', 'asterisk', 'nats', 'fail2ban'];
        
        foreach ($systemLogDirs as $dir) {
            $logDir = $logBaseDir . $dir;
            if (file_exists($logDir)) {
                Processes::mwExec("$rm -rf {$logDir}/*");
            }
        }
        
        // Clean all module logs dynamically
        if (file_exists($logBaseDir)) {
            // Find all directories in log folder that are not system directories
            $allDirs = glob($logBaseDir . '*', GLOB_ONLYDIR);
            foreach ($allDirs as $dir) {
                $dirName = basename($dir);
                // Skip system directories
                if (!in_array($dirName, $systemLogDirs)) {
                    // This is a module log directory
                    Processes::mwExec("$rm -rf {$dir}/*");
                }
            }
        }
        
        // Clean debug log files in root log directory
        if (file_exists($logBaseDir)) {
            $debugLogs = glob($logBaseDir . '*.log');
            foreach ($debugLogs as $debugLog) {
                if (is_file($debugLog)) {
                    unlink($debugLog);
                }
            }
        }
    }

    /**
     * Perform pre-cleaning operations on specific columns of certain models.
     * This clears foreign key references to prevent RESTRICT violations during deletion.
     *
     * @param PBXApiResult $res The result object to store any error messages.
     *
     * @return void
     */
    public static function preCleaning(PBXApiResult &$res): void
    {
        $preCleaning = [
            CallQueues::class => [
                'redirect_to_extension_if_empty',
                'redirect_to_extension_if_unanswered',
                'redirect_to_extension_if_repeat_exceeded',
                'periodic_announce_sound_id',  // Clear sound file references
                'moh_sound_id'                  // Clear sound file references
            ],
            IvrMenu::class => [
                'timeout_extension',
                'audio_message_id'              // Clear sound file references
            ],
            OutWorkTimes::class => [
                'audio_message_id'              // Clear sound file references
            ],
            IncomingRoutingTable::class => [
                'audio_message_id'              // Clear sound file references (including default route id=1)
            ]
        ];
        foreach ($preCleaning as $class => $columns) {
            $records = call_user_func([$class, 'find']);
            foreach ($records as $record) {
                foreach ($columns as $column) {
                    $record->$column = '';
                }
                if (! $record->save()) {
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
    public static function cleaningMainTables(PBXApiResult &$res): void
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
            [AsteriskRestUsers::class => ''], // All ARI users
            [ApiKeys::class => ''], // All Bearer tokens
            [UserPasskeys::class => ''], // All WebAuthn passkeys
            [Extensions::class => 'type="' . Extensions::TYPE_IVR_MENU . '"'],  // IVR Menu
            [Extensions::class => 'type="' . Extensions::TYPE_CONFERENCE . '"'],  // CONFERENCE
            [Extensions::class => 'type="' . Extensions::TYPE_QUEUE . '"'],  // QUEUE
            [Users::class => ''], // Delete all users with their extensions
            [CustomFiles::class => ''],
            [NetworkFilters::class => ''] // Delete all network filters
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
        // FirewallRules will be automatically deleted due to CASCADE relation with NetworkFilters
        
        // Clear Bearer tokens cache after deleting all tokens
        TokenValidationService::clearCache();
    }

    /**
     * Perform cleaning operations on other extensions.
     * Deletes all extensions except system ones, parking slots, and special dialplan applications.
     *
     * @param PBXApiResult $res The result object to store any error messages.
     *
     * @return void
     */
    public static function cleaningOtherExtensions(PBXApiResult &$res): void
    {
        // System dialplan applications that should not be deleted
        $systemDialplanApps = [
            '000063',   // Reads back the extension
            '000064',   // 0000MILLI
            '10003246', // Echo test
        ];

        // Define the parameters for querying the extensions to delete
        // Use type-based filtering for SYSTEM and PARKING, plus specific dialplan app numbers
        $parameters = [
            'conditions' => 'type NOT IN ({excludedTypes:array}) AND number NOT IN ({excludedNumbers:array})',
            'bind' => [
                'excludedTypes' => [
                    Extensions::TYPE_SYSTEM,
                    Extensions::TYPE_PARKING
                ],
                'excludedNumbers' => $systemDialplanApps
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
            if (! $record->delete()) {
                $deleteAttempts += 1;
            }
            if ($deleteAttempts > $countRecords * 10) {
                $stopDeleting    = true; // Prevent loop
                $res->messages[] = $record->getMessages();
            }
        }
    }

    /**
     * Clean up custom and MOH sound files.
     * This method should be called LAST, after all tables that reference SoundFiles are deleted.
     *
     * @param PBXApiResult $res The result object to store any error messages.
     *
     * @return void
     */
    public static function cleaningSoundFiles(PBXApiResult &$res): void
    {
        $rm     = Util::which('rm');
        $storagePath = Directories::getDir(Directories::CORE_MEDIA_MOUNT_POINT_DIR);

        // Delete both custom and MOH files
        $categories = [
            SoundFiles::CATEGORY_CUSTOM,
            SoundFiles::CATEGORY_MOH
        ];

        foreach ($categories as $category) {
            $parameters = [
                'conditions' => 'category = :category:',
                'bind'       => [
                    'category' => $category,
                ],
            ];
            $records = SoundFiles::find($parameters);

            foreach ($records as $record) {
                try {
                    // Delete file from disk if it exists and is within storage path
                    if (stripos($record->path, $storagePath) !== false && file_exists($record->path)) {
                        Processes::mwExec("$rm -rf " . escapeshellarg($record->path));
                    }

                    // ALWAYS delete the database record, even if file doesn't exist or is outside storage
                    // This fixes the issue where test files in /tmp/ leave orphaned DB records
                    if (! $record->delete()) {
                        $errorMessages = $record->getMessages();
                        SystemMessages::sysLogMsg(
                            __METHOD__,
                            "Failed to delete SoundFile '{$record->name}' (id={$record->id}): " . implode(', ', $errorMessages),
                            LOG_WARNING
                        );
                        // Store error but don't stop the process
                        $res->messages['warning'][] = "Failed to delete sound file: {$record->name}";
                    }
                } catch (\Exception $e) {
                    // Catch any database locking or constraint errors
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Exception deleting SoundFile '{$record->name}' (id={$record->id}): " . $e->getMessage(),
                        LOG_WARNING
                    );
                    $res->messages['warning'][] = "Exception deleting sound file: {$record->name} - " . $e->getMessage();
                }
            }
        }
    }

    /**
     * Deletes main database (CF) backups
     * @return void
     */
    public static function cleaningBackups(): void
    {
        $di = Di::getDefault();
        $dir = $di->getShared('config')->path('core.mediaMountPoint') . '/mikopbx/backup';
        if (file_exists($dir)) {
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
    public static function createParkingSlots(): void
    {
        // Delete all parking slots
        $currentSlots = Extensions::findByType(Extensions::TYPE_PARKING);
        foreach ($currentSlots as $currentSlot) {
            // Try to delete, but don't fail the whole operation if it doesn't work
            // as parking slots will be recreated anyway
            $currentSlot->delete();
        }

        $startSlot = intval(PbxSettings::getValueByKey(PbxSettings::PBX_CALL_PARKING_START_SLOT));
        $endSlot = intval(PbxSettings::getValueByKey(PbxSettings::PBX_CALL_PARKING_END_SLOT));
        $reservedSlot = intval(PbxSettings::getValueByKey(PbxSettings::PBX_CALL_PARKING_EXT));

        // Create an array of new numbers
        $numbers = range($startSlot, $endSlot);
        $numbers[] = $reservedSlot;
        foreach ($numbers as $number) {
            $record = new Extensions();
            $record->type = Extensions::TYPE_PARKING;
            $record->number = (string)$number;
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
    
    /**
     * Stop critical services to prevent interference during cleanup
     */
    private static function stopMonit(): void
    {
        // Update progress
        self::publishEvent(SystemMaintenanceEvents::DELETE_ALL_STAGE_PREPARE, [
            'messageKey' => 'gs_DeleteAllStageStoppingServices',
            'progress' => 5
        ]);
        
        // Stop cron first (while monit is still running)
        $cronConf = new CronConf();
        $cronConf->stop();
        
        // Now stop monit itself to prevent it from restarting services
        MonitConf::stopMonit();
    }

    /**
     * Reset codecs to default values with proper priorities
     * All codecs will be enabled after reset
     */
    private static function resetCodecsToDefaults(): void
    {
        // First, clean up any duplicate lowercase video codecs that may exist
        // These could have been created by previous versions of this code
        $duplicateCodecs = ['jpeg', 'h261', 'vp8', 'vp9'];
        foreach ($duplicateCodecs as $codecName) {
            $codec = Codecs::findFirst("name = '$codecName'");
            if ($codec !== null) {
                $codec->delete();
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Removed duplicate lowercase codec: $codecName",
                    LOG_INFO
                );
            }
        }

        // Define default audio codecs with priorities
        $defaultAudioCodecs = [
            'alaw' => ['priority' => 1, 'disabled' => '0', 'description' => 'G.711 A-law'],
            'ulaw' => ['priority' => 2, 'disabled' => '0', 'description' => 'G.711 μ-law'],
            'opus' => ['priority' => 3, 'disabled' => '0', 'description' => 'Opus'],
            'g722' => ['priority' => 4, 'disabled' => '0', 'description' => 'G.722'],
            'g729' => ['priority' => 5, 'disabled' => '0', 'description' => 'G.729'],
            'ilbc' => ['priority' => 6, 'disabled' => '0', 'description' => 'iLBC'],
            'g726' => ['priority' => 7, 'disabled' => '0', 'description' => 'G.726'],
            'gsm' => ['priority' => 8, 'disabled' => '0', 'description' => 'GSM'],
            'adpcm' => ['priority' => 9, 'disabled' => '0', 'description' => 'ADPCM'],
            'lpc10' => ['priority' => 10, 'disabled' => '0', 'description' => 'LPC-10'],
            'speex' => ['priority' => 11, 'disabled' => '0', 'description' => 'Speex'],
            'slin' => ['priority' => 12, 'disabled' => '0', 'description' => 'Signed Linear PCM'],
        ];

        // Define default video codecs with priorities
        // Note: JPEG, H.261, VP8, VP9 use uppercase names for consistency with migration UpdateConfigsUpToVer202302161
        $defaultVideoCodecs = [
            'h264' => ['priority' => 1, 'disabled' => '0', 'description' => 'H.264'],
            'h263' => ['priority' => 2, 'disabled' => '0', 'description' => 'H.263'],
            'h263p' => ['priority' => 3, 'disabled' => '0', 'description' => 'H.263+'],
            'VP8' => ['priority' => 4, 'disabled' => '0', 'description' => 'vp8'],
            'VP9' => ['priority' => 5, 'disabled' => '0', 'description' => 'vp9'],
            'JPEG' => ['priority' => 6, 'disabled' => '0', 'description' => 'jpeg'],
            'H.261' => ['priority' => 7, 'disabled' => '0', 'description' => 'h261'],
        ];

        // Update audio codecs
        foreach ($defaultAudioCodecs as $codecName => $codecData) {
            $codec = Codecs::findFirst("name = '$codecName'");
            if ($codec === null) {
                // Create codec if it doesn't exist
                $codec = new Codecs();
                $codec->name = $codecName;
                $codec->type = 'audio';
            }
            $codec->priority = (string)$codecData['priority'];
            $codec->disabled = $codecData['disabled'];
            $codec->description = $codecData['description'];
            
            if (!$codec->save()) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    'Failed to reset audio codec ' . $codecName . ': ' . implode(', ', $codec->getMessages()),
                    LOG_WARNING
                );
            }
        }

        // Update video codecs
        foreach ($defaultVideoCodecs as $codecName => $codecData) {
            $codec = Codecs::findFirst("name = '$codecName'");
            if ($codec === null) {
                // Create codec if it doesn't exist
                $codec = new Codecs();
                $codec->name = $codecName;
                $codec->type = 'video';
            }
            $codec->priority = (string)$codecData['priority'];
            $codec->disabled = $codecData['disabled'];
            $codec->description = $codecData['description'];
            
            if (!$codec->save()) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    'Failed to reset video codec ' . $codecName . ': ' . implode(', ', $codec->getMessages()),
                    LOG_WARNING
                );
            }
        }

        // Log the codec reset
        SystemMessages::sysLogMsg(__CLASS__, 'Codecs have been reset to default values', LOG_INFO);
    }
}
