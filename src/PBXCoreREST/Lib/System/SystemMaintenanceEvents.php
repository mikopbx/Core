<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Injectable;

/**
 * Class SystemMaintenanceEvents
 * Handles WebSocket events for system maintenance operations
 * 
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class SystemMaintenanceEvents extends Injectable
{
    private string $asyncChannelId;
    
    // Delete all settings operation stages
    public const string DELETE_ALL_STAGE_PREPARE = 'DeleteAll_Stage_Prepare';
    public const string DELETE_ALL_STAGE_CLEAN_TABLES = 'DeleteAll_Stage_CleanTables';
    public const string DELETE_ALL_STAGE_CLEAN_FILES = 'DeleteAll_Stage_CleanFiles';
    public const string DELETE_ALL_STAGE_CLEAN_LOGS = 'DeleteAll_Stage_CleanLogs';
    public const string DELETE_ALL_STAGE_CLEAN_MODULES = 'DeleteAll_Stage_CleanModules';
    public const string DELETE_ALL_STAGE_RESET_SETTINGS = 'DeleteAll_Stage_ResetSettings';
    public const string DELETE_ALL_STAGE_RESTART = 'DeleteAll_Stage_Restart';
    public const string DELETE_ALL_STAGE_FINAL = 'DeleteAll_Stage_Final';
    
    // Future: Other maintenance operations can add their stages here
    // public const string CLEAN_OLD_LOGS_STAGE_ANALYZE = 'CleanOldLogs_Stage_Analyze';
    // public const string BACKUP_STAGE_PREPARE = 'Backup_Stage_Prepare';
    
    public function __construct(string $asyncChannelId)
    {
        $this->asyncChannelId = $asyncChannelId;
    }
    
    /**
     * Pushes messages to browser via WebSocket
     * @param string $stage operation stage name
     * @param array $data stage data
     * @return void
     */
    public function pushMessageToBrowser(string $stage, array $data): void
    {
        $message = [
            'stage' => $stage,
            'stageDetails' => $data,
            'pid' => posix_getpid()
        ];
        
        SystemMessages::sysLogMsg(
            __CLASS__,
            json_encode($message, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
            LOG_DEBUG
        );
        
        $this->di->get(EventBusProvider::SERVICE_NAME)->publish($this->asyncChannelId, $message);
    }
}