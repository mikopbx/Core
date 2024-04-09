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

use Generator;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvices\CheckConnection;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvices\CheckCorruptedFiles;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvices\CheckFirewalls;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvices\CheckPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvices\CheckSSHConfig;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvices\CheckStorage;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvices\CheckUpdates;
use Phalcon\Di;
use Recoil\React\ReactKernel;
use Throwable;

require_once 'Globals.php';


/**
 * WorkerPrepareAdvices is a worker class responsible for prepare system advices.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerPrepareAdvices extends WorkerBase
{
    public const ARR_ADVICE_TYPES = [
        ['type' => CheckConnection::class, 'cacheTime' => 120],
        ['type' => CheckCorruptedFiles::class, 'cacheTime' => 3600],
        ['type' => CheckPasswords::class, 'cacheTime' => 86400, 'dependent'=>PbxSettings::class],
        ['type' => CheckFirewalls::class, 'cacheTime' => 86400, 'dependent'=>PbxSettings::class],
        ['type' => CheckStorage::class, 'cacheTime' => 3600],
        ['type' => CheckUpdates::class, 'cacheTime' => 86400],
        ['type' => CheckSSHConfig::class, 'cacheTime' => 3600],
    ];

    // Array of generated advices
    public array $messages;

    /**
     * Starts processing advice types.
     *
     * @param array $argv The command-line arguments passed to the worker.
     *
     * @throws Throwable
     */
    public function start(array $argv): void
    {
        $adviceTypes = self::ARR_ADVICE_TYPES;
        // Use ReactKernel to start parallel execution
        ReactKernel::start(
            function () use ($adviceTypes) {
                // Parallel execution https://github.com/recoilphp/recoil
                foreach ($adviceTypes as $adviceType) {
                    yield $this->processAdvice($adviceType);
                }
            }
        );
    }

    /**
     * Processes advice of a specific type and caches the result.
     *
     * @param array $adviceType An array containing advice type and cache time.
     *
     * @return Generator|null A Generator object used for parallel execution.
     */
    private function processAdvice(array $adviceType): ?Generator
    {
        $start = microtime(true);
        $managedCache = $this->getDI()->getShared(ManagedCacheProvider::SERVICE_NAME);
        $currentAdviceClass = $adviceType['type'];
        $cacheKey = self::getCacheKey($currentAdviceClass);
        if (!$managedCache->has($cacheKey)) {
            // No cache - generate advice and store in cache
            try {
                $checkObj = new $currentAdviceClass();
                $newAdvice = $checkObj->process();
                $managedCache->set($cacheKey, $newAdvice, $adviceType['cacheTime']);
            } catch (\Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
            }
            $timeElapsedSecs = round(microtime(true) - $start, 2);
            if ($timeElapsedSecs > 5) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "WARNING: Service WorkerPrepareAdvices:{$adviceType['type']} processed more than {$timeElapsedSecs} seconds",
                    LOG_WARNING
                );
            }
        }
        // Yield to allow parallel execution to continue
        yield;
    }

    /**
     * Prepares redis cache key for advice type
     * @param string $currentAdviceType current advice type
     * @return string cache key
     */
    public static function getCacheKey(string $currentAdviceType): string
    {
        return 'WorkerPrepareAdvices:' . $currentAdviceType;
    }

    /**
     * Cleanup cache for all advice types after change dependent models and PBX settings
     * on the WorkerModelsEvents worker.
     * @return void
     */
    public static function afterChangePBXSettings(): void
    {
        $di = Di::getDefault();
        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        foreach (self::ARR_ADVICE_TYPES as $adviceType) {
            if (array_key_exists('dependent', $adviceType) and $adviceType['dependent'] === PbxSettings::class) {
                $cacheKey = self::getCacheKey($adviceType['type']);
                $managedCache->delete($cacheKey);
            }
        }
        Processes::processPHPWorker(WorkerPrepareAdvices::class);
    }

    /**
     * Cleanup cache for all advice types after change SSH external configuration
     * @return void
     */
    public static function afterChangeSSHConf(): void
    {
        $di = Di::getDefault();
        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        $cacheKey = self::getCacheKey(CheckSSHConfig::class);
        $managedCache->delete($cacheKey);
    }
}

// Start worker process
WorkerPrepareAdvices::startWorker($argv ?? []);