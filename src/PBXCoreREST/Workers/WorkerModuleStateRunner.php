<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Workers;

require_once 'Globals.php';

use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\PBXCoreREST\Lib\Modules\DisableModuleAction;
use MikoPBX\PBXCoreREST\Lib\Modules\EnableModuleAction;
use MikoPBX\PBXCoreREST\Lib\Modules\ModuleInstallationBase;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Throwable;

/**
 * Class WorkerModuleStateRunner
 *
 * Short-lived child process that executes MODULE code (enable/disable hooks,
 * license client calls inside PbxExtensionState) in isolation from the
 * orchestrator: a fatal error or endless hang inside a module can then never
 * kill or freeze WorkerModuleOperations — the parent keeps its heartbeat
 * ticking and applies its own timeout.
 *
 * Usage:
 *   php -f WorkerModuleStateRunner.php start enable  <moduleUniqueId> <resultFile>
 *   php -f WorkerModuleStateRunner.php start disable <moduleUniqueId> <resultFile> [reason] [reasonText]
 *
 * The PBXApiResult::getResult() array is written to resultFile as JSON.
 * Exit code 0 means the result file is valid, regardless of the operation
 * outcome (which is carried inside the JSON).
 *
 * @package MikoPBX\PBXCoreREST\Workers
 */
class WorkerModuleStateRunner extends WorkerBase
{
    /**
     * Runs the requested module state change and stores the result as JSON.
     *
     * @param array $argv The command-line arguments passed to the worker.
     */
    public function start(array $argv): void
    {
        $command = $argv[2] ?? '';
        $moduleUniqueId = $argv[3] ?? '';
        $resultFile = $argv[4] ?? '';

        if ($moduleUniqueId === '' || $resultFile === '' || !in_array($command, ['enable', 'disable'], true)) {
            SystemMessages::sysLogMsg(__CLASS__, 'Invalid arguments: ' . implode(' ', $argv), LOG_ERR);
            exit(1);
        }

        // Own session/group: the orchestrator group-kills this pgid on
        // timeout, taking any grandchildren spawned by module hooks with it.
        if (posix_setsid() === -1) {
            SystemMessages::sysLogMsg(__CLASS__, 'posix_setsid() failed', LOG_WARNING);
        }
        cli_set_process_title(__CLASS__ . '-' . $moduleUniqueId);

        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        try {
            // Transitional guard: the legacy install pipeline still serializes
            // on this mutex; holding it here prevents module hooks from ever
            // running concurrently with a legacy install/uninstall phase.
            $mutex = $this->di->get(MutexProvider::SERVICE_NAME);
            $res = $mutex->synchronized(
                ModuleInstallationBase::MODULE_MANIPULATION_MUTEX_KEY,
                function () use ($command, $moduleUniqueId, $argv): PBXApiResult {
                    if ($command === 'enable') {
                        // No async channel: browser notifications are the orchestrator's job
                        return EnableModuleAction::enableModule($moduleUniqueId);
                    }
                    $reason = $argv[5] ?? '';
                    $reasonText = $argv[6] ?? '';
                    return DisableModuleAction::disableModule($moduleUniqueId, $reason, $reasonText);
                },
                10,
                150
            );
        } catch (Throwable $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
        }

        file_put_contents(
            $resultFile,
            json_encode($res->getResult(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );
    }
}

// Start the worker process
WorkerModuleStateRunner::startWorker($argv ?? []);
