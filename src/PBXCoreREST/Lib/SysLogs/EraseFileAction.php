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

namespace MikoPBX\PBXCoreREST\Lib\SysLogs;

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\PBXCoreREST\Lib\Common\ParameterSanitizationExtractor;
use MikoPBX\PBXCoreREST\Controllers\Syslog\RestController;
use Phalcon\Di\Injectable;

/**
 * Erase log file with the provided name.
 *
 * @package MikoPBX\PBXCoreREST\Lib\SysLogs
 */
class EraseFileAction extends Injectable
{
    /**
     * Erase log file with the provided name.
     *
     * Uses unified sanitization approach with ParameterSanitizationExtractor
     * for consistent parameter handling.
     *
     * @param array<string, mixed> $data An array containing the following parameters:
     *                    - filename (string): The name of the log file.
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Get sanitization rules automatically from controller attributes
        // Single Source of Truth - rules extracted from #[ApiParameter] attributes
        $sanitizationRules = ParameterSanitizationExtractor::extractFromController(
            RestController::class,
            'eraseFile'
        );

        // Sanitize input data using unified approach
        $sanitizedData = BaseActionHelper::sanitizeData($data, $sanitizationRules);

        // Extract validated parameters
        $filename = (string)($sanitizedData['filename'] ?? '');

        $filename = Directories::getDir(Directories::CORE_LOGS_DIR) . '/' . $filename;
        if (!file_exists($filename)) {
            $res->success = false;
            $res->messages[] = 'File does not exist ' . $filename;
        } else {
            $echoPath = Util::which('echo');
            Processes::mwExec("$echoPath ' ' > $filename");
            $res->success = true;
        }

        return $res;
    }
}
