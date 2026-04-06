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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Class CheckUpdates
 * This class is responsible for checking PBX updates.
 *
 * Uses unified REST API endpoint via internal HTTP request for update checking.
 * This approach follows the MikoPBX pattern of inter-module communication via REST API.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckUpdates extends Injectable
{
    /**
     * Check for a new version PBX
     *
     * @return array<string, array<int, array<string, mixed>>> An array containing information messages about available updates.
     *
     */
    public function process(): array
    {
        $messages = [];

        try {
            // Use fast REST API endpoint for quick availability check
            // This is more efficient for periodic background checks
            $di = Di::getDefault();
            if ($di === null) {
                SystemMessages::sysLogMsg(
                    static::class,
                    'DI container is not available',
                    LOG_ERR
                );
                return [];
            }

            $restResponse = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
                '/pbxcore/api/v3/system:checkIfNewReleaseAvailable',
                PBXCoreRESTClientProvider::HTTP_METHOD_GET
            ]);

            if (!$restResponse->success || empty($restResponse->data)) {
                // Log error if check failed
                if (!empty($restResponse->messages['error'])) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        'Update check failed: ' . implode(', ', $restResponse->messages['error']),
                        LOG_WARNING
                    );
                }
                return [];
            }

            // Check if new version is available
            if (!empty($restResponse->data['newVersionAvailable']) && !empty($restResponse->data['latestVersion'])) {
                $messages['info'][] = [
                    'messageTpl' => 'adv_AvailableNewVersionPBX',
                    'messageParams' => [
                        'url' => $this->url->get('update/index/'),
                        'ver' => $restResponse->data['latestVersion'],
                    ]
                ];
            }
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                'Exception during update check: ' . $e->getMessage(),
                LOG_ERR
            );
        }

        return $messages;
    }
}
