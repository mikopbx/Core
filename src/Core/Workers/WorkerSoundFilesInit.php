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

use MikoPBX\Core\System\{PBX, SystemMessages, Directories};
use MikoPBX\Core\System\Configs\SoundFilesConf;

/**
 * WorkerSoundFilesInit - Background worker for sound files initialization and conversion
 *
 * This worker runs once after system boot to:
 * 1. Initialize base language sound files
 * 2. Reinstall sound files for enabled modules
 * 3. Perform background format conversion
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerSoundFilesInit extends WorkerBase
{
    /**
     * Worker check interval (seconds)
     * Set to 0 to disable periodic checks - this is a one-shot worker
     */
    public static function getCheckInterval(): int
    {
        return 0; // One-shot worker, no periodic checks needed
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

        SystemMessages::sysLogMsg(static::class, 'Starting sound files initialization...', LOG_INFO);

        try {
            $soundFilesConf = new SoundFilesConf();
            $result = $soundFilesConf->start();

            if ($result) {
                SystemMessages::sysLogMsg(static::class, 'Sound files initialization completed successfully', LOG_INFO);

                // Now convert all sound files in one batch (synchronously within worker)
                SystemMessages::sysLogMsg(static::class, 'Starting sound files format conversion with low CPU priority...', LOG_INFO);

                // Set process priority to lowest (nice 19 = minimal CPU priority)
                pcntl_setpriority(19);

                $soundsDir = Directories::getDir(Directories::AST_SOUNDS_DIR);
                SoundFilesConf::convertAllSoundFiles($soundsDir);
                SystemMessages::sysLogMsg(static::class, 'Sound files conversion completed', LOG_INFO);
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
}

// Start the worker
WorkerSoundFilesInit::startWorker($argv ?? []);
