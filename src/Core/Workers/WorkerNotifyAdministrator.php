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

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use MikoPBX\Core\System\Notifications;
use MikoPBX\Core\System\Mail\Builders\SystemProblemsNotificationBuilder;
use MikoPBX\Core\System\Mail\NotificationQueueHelper;
use Phalcon\Di\Di;
use Throwable;

/**
 * WorkerNotifyAdministrator is a worker class responsible for checking the significant advice messages and sent it to system administrator.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerNotifyAdministrator extends WorkerBase
{
    /**
     * Starts the errors notifier worker.
     *
     * @param array<int, string> $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $cacheKey = 'Workers:WorkerNotifyAdministrator:lastErrorsCheck';
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);

        // Retrieve the last error check timestamp from the cache
        $lastErrorsCheck = $managedCache->get($cacheKey);
        if ($lastErrorsCheck === null) {
            try {
                // Get user data from the API
                $di = Di::getDefault();
                $restResponse = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
                    '/pbxcore/api/v3/advice:getList',
                    PBXCoreRESTClientProvider::HTTP_METHOD_GET
                ]);
                $errorMessages = $restResponse->data['advice']['error'] ?? [];
                if ($restResponse->success and $errorMessages !== []) {
                    // Queue notification for async sending via WorkerNotifyByEmail
                    $adminEmail = PbxSettings::getValueByKey(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL);

                    if (!empty($adminEmail)) {
                        $builder = new SystemProblemsNotificationBuilder();
                        $builder->setRecipient($adminEmail)
                                ->setProblems($errorMessages)
                                ->setAdminUrl(self::buildAdminUrl('/admin-cabinet/'));

                        // Queue with critical priority (system problems are critical)
                        NotificationQueueHelper::queueOrSend(
                            $builder,
                            async: true,
                            priority: NotificationQueueHelper::PRIORITY_CRITICAL
                        );
                    } else {
                        // Fallback to legacy if no admin email configured
                        Notifications::sendAdminNotification(['messageTpl' => 'adv_ThereIsSomeTroublesWithMikoPBX'], $errorMessages);
                    }
                }
                // Store the current timestamp in the cache to track the last error check
                $managedCache->set($cacheKey, time(), 3600); // Check every hour
            } catch (Throwable $exception) {
                CriticalErrorsHandler::handleExceptionWithSyslog($exception);
            }
        }

    }

    /**
     * Build admin panel URL using network settings
     *
     * @param string $path Path to append to base URL
     * @return string Full URL to admin panel
     */
    private static function buildAdminUrl(string $path = ''): string
    {
        // Get HTTPS port from settings
        $httpsPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT) ?: '443';

        // Try to get external IP first, then local IP
        $host = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_IP_ADDR);
        if (empty($host)) {
            $host = gethostname() ?: 'localhost';
        }

        // Build URL
        $portSuffix = ($httpsPort === '443') ? '' : ':' . $httpsPort;
        return 'https://' . $host . $portSuffix . $path;
    }

}

// Start a worker process
WorkerNotifyAdministrator::startWorker($argv ?? []);