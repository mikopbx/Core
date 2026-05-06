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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\ModulesManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use Throwable;

/**
 * Server-side batch updater for installed modules.
 */
class UpdateAllModulesAction extends Injectable
{
    public const string BATCH_KEY_PREFIX = 'module:update_batch:';
    public const string ACTIVE_BATCH_KEY = 'module:update_batch:active';
    public const int BATCH_TTL = 3600;

    private const string STAGE_BATCH_STARTED = 'BatchStarted';
    private const string STAGE_BATCH_MODULE_STARTED = 'BatchModuleStarted';
    private const string STAGE_BATCH_MODULE_COMPLETED = 'BatchModuleCompleted';
    private const string STAGE_BATCH_MODULE_FAILED = 'BatchModuleFailed';
    private const string STAGE_BATCH_FINISHED = 'BatchFinished';

    /**
     * Start a batch module update and enqueue the first module.
     *
     * @param string $asyncChannelId Browser EventBus channel.
     * @param array $modulesForUpdate Requested module uniqids.
     *
     * @return PBXApiResult
     */
    public static function main(string $asyncChannelId, array $modulesForUpdate): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $batchId = uniqid('update-all-', true);
        $modules = self::filterInstalledModules($modulesForUpdate);
        if (empty($modules)) {
            $res->messages['error'][] = 'No installed modules selected for update';
            self::publishBatchEvent($asyncChannelId, self::STAGE_BATCH_FINISHED, $batchId, [
                'result' => false,
                'total' => 0,
                'completed' => [],
                'failed' => ['batch' => $res->messages],
            ]);
            return $res;
        }

        if (!self::acquireBatchLock($batchId)) {
            $res->messages['error'][] = 'Another module update batch is already running';
            self::publishBatchEvent($asyncChannelId, self::STAGE_BATCH_FINISHED, $batchId, [
                'result' => false,
                'total' => 0,
                'completed' => [],
                'failed' => ['batch' => $res->messages],
            ]);
            return $res;
        }

        $state = [
            'batchId' => $batchId,
            'asyncChannelId' => $asyncChannelId,
            'status' => 'running',
            'total' => count($modules),
            'current' => 0,
            'pending' => $modules,
            'processing' => null,
            'completed' => [],
            'failed' => [],
            'startedAt' => time(),
            'updatedAt' => time(),
        ];

        try {
            self::saveBatchState($batchId, $state);
            self::publishBatchEvent($asyncChannelId, self::STAGE_BATCH_STARTED, $batchId, [
                'total' => $state['total'],
                'modules' => $modules,
            ]);
            self::startNextModule($batchId);

            $res->success = true;
            $res->data = [
                'batchId' => $batchId,
                'total' => $state['total'],
                'modules' => $modules,
            ];
        } catch (Throwable $e) {
            // Never leave the active-batch marker behind on a startup failure.
            self::releaseBatchLock($batchId);
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
            self::publishBatchEvent($asyncChannelId, self::STAGE_BATCH_FINISHED, $batchId, [
                'result' => false,
                'total' => $state['total'],
                'completed' => [],
                'failed' => ['batch' => ['error' => [$e->getMessage()]]],
            ]);
        }

        return $res;
    }

    /**
     * Mark a batch module as completed and enqueue the next module.
     */
    public static function completeModule(string $batchId, string $moduleUniqueId, array $messages = []): void
    {
        self::finishModule($batchId, $moduleUniqueId, true, $messages);
    }

    /**
     * Mark a batch module as failed and enqueue the next module.
     */
    public static function failModule(string $batchId, string $moduleUniqueId, array $messages = []): void
    {
        self::finishModule($batchId, $moduleUniqueId, false, $messages);
    }

    /**
     * Get current batch state from Redis.
     */
    private static function getBatchState(string $batchId): array
    {
        $redis = Di::getDefault()->get(RedisClientProvider::SERVICE_NAME);
        $rawState = $redis->get(self::BATCH_KEY_PREFIX . $batchId);
        if (!is_string($rawState) || $rawState === '') {
            return [];
        }

        $state = json_decode($rawState, true);
        return is_array($state) ? $state : [];
    }

    /**
     * Save batch state to Redis.
     */
    private static function saveBatchState(string $batchId, array $state): void
    {
        $state['updatedAt'] = time();
        $redis = Di::getDefault()->get(RedisClientProvider::SERVICE_NAME);
        $redis->setex(
            self::BATCH_KEY_PREFIX . $batchId,
            self::BATCH_TTL,
            json_encode($state, JSON_UNESCAPED_SLASHES)
        );
    }

    /**
     * Finish one module in the batch and continue or close the batch.
     */
    private static function finishModule(
        string $batchId,
        string $moduleUniqueId,
        bool $success,
        array $messages = []
    ): void {
        $state = self::getBatchState($batchId);
        if (empty($state)) {
            SystemMessages::sysLogMsg(
                self::class,
                "Cannot update module batch state, batch {$batchId} was not found",
                LOG_WARNING
            );
            return;
        }

        // Idempotency: the same module can be reported twice when both
        // InstallFromRepoAction::start() and processModulePostInstallations()
        // funnel through here. Without this guard, a duplicate completion would
        // pop another module off `pending` and double-enqueue it.
        $alreadyCompleted = in_array($moduleUniqueId, $state['completed'] ?? [], true);
        $alreadyFailed = array_key_exists($moduleUniqueId, $state['failed'] ?? []);
        if ($alreadyCompleted || $alreadyFailed) {
            return;
        }
        if (($state['processing'] ?? null) !== null && $state['processing'] !== $moduleUniqueId) {
            SystemMessages::sysLogMsg(
                self::class,
                sprintf(
                    'Batch %s: ignoring out-of-order completion for %s while processing %s',
                    $batchId,
                    $moduleUniqueId,
                    $state['processing']
                ),
                LOG_WARNING
            );
            return;
        }

        $asyncChannelId = (string)($state['asyncChannelId'] ?? '');
        $state['processing'] = null;
        if ($success) {
            if (!in_array($moduleUniqueId, $state['completed'], true)) {
                $state['completed'][] = $moduleUniqueId;
            }
            self::publishBatchEvent($asyncChannelId, self::STAGE_BATCH_MODULE_COMPLETED, $batchId, [
                'moduleUniqueId' => $moduleUniqueId,
                'current' => count($state['completed']) + count($state['failed']),
                'total' => $state['total'],
                'messages' => $messages,
            ], $moduleUniqueId);
        } else {
            $state['failed'][$moduleUniqueId] = $messages;
            self::publishBatchEvent($asyncChannelId, self::STAGE_BATCH_MODULE_FAILED, $batchId, [
                'moduleUniqueId' => $moduleUniqueId,
                'current' => count($state['completed']) + count($state['failed']),
                'total' => $state['total'],
                'messages' => $messages,
            ], $moduleUniqueId);
        }

        self::saveBatchState($batchId, $state);
        self::startNextModule($batchId);
    }

    /**
     * Start the next module update or finish the batch.
     */
    private static function startNextModule(string $batchId): void
    {
        $state = self::getBatchState($batchId);
        if (empty($state) || ($state['status'] ?? '') !== 'running') {
            return;
        }

        $asyncChannelId = (string)($state['asyncChannelId'] ?? '');
        $nextModule = array_shift($state['pending']);
        if ($nextModule === null) {
            $state['status'] = 'finished';
            $state['finishedAt'] = time();
            self::saveBatchState($batchId, $state);
            self::releaseBatchLock($batchId);
            self::publishBatchEvent($asyncChannelId, self::STAGE_BATCH_FINISHED, $batchId, [
                'result' => empty($state['failed']),
                'total' => $state['total'],
                'completed' => $state['completed'],
                'failed' => $state['failed'],
            ]);
            return;
        }

        $state['current'] = (int)$state['current'] + 1;
        $state['processing'] = $nextModule;
        self::saveBatchState($batchId, $state);

        self::publishBatchEvent($asyncChannelId, self::STAGE_BATCH_MODULE_STARTED, $batchId, [
            'moduleUniqueId' => $nextModule,
            'current' => $state['current'],
            'total' => $state['total'],
        ], $nextModule);
        self::enqueueInstallFromRepo($asyncChannelId, $nextModule, $batchId);
    }

    /**
     * Enqueue one regular installFromRepo action for WorkerApiCommands.
     */
    private static function enqueueInstallFromRepo(string $asyncChannelId, string $moduleUniqueId, string $batchId): void
    {
        try {
            $redis = Di::getDefault()->get(RedisClientProvider::SERVICE_NAME);
            $requestMessage = [
                'processor' => ModulesManagementProcessor::class,
                'data' => [
                    'uniqid' => $moduleUniqueId,
                    'releaseId' => 0,
                    'batchId' => $batchId,
                ],
                'action' => 'installFromRepo',
                'async' => true,
                'asyncChannelId' => $asyncChannelId,
                'request_id' => uniqid('req_installFromRepo_', true),
                'created_at' => microtime(true),
                'debug' => false,
                'httpMethod' => 'POST',
            ];

            $redis->rpush(WorkerApiCommands::REDIS_API_QUEUE, json_encode($requestMessage, JSON_UNESCAPED_SLASHES));
        } catch (Throwable $e) {
            self::failModule($batchId, $moduleUniqueId, ['error' => [$e->getMessage()]]);
        }
    }

    /**
     * Publish a batch progress event.
     */
    private static function publishBatchEvent(
        string $asyncChannelId,
        string $stage,
        string $batchId,
        array $stageDetails,
        string $moduleUniqueId = ''
    ): void {
        if ($asyncChannelId === '') {
            return;
        }

        $message = [
            'stage' => $stage,
            'batchId' => $batchId,
            'batchMode' => true,
            'stageDetails' => $stageDetails,
            'pid' => posix_getpid(),
        ];
        if ($moduleUniqueId !== '') {
            $message['moduleUniqueId'] = $moduleUniqueId;
        }

        Di::getDefault()->get(EventBusProvider::SERVICE_NAME)->publish($asyncChannelId, $message);
    }

    /**
     * Prevent overlapping bulk module updates.
     */
    private static function acquireBatchLock(string $batchId): bool
    {
        $redis = Di::getDefault()->get(RedisClientProvider::SERVICE_NAME);
        // Atomic SET NX EX — guarantees TTL even if the worker dies between calls.
        return $redis->set(self::ACTIVE_BATCH_KEY, $batchId, ['NX', 'EX' => self::BATCH_TTL]) === true;
    }

    /**
     * Release the active batch marker.
     */
    private static function releaseBatchLock(string $batchId): void
    {
        $redis = Di::getDefault()->get(RedisClientProvider::SERVICE_NAME);
        // Compare-and-delete via Lua: avoid clobbering a lock acquired by another batch
        // after our TTL expired.
        $script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
        $redis->eval($script, [self::ACTIVE_BATCH_KEY, $batchId], 1);
    }

    /**
     * Keep only installed module IDs and remove duplicates.
     */
    private static function filterInstalledModules(array $modulesForUpdate): array
    {
        $requestedModules = [];
        foreach ($modulesForUpdate as $moduleUniqueId) {
            if (!is_string($moduleUniqueId) || $moduleUniqueId === '') {
                continue;
            }
            $requestedModules[$moduleUniqueId] = true;
        }

        if (empty($requestedModules)) {
            return [];
        }

        $installedModules = PbxExtensionModules::find([
            'columns' => ['uniqid'],
            'conditions' => 'uniqid IN ({uniqid:array})',
            'bind' => ['uniqid' => array_keys($requestedModules)],
        ]);

        $installedSet = [];
        foreach ($installedModules as $module) {
            $installedSet[$module->uniqid] = true;
        }

        $modules = [];
        foreach (array_keys($requestedModules) as $moduleUniqueId) {
            if (isset($installedSet[$moduleUniqueId])) {
                $modules[] = $moduleUniqueId;
            }
        }

        return $modules;
    }
}
