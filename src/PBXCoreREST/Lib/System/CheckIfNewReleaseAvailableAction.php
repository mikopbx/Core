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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\System;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Quick check if new firmware release is available
 *
 * Fast lightweight check used by:
 * - WorkerPrepareAdvice (advice notifications)
 * - Dashboard widgets
 * - Monitoring systems
 *
 * For detailed release information use GetFirmwareDetailsAction instead.
 *
 * @package MikoPBX\PBXCoreREST\Lib\System
 */
class CheckIfNewReleaseAvailableAction
{
    private const UPDATE_CHECK_URL = 'https://releases.mikopbx.com/releases/v1/mikopbx/ifNewReleaseAvailable';
    private const REQUEST_TIMEOUT = 5;

    /**
     * Quick check if new firmware version is available
     *
     * @return PBXApiResult Result with update availability status
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Get current PBX version
            $pbxVersion = PbxSettings::getValueByKey(PbxSettings::PBX_VERSION);

            // Prepare request data
            $requestData = [
                'PBXVER' => $pbxVersion,
            ];

            // Make API call to releases server
            $client = new Client();
            $response = $client->request(
                'POST',
                self::UPDATE_CHECK_URL,
                [
                    'json' => $requestData,
                    'timeout' => self::REQUEST_TIMEOUT,
                    'connect_timeout' => 3,
                ]
            );

            // Check response status
            if ($response->getStatusCode() !== Response::OK) {
                $res->messages['error'][] = 'Failed to check for updates: HTTP ' . $response->getStatusCode();
                $res->httpCode = Response::INTERNAL_SERVER_ERROR;
                return $res;
            }

            // Parse response body
            $body = $response->getBody()->getContents();
            $updateData = json_decode($body, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $res->messages['error'][] = 'Invalid JSON response from update server';
                $res->httpCode = Response::INTERNAL_SERVER_ERROR;
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    'Invalid JSON from update server: ' . json_last_error_msg(),
                    LOG_ERR
                );
                return $res;
            }

            // Validate response structure
            if (!isset($updateData['result']) || $updateData['result'] !== 'SUCCESS') {
                $res->messages['error'][] = 'Update check failed: ' . ($updateData['message'] ?? 'Unknown error');
                $res->httpCode = Response::INTERNAL_SERVER_ERROR;
                return $res;
            }

            // Build response data
            $res->data = [
                'currentVersion' => $pbxVersion,
                'newVersionAvailable' => $updateData['newVersionAvailable'] ?? false,
                'latestVersion' => $updateData['version'] ?? null,
                'lastCheck' => date('Y-m-d H:i:s'),
            ];

            $res->success = true;
            $res->httpCode = Response::OK;

        } catch (GuzzleException $e) {
            $res->messages['error'][] = 'Network error while checking for updates';
            $res->httpCode = Response::INTERNAL_SERVER_ERROR;
            SystemMessages::sysLogMsg(
                __METHOD__,
                'Failed to check updates: ' . $e->getMessage(),
                LOG_ERR
            );
        } catch (\Throwable $e) {
            $res->messages['error'][] = 'Unexpected error while checking for updates';
            $res->httpCode = Response::INTERNAL_SERVER_ERROR;
            SystemMessages::sysLogMsg(
                __METHOD__,
                'Unexpected error: ' . $e->getMessage(),
                LOG_ERR
            );
        }

        return $res;
    }
}
