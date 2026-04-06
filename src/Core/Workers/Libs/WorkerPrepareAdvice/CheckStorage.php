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

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\Mail\Builders\DiskSpaceNotificationBuilder;
use MikoPBX\Core\System\Mail\NotificationQueueHelper;
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
     * @return array<string, array<int, array<string, mixed>>> An array containing warning or error messages.
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

        // Fallback: on single-disk systems, diskIsMounted() returns the first partition
        // mount point (e.g. /offload) instead of /storage/usbdisk1, causing a false alarm.
        // Use the dedicated isStorageDiskMounted() as a reliable check.
        if ($storageDiskMounted === false) {
            $mountDir = '';
            if (Storage::isStorageDiskMounted('', $mountDir)) {
                $storageDiskMounted = true;

                $freeSpace = Storage::getFreeSpace(trim($mountDir));
                if ($freeSpace < WorkerRemoveOldRecords::MIN_SPACE_MB_ALERT) {
                    $messages['error'][] = [
                        'messageTpl' => 'adv_StorageDiskRunningOutOfFreeSpace',
                        'messageParams' => [
                            'free' => $freeSpace,
                        ],
                    ];

                    $usedSpace = Storage::getUsedSpace(trim($mountDir));
                    $totalUsable = $usedSpace + $freeSpace;
                    $usagePercentage = ($totalUsable > 0) ? (int)(($usedSpace / $totalUsable) * 100) : 0;

                    $criticalDisks[] = [
                        'name' => trim($mountDir),
                        'usage' => $usagePercentage,
                    ];

                    $maxUsagePercentage = max($maxUsagePercentage, $usagePercentage);
                    $minFreeSpace = $freeSpace;
                }
            }
        }

        if ($storageDiskMounted === false) {
            $messages['error'][] = ['messageTpl' => 'adv_StorageDiskUnMounted'];
        }

        // Queue disk space notification for async sending if we have critical disks
        if (!empty($criticalDisks)) {
            $adminEmail = PbxSettings::getValueByKey(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL);

            if (!empty($adminEmail)) {
                $builder = new DiskSpaceNotificationBuilder();
                $builder->setRecipient($adminEmail)
                        ->setDiskUsage($maxUsagePercentage)
                        ->setFreeSpace($minFreeSpace . ' MB')
                        ->setPartitions($criticalDisks)
                        ->setAdminUrl(LanInterfaces::buildAdminUrl('/admin-cabinet/system-diagnostic/index/'));

                // Queue with high priority (disk space is important but not critical like security)
                NotificationQueueHelper::queueOrSend(
                    $builder,
                    async: true,
                    priority: NotificationQueueHelper::PRIORITY_HIGH
                );
            }
        }

        return $messages;
    }

}