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

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * ExecuteBashCommandAction
 *
 * Execute arbitrary bash command with timeout and output capture
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class ExecuteBashCommandAction extends Injectable
{
    /**
     * Execute bash command
     *
     * @param array $data Request data containing:
     *   - command: string (required) - The bash command to execute
     *   - timeout: int (optional) - Timeout in seconds, default 30
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Get translation service
        $translation = Di::getDefault()->get(TranslationProvider::SERVICE_NAME);

        // Validate required parameters
        if (empty($data['command'])) {
            $res->messages['error'][] = $translation->_('rest_err_system_command_required');
            $res->httpCode = 400;
            return $res;
        }

        $command = $data['command'];
        $timeout = (int)($data['timeout'] ?? 30);

        // Validate timeout range
        if ($timeout < 1 || $timeout > 300) {
            $res->messages['error'][] = $translation->_('rest_err_system_timeout_range');
            $res->httpCode = 400;
            return $res;
        }

        // Execute command with timeout
        $output = [];
        $returnCode = 0;

        try {
            Processes::mwExec($command, $output, $returnCode, $timeout);

            $res->success = true;
            $res->data = [
                'command' => $command,
                'output' => implode("\n", $output),
                'exitCode' => $returnCode,
                'timeout' => $timeout
            ];
        } catch (\Throwable $e) {
            $res->messages['error'][] = $translation->_('rest_err_system_command_failed') . ': ' . $e->getMessage();
            $res->httpCode = 500;
        }

        return $res;
    }
}
