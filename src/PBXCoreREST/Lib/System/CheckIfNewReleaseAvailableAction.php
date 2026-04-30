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
use MikoPBX\Core\System\System;
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

        // Get current PBX version up front so we can populate it in degraded
        // responses (when the release server is unreachable).
        $pbxVersion = (string)PbxSettings::getValueByKey(PbxSettings::PBX_VERSION);

        try {
            // Prepare request data with platform identification
            $requestData = array_merge(
                [
                    'PBXVER' => $pbxVersion,
                ],
                System::getPlatformInfo()
            );

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
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    'Update server returned HTTP ' . $response->getStatusCode(),
                    LOG_ERR
                );
                return self::degradedResult(
                    $res,
                    $pbxVersion,
                    'Update server returned HTTP ' . $response->getStatusCode()
                );
            }

            // Parse response body
            $body = $response->getBody()->getContents();
            $updateData = json_decode($body, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    'Invalid JSON from update server: ' . json_last_error_msg(),
                    LOG_ERR
                );
                return self::degradedResult($res, $pbxVersion, 'Invalid JSON response from update server');
            }

            // Validate response structure
            if (!isset($updateData['result']) || $updateData['result'] !== 'SUCCESS') {
                $reason = 'Update check failed: ' . ($updateData['message'] ?? 'Unknown error');
                SystemMessages::sysLogMsg(__METHOD__, $reason, LOG_ERR);
                return self::degradedResult($res, $pbxVersion, $reason);
            }

            // Build response data
            // `severity` comes from the release server for critical/security firmware updates.
            // Missing field defaults to 'info' so pre-severity server responses keep working.
            $res->data = [
                'currentVersion' => $pbxVersion,
                'newVersionAvailable' => $updateData['newVersionAvailable'] ?? false,
                'latestVersion' => $updateData['version'] ?? null,
                'severity' => $updateData['severity'] ?? 'info',
                'lastCheck' => date('Y-m-d H:i:s'),
                'checkSucceeded' => true,
            ];

            $res->success = true;
            $res->httpCode = Response::OK;

        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'Failed to check updates: ' . $e->getMessage(),
                LOG_ERR
            );
            return self::degradedResult($res, $pbxVersion, 'Network error while checking for updates');
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'Unexpected error: ' . $e->getMessage(),
                LOG_ERR
            );
            return self::degradedResult($res, $pbxVersion, 'Unexpected error while checking for updates');
        }

        return $res;
    }

    /**
     * Build a successful HTTP 200 response that signals "could not check".
     *
     * WHY: This endpoint backs the dashboard "is there an update?" widget,
     * WorkerPrepareAdvice, and monitoring probes. A transient outage of
     * releases.mikopbx.com or a momentary DNS/network blip on the PBX must
     * not surface as HTTP 500 — that breaks dashboards and CI tests for the
     * predictable shape of the response. Callers that care about the
     * difference between "no new version" and "could not reach the update
     * server" can inspect the boolean `checkSucceeded` field. The actual
     * error is preserved in syslog for diagnostics, and surfaced as a
     * non-fatal warning in the response payload.
     *
     * @param PBXApiResult $res         Pre-allocated result object
     * @param string       $pbxVersion  Current PBX version (echoed back)
     * @param string       $reason      Human-readable reason for degradation
     * @return PBXApiResult
     */
    private static function degradedResult(PBXApiResult $res, string $pbxVersion, string $reason): PBXApiResult
    {
        $res->data = [
            'currentVersion' => $pbxVersion,
            'newVersionAvailable' => false,
            'latestVersion' => null,
            'severity' => 'info',
            'lastCheck' => date('Y-m-d H:i:s'),
            'checkSucceeded' => false,
        ];
        $res->messages['warning'][] = $reason;
        $res->success = true;
        $res->httpCode = Response::OK;
        return $res;
    }
}
