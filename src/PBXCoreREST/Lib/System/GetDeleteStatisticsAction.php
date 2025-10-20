<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Common\Models\AsteriskRestUsers;
use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\IvrMenu;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\Common\Models\OutWorkTimesRouts;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Models\UserPasskeys;
use MikoPBX\Common\Models\Users;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Providers\CDRDatabaseProvider;

/**
 * Get statistics about what will be deleted during system restore
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class GetDeleteStatisticsAction
{
    /**
     * Get statistics about data that will be deleted
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $stats = [];
            $di = \Phalcon\Di\Di::getDefault();
            if ($di === null) {
                throw new \Exception('DI container is not available');
            }

            // Count all users
            $stats['users'] = Users::count();

            // Count all extensions (excluding system extensions, parking slots, and special dialplan apps)
            // System dialplan applications that should not be counted
            $systemDialplanApps = [
                '000063',   // Reads back the extension
                '000064',   // 0000MILLI
                '10003246', // Echo test
            ];
            $stats['extensions'] = Extensions::count([
                'conditions' => 'type NOT IN ({excludedTypes:array}) AND number NOT IN ({excludedNumbers:array})',
                'bind' => [
                    'excludedTypes' => [
                        Extensions::TYPE_SYSTEM,
                        Extensions::TYPE_PARKING
                    ],
                    'excludedNumbers' => $systemDialplanApps
                ]
            ]);
            
            // Count providers
            $stats['providers'] = Providers::count();
            
            // Count SIP hosts (external phones)
            $stats['sipHosts'] = SipHosts::count();
            
            // Count IVR menus
            $stats['ivrMenus'] = IvrMenu::count();
            
            // Count Call Queues
            $stats['callQueues'] = CallQueues::count();
            
            // Count Conference Rooms
            $stats['conferenceRooms'] = ConferenceRooms::count();
            
            // Count Dialplan Applications (excluding system applications)
            $systemDialplanApps = ['000063', '000064', '10003246'];
            $stats['dialplanApplications'] = DialplanApplications::count([
                'conditions' => 'extension NOT IN ({apps:array})',
                'bind' => ['apps' => $systemDialplanApps]
            ]);

            // Count Sound Files (custom only)
            $stats['customSoundFiles'] = SoundFiles::count([
                'conditions' => 'category = :category:',
                'bind' => ['category' => SoundFiles::CATEGORY_CUSTOM]
            ]);

            // Count MOH (Music On Hold) files
            $stats['mohFiles'] = SoundFiles::count([
                'conditions' => 'category = :category:',
                'bind' => ['category' => SoundFiles::CATEGORY_MOH]
            ]);

            // Count Incoming Routes
            $stats['incomingRoutes'] = IncomingRoutingTable::count([
                'conditions' => 'priority != 9999'
            ]);
            
            // Count Outgoing Routes
            $stats['outgoingRoutes'] = OutgoingRoutingTable::count();

            // Count Out-of-Work Time conditions
            $stats['outWorkTimes'] = OutWorkTimes::count();

            // Count Out-of-Work Time route associations
            $stats['outWorkTimesRouts'] = OutWorkTimesRouts::count();

            // Count Network Filters
            $stats['firewallRules'] = FirewallRules::count();

            // Count Installed Modules
            $stats['modules'] = PbxExtensionModules::count();

            // Count REST API Keys
            $stats['apiKeys'] = ApiKeys::count();

            // Count Asterisk REST Interface (ARI) Users
            $stats['asteriskRestUsers'] = AsteriskRestUsers::count();

            // Count WebAuthn Passkeys
            $stats['userPasskeys'] = UserPasskeys::count();
            
            // Get CDR stats
            try {
                $cdrDb = $di->get(CDRDatabaseProvider::SERVICE_NAME);
                $result = $cdrDb->query("SELECT COUNT(*) as count FROM cdr");
                $cdrCount = $result->fetch(\PDO::FETCH_ASSOC);
                $stats['callHistory'] = (int)($cdrCount['count'] ?? 0);
            } catch (\Exception $e) {
                $stats['callHistory'] = 0;
            }
            
            // Get recordings count and size
            $callRecordsPath = $di->getShared('config')->path('asterisk.monitordir');
            $recordingsStats = self::getDirectoryStats($callRecordsPath);
            $stats['callRecordings'] = $recordingsStats['count'];
            $stats['callRecordingsSize'] = $recordingsStats['size'];
            
            // Get backups stats
            $backupPath = $di->getShared('config')->path('core.backupDir'); 
            if (!$backupPath) {
                $backupPath = '/storage/usbdisk1/mikopbx/backup';
            }
            $backupsStats = self::getDirectoryStats($backupPath, '*.tar');
            $stats['backups'] = $backupsStats['count'];
            $stats['backupsSize'] = $backupsStats['size'];
            
            // Get custom files count
            $customFilesPath = '/storage/usbdisk1/mikopbx/custom_files';
            $customFilesStats = self::getDirectoryStats($customFilesPath);
            $stats['customFiles'] = $customFilesStats['count'];
            
            $res->data = $stats;
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Get directory statistics (file count and total size)
     *
     * @param string $path Directory path
     * @param string $pattern File pattern (optional)
     * @return array{count: int, size: int}
     */
    private static function getDirectoryStats(string $path, string $pattern = '*'): array
    {
        $stats = ['count' => 0, 'size' => 0];

        if (!file_exists($path) || !is_dir($path)) {
            return $stats;
        }

        try {
            $find = Util::which('find');
            $wc = Util::which('wc');
            $du = Util::which('du');

            // Count files (exclude hidden/system files that start with .)
            if ($pattern === '*') {
                // Exclude files starting with . (like .DS_Store, .gitkeep)
                $countCmd = "{$find} {$path} -type f ! -name '.*' 2>/dev/null | {$wc} -l";
            } else {
                $countCmd = "{$find} {$path} -name '{$pattern}' -type f ! -name '.*' 2>/dev/null | {$wc} -l";
            }

            $result = [];
            Processes::mwExec($countCmd, $result);
            $stats['count'] = (int)trim(implode('', $result));

            // Get total size in bytes
            $sizeCmd = "{$du} -sb {$path} 2>/dev/null | cut -f1";
            $result = [];
            Processes::mwExec($sizeCmd, $result);
            $stats['size'] = (int)trim(implode('', $result));

        } catch (\Exception $e) {
            // Ignore errors
        }

        return $stats;
    }
}