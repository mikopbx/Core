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

namespace MikoPBX\PBXCoreREST\Controllers\Syslog;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\SysLogsManagementProcessor;


/**
 * Get system logs (POST).
 *
 * @RoutePrefix("/pbxcore/api/syslog")
 *
 * Gets partially filtered log file strings.
 *   curl -X POST -d '{"filename": "asterisk/messages","filter":"","lines":"500"}'
 *   http://127.0.0.1/pbxcore/api/syslog/getLogFromFile;
 *
 * Download logfile by name
 *  curl -X POST -d '{"filename": "asterisk/messages"}'
 *  http://127.0.0.1/pbxcore/api/syslog/downloadLogFile;
 *
 * Ask for zipped logs and PCAP file
 * curl -X POST -d '{"filename": "/tmp/file.zip"}'
 * http://127.0.0.1/pbxcore/api/syslog/downloadLogsArchive;
 *
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     *
     * Gets partially filtered log file strings.
     * @Post("/getLogFromFile")
     *
     * Prepares a downloadable link for a log file with the provided name.
     * @Post("/downloadLogFile")
     *
     * Requests a zipped archive containing logs and PCAP file
     * Checks if archive ready it returns download link.
     * @Post("/downloadLogsArchive")
     *
     * Erase file content.
     * @Post("/eraseFile")
     */
    public function callAction(string $actionName): void
    {

        $requestData = self::sanitizeData($this->request->getData(), $this->filter);    
        $this->sendRequestToBackendWorker(SysLogsManagementProcessor::class, $actionName, $requestData);
        
    }
}
