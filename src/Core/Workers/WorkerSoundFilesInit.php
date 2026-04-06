<?php

declare(strict_types=1);

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

namespace MikoPBX\Core\Workers;

require_once 'Globals.php';

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\{PBX, SystemMessages, Directories};
use MikoPBX\Core\System\Configs\SoundFilesConf;
use Phalcon\Di\Di;
use Redis;

/**
 * WorkerSoundFilesInit - Background worker for sound files initialization and conversion
 *
 * This worker runs periodically to:
 * 1. Initialize base language sound files
 * 2. Reinstall sound files for enabled modules
 * 3. Perform background format conversion
 *
 * Uses Redis caching with version tracking to skip work when already completed.
 * Cache is invalidated when PBX version changes or module is enabled/updated.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerSoundFilesInit extends WorkerBase
{
    /**
     * TTL for cache keys (24 hours)
     */
    private const int CACHE_TTL = 86400;

    /**
     * Worker check interval (seconds)
     * Worker runs every 5 minutes but skips work if cache is valid
     */
    public static function getCheckInterval(): int
    {
        return 300;
    }

    /**
     * Start the worker
     *
     * @param array $argv Command line arguments
     * @return void
     */
    public function start(array $argv): void
    {
        // Wait for system to be fully booted
        SystemMessages::sysLogMsg(static::class, 'Waiting for system to boot...', LOG_INFO);
        PBX::waitFullyBooted();

        // Quick check - if all work is done, exit immediately
        if ($this->isAllWorkCompleted()) {
            SystemMessages::sysLogMsg(static::class, 'All sound files already converted (cached), skipping', LOG_DEBUG);
            exit(0);
        }

        SystemMessages::sysLogMsg(static::class, 'Starting sound files initialization...', LOG_INFO);

        // Set process priority to lowest (nice 19 = minimal CPU priority)
        pcntl_setpriority(19);

        try {
            $soundFilesConf = new SoundFilesConf();
            $result = $soundFilesConf->start();

            if ($result) {
                SystemMessages::sysLogMsg(static::class, 'Sound files initialization completed successfully', LOG_INFO);

                // Now convert all sound files in one batch (synchronously within worker)
                SystemMessages::sysLogMsg(static::class, 'Starting sound files format conversion...', LOG_INFO);

                $soundsDir = Directories::getDir(Directories::AST_SOUNDS_DIR);
                SoundFilesConf::convertAllSoundFiles($soundsDir);
                SystemMessages::sysLogMsg(static::class, 'Sound files conversion completed', LOG_INFO);

                // Mark all work as completed in cache
                $this->markAllWorkCompleted();
            } else {
                SystemMessages::sysLogMsg(static::class, 'Sound files initialization completed with warnings', LOG_WARNING);
            }
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                'Sound files initialization failed: ' . $e->getMessage(),
                LOG_ERR
            );
        }

        // Worker completes after one run - exit gracefully
        SystemMessages::sysLogMsg(static::class, 'Worker completed, exiting', LOG_INFO);

        // Exit immediately to prevent WorkerBase from keeping process alive
        exit(0);
    }

    /**
     * Check if all sound conversion work is already completed
     *
     * Verifies cache markers for:
     * - System sounds (by PBX version)
     * - Each enabled module (by cache key existence)
     *
     * @return bool True if all work completed and cached
     */
    private function isAllWorkCompleted(): bool
    {
        $redis = $this->getRedis();
        if ($redis === null) {
            return false;
        }

        // Check system sounds
        $systemData = $redis->get(SoundFilesConf::REDIS_SYSTEM_SOUNDS_KEY);
        if ($systemData === false) {
            SystemMessages::sysLogMsg(static::class, 'System sounds cache not found', LOG_DEBUG);
            return false;
        }

        $data = json_decode($systemData, true);
        $currentVersion = PbxSettings::getValueByKey(PbxSettings::PBX_VERSION);
        if (!isset($data['version']) || $data['version'] !== $currentVersion) {
            SystemMessages::sysLogMsg(
                static::class,
                "System sounds version mismatch: cached={$data['version']}, current={$currentVersion}",
                LOG_DEBUG
            );
            return false;
        }

        // Check enabled modules - only check key existence (invalidated on enable/update)
        $enabledModules = PbxExtensionModules::getEnabledModulesArray();
        foreach ($enabledModules as $module) {
            $moduleId = $module['uniqid'];
            $moduleKey = SoundFilesConf::REDIS_MODULE_SOUNDS_PREFIX . $moduleId;

            if (!$redis->exists($moduleKey)) {
                SystemMessages::sysLogMsg(static::class, "Module $moduleId cache not found", LOG_DEBUG);
                return false;
            }
        }

        return true;
    }

    /**
     * Mark all conversion work as completed in cache
     *
     * Saves version markers with TTL for:
     * - System sounds (with PBX version)
     * - Each enabled module (presence marker)
     */
    private function markAllWorkCompleted(): void
    {
        $redis = $this->getRedis();
        if ($redis === null) {
            return;
        }

        // Mark system sounds with version
        $currentVersion = PbxSettings::getValueByKey(PbxSettings::PBX_VERSION);
        $systemData = json_encode([
            'version' => $currentVersion,
            'completed_at' => time(),
        ]);
        $redis->setex(SoundFilesConf::REDIS_SYSTEM_SOUNDS_KEY, self::CACHE_TTL, $systemData);
        SystemMessages::sysLogMsg(static::class, "Marked system sounds completed for version $currentVersion", LOG_DEBUG);

        // Mark enabled modules (simple presence marker)
        $enabledModules = PbxExtensionModules::getEnabledModulesArray();
        foreach ($enabledModules as $module) {
            $moduleId = $module['uniqid'];
            $moduleKey = SoundFilesConf::REDIS_MODULE_SOUNDS_PREFIX . $moduleId;

            $moduleData = json_encode([
                'completed_at' => time(),
            ]);
            $redis->setex($moduleKey, self::CACHE_TTL, $moduleData);
            SystemMessages::sysLogMsg(static::class, "Marked module $moduleId sounds completed", LOG_DEBUG);
        }
    }

    /**
     * Get Redis connection
     *
     * @return Redis|null
     */
    private function getRedis(): ?Redis
    {
        try {
            $di = Di::getDefault();
            if ($di === null) {
                return null;
            }
            return $di->getShared('redis');
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(static::class, 'Failed to get Redis: ' . $e->getMessage(), LOG_WARNING);
            return null;
        }
    }
}

// Start the worker
WorkerSoundFilesInit::startWorker($argv ?? []);
