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

use MikoPBX\Common\Providers\LanguageProvider;
use MikoPBX\Common\Providers\ModulesDBConnectionsProvider;
use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Lib\LicenseManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Modules\DisableModuleAction;
use MikoPBX\PBXCoreREST\Lib\Modules\EnableModuleAction;
use MikoPBX\PBXCoreREST\Lib\Modules\ModuleInstallationBase;
use MikoPBX\PBXCoreREST\Lib\Modules\UninstallModuleAction;
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
 *   php -f WorkerModuleStateRunner.php start install <moduleUniqueId> <resultFile>
 *   php -f WorkerModuleStateRunner.php start uninstall <moduleUniqueId> <resultFile> <keepSettings 0|1>
 *   php -f WorkerModuleStateRunner.php start captureFeature <moduleUniqueId> <resultFile> <releaseInfoJson>
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
     * Redis TTL of the manipulation mutex held around module code.
     * INVARIANT: must exceed the longest orchestrator child-step timeout
     * (WorkerModuleOperations::CHILD_STEP_TIMEOUT / UNINSTALL_STEP_TIMEOUT)
     * plus the acquire wait — otherwise the lock expires mid-execution and
     * reopens the concurrency hole it exists to close.
     */
    public const int MUTEX_TTL_SEC = 220;

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

        $knownCommands = ['enable', 'disable', 'install', 'uninstall', 'captureFeature'];
        if ($moduleUniqueId === '' || $resultFile === '' || !in_array($command, $knownCommands, true)) {
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
            if ($command === 'captureFeature') {
                // License capture: no module code, no mutex needed
                $res = $this->captureFeature((string)($argv[5] ?? ''));
            } else {
                // Transitional guard: the legacy install pipeline still
                // serializes on this mutex; holding it here prevents module
                // hooks from ever running concurrently with a legacy phase.
                $mutex = $this->di->get(MutexProvider::SERVICE_NAME);
                $res = $mutex->synchronized(
                    ModuleInstallationBase::MODULE_MANIPULATION_MUTEX_KEY,
                    function () use ($command, $moduleUniqueId, $argv): PBXApiResult {
                        switch ($command) {
                            case 'enable':
                                // No async channel: browser notifications are the orchestrator's job
                                return EnableModuleAction::enableModule($moduleUniqueId);
                            case 'install':
                                return $this->installModule($moduleUniqueId);
                            case 'uninstall':
                                // Includes disable of an enabled module. Its
                                // intermediate stage pushes go nowhere (empty
                                // channel, no journal context) — only syslog;
                                // the orchestrator's Stage_VII carries the result
                                $keepSettings = ($argv[5] ?? '0') === '1';
                                $uninstaller = new UninstallModuleAction('', $moduleUniqueId, $keepSettings);
                                return $uninstaller->uninstallModule();
                            default:
                                $reason = $argv[5] ?? '';
                                $reasonText = $argv[6] ?? '';
                                return DisableModuleAction::disableModule($moduleUniqueId, $reason, $reasonText);
                        }
                    },
                    10,
                    self::MUTEX_TTL_SEC
                );
            }
        } catch (Throwable $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
        }

        file_put_contents(
            $resultFile,
            json_encode($res->getResult(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );
    }

    /**
     * Captures the license feature for a module release. The license client
     * is compiled code with unmanaged timeouts — that is exactly why it runs
     * here, under the orchestrator's child timeout.
     */
    private function captureFeature(string $releaseInfoJson): PBXApiResult
    {
        $releaseInfo = json_decode($releaseInfoJson, true);
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        if (!is_array($releaseInfo)) {
            $res->success = false;
            $res->messages['error'][] = 'Invalid release info for license capture';
            return $res;
        }
        return LicenseManagementProcessor::callBack([
            'action' => 'captureFeatureForProductId',
            'data' => $releaseInfo,
        ]);
    }

    /**
     * Runs Setup::installModule() of the NEW module code already swapped into
     * the live directory. Mirrors the legacy WorkerModuleInstaller setup phase.
     */
    private function installModule(string $moduleUniqueId): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $moduleDir = PbxExtensionUtils::getModuleDir($moduleUniqueId);
        ModulesDBConnectionsProvider::recreateModulesDBConnections();
        Util::addRegularWWWRights($moduleDir);

        $setupClass = "Modules\\$moduleUniqueId\\Setup\\PbxExtensionSetup";
        if (!class_exists($setupClass) || !method_exists($setupClass, 'installModule')) {
            $res->success = false;
            $res->messages['error'][] = "Install error: the class $setupClass does not exist";
            return $res;
        }

        // Use the web admin language so installation errors are localized
        $this->di->set(LanguageProvider::PREFERRED_LANG_WEB, true);

        $setup = new $setupClass($moduleUniqueId);
        $res->success = (bool)$setup->installModule();
        if (!$res->success) {
            $errorMessage = trim(implode(' ', $setup->getMessages()));
            if ($errorMessage === '') {
                $errorMessage = "Module $moduleUniqueId installation failed without a specific error message.";
            }
            $res->messages['error'][] = $errorMessage;
        }
        return $res;
    }
}

// Start the worker process
WorkerModuleStateRunner::startWorker($argv ?? []);
