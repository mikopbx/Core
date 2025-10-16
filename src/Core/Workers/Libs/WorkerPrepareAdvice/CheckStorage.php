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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\Mail\Builders\DiskSpaceNotificationBuilder;
use MikoPBX\Core\System\Mail\EmailNotificationService;
use MikoPBX\Core\Workers\WorkerRemoveOldRecords;
use Phalcon\Di\Injectable;

/**
 * Class CheckStorage
 * This class is responsible for checking free space on storage disk on backend.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckStorage extends Injectable
{
    /**
     * Check storage status.
     *
     * @return array An array containing warning or error messages.
     *
     */
    public function process(): array
    {
        $messages = [];
        $st = new Storage();
        $storageDiskMounted = false;
        $disks = $st->getAllHdd();
        $criticalDisks = [];
        $maxUsagePercentage = 0;
        $minFreeSpace = 0;

        foreach ($disks as $disk) {
            if (array_key_exists('mounted', $disk)
                && strpos($disk['mounted'], '/storage/usbdisk') !== false) {
                $storageDiskMounted = true;
                if ($disk['free_space'] < WorkerRemoveOldRecords::MIN_SPACE_MB_ALERT) {
                    $messages['error'][] = [
                        'messageTpl'=>'adv_StorageDiskRunningOutOfFreeSpace',
                        'messageParams'=>[
                            'free'=> $disk['free_space']
                        ]
                    ];

                    // Calculate usage percentage for email notification
                    $totalSpace = ($disk['size_bytes'] ?? 0);
                    $usedSpace = $totalSpace - ($disk['free_space'] * 1024 * 1024);
                    $usagePercentage = $totalSpace > 0 ? (int)(($usedSpace / $totalSpace) * 100) : 0;

                    $criticalDisks[] = [
                        'name' => $disk['mounted'] ?? 'Unknown',
                        'usage' => $usagePercentage
                    ];

                    $maxUsagePercentage = max($maxUsagePercentage, $usagePercentage);
                    $minFreeSpace = $disk['free_space'];
                }
            }
        }

        if ($storageDiskMounted === false) {
            $messages['error'][] = ['messageTpl'=>'adv_StorageDiskUnMounted'];
        }

        // Send beautiful disk space notification email if we have critical disks
        if (!empty($criticalDisks)) {
            $adminEmail = PbxSettings::getValueByKey(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL);

            if (!empty($adminEmail)) {
                $builder = new DiskSpaceNotificationBuilder();
                $builder->setRecipient($adminEmail)
                        ->setDiskUsage($maxUsagePercentage)
                        ->setFreeSpace($minFreeSpace . ' MB')
                        ->setPartitions($criticalDisks)
                        ->setAdminUrl(self::buildAdminUrl('/admin-cabinet/system-diagnostic/index/'));

                $emailService = new EmailNotificationService();
                $emailService->sendNotification($builder);
            }
        }

        return $messages;
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