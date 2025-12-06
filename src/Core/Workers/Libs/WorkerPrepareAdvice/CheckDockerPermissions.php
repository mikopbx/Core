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

use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * Class CheckDockerPermissions
 * This class is responsible for checking Docker volume permissions.
 * Detects when container cannot write to mounted volumes due to UID/GID mismatch.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckDockerPermissions extends Injectable
{
    /**
     * Critical paths that require write access
     */
    private const array CRITICAL_PATHS = [
        '/cf' => 'Configuration storage',
        '/storage' => 'Data storage'
    ];

    /**
     * Check Docker volume permissions status.
     *
     * @return array<string, array<int, array<string, mixed>>> An array containing warning or error messages.
     */
    public function process(): array
    {
        $messages = [];

        // Only check permissions in Docker environment
        if (!Util::isDocker()) {
            return $messages;
        }

        $currentUserId = posix_getuid();
        $currentGroupId = posix_getgid();
        $userInfo = posix_getpwuid($currentUserId);
        $userName = $userInfo['name'] ?? 'unknown';

        $hasIssues = false;
        $issueDetails = [];

        foreach (self::CRITICAL_PATHS as $path => $description) {
            if (!file_exists($path)) {
                $issueDetails[] = [
                    'path' => $path,
                    'description' => $description,
                    'issue' => 'directory_not_exists'
                ];
                $hasIssues = true;
                continue;
            }

            // Test write access by attempting to create a temporary file
            $testFile = $path . '/.write_test_' . uniqid();
            $canWrite = @file_put_contents($testFile, 'test');

            if ($canWrite === false) {
                $stat = stat($path);
                if ($stat === false) {
                    $issueDetails[] = [
                        'path' => $path,
                        'description' => $description,
                        'issue' => 'cannot_stat'
                    ];
                    $hasIssues = true;
                    continue;
                }

                $owner = posix_getpwuid($stat['uid']);
                $group = posix_getgrgid($stat['gid']);

                $issueDetails[] = [
                    'path' => $path,
                    'description' => $description,
                    'issue' => 'no_write_access',
                    'directory_uid' => $stat['uid'],
                    'directory_gid' => $stat['gid'],
                    'directory_user' => $owner['name'] ?? 'unknown',
                    'directory_group' => $group['name'] ?? 'unknown',
                    'container_uid' => $currentUserId,
                    'container_gid' => $currentGroupId,
                    'container_user' => $userName
                ];
                $hasIssues = true;
            } else {
                @unlink($testFile);
            }
        }

        if ($hasIssues) {
            // Create advice message with all issue details
            $messages['error'][] = [
                'messageTpl' => 'adv_DockerVolumePermissionIssues',
                'messageParams' => [
                    'issues' => $issueDetails,
                    'container_uid' => $currentUserId,
                    'container_gid' => $currentGroupId,
                    'container_user' => $userName
                ]
            ];
        }

        return $messages;
    }
}
