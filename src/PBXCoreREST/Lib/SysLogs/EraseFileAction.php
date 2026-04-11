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
use MikoPBX\Common\Providers\TranslationProvider;
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
     * WHY: Uses DataStructure::getSanitizationRules() for consistent parameter handling.
     * DataStructure is the Single Source of Truth for all field definitions.
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

        // WHY: Get sanitization rules from DataStructure (Single Source of Truth)
        // DataStructure defines all field constraints, not controller attributes
        $sanitizationRules = DataStructure::getSanitizationRules();

        // WHY: Sanitize input data for security - never trust user input
        $sanitizedData = BaseActionHelper::sanitizeData($data, $sanitizationRules);

        // Extract validated parameters
        $filename = (string)($sanitizedData['filename'] ?? '');

        // WHY: Validate filename is not empty before constructing path
        if (empty($filename)) {
            $res->success = false;
            $res->messages['error'][] = TranslationProvider::translate('rest_err_syslog_filename_required');
            $res->httpCode = 400;
            return $res;
        }

        $filename = Directories::getDir(Directories::CORE_LOGS_DIR) . '/' . $filename;

        // Security: path traversal protection
        $realLogDir = realpath(Directories::getDir(Directories::CORE_LOGS_DIR));
        $realFilename = realpath($filename);
        if ($realFilename === false || $realLogDir === false
            || !str_starts_with($realFilename . '/', $realLogDir . '/')) {
            $res->success = false;
            $res->messages['error'][] = TranslationProvider::translate('rest_err_syslog_invalid_path');
            $res->httpCode = 400;
            return $res;
        }
        $filename = $realFilename;

        if (!file_exists($filename)) {
            $res->success = false;
            $res->messages[] = TranslationProvider::translate('rest_err_syslog_file_not_found') . ': ' . basename($filename);
        } else {
            $echoPath = Util::which('echo');
            Processes::mwExec("$echoPath ' ' > " . escapeshellarg($filename));
            $res->success = true;
        }

        return $res;
    }
}
