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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\SessionProvider;
use MikoPBX\Core\Workers\WorkerExtensionStatusMonitor;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Core\Workers\WorkerNotifyAdministrator;
use MikoPBX\Core\Workers\WorkerNotifyByEmail;
use MikoPBX\Core\Workers\WorkerPrepareAdvice;
use MikoPBX\Core\Workers\WorkerProviderStatusMonitor;
use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use MikoPBX\PBXCoreREST\Workers\WorkerBulkEmployees;
use MikoPBX\PBXCoreREST\Workers\WorkerMergeUploadedFile;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

class LanguageProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'language';
    public const string PREFERRED_LANG_WEB = 'PREFERRED_LANG_WEB';

    /**
     * Registers the language service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        // Capture $this in a variable that can be used in the closure
        $provider = $this;
        $di->setShared(self::SERVICE_NAME, function () use ($di, $provider) {
            return $provider->determineLanguage($di);
        });
    }

    /**
     * Determines the language setting based on the execution environment and specific conditions.
     *
     * @param DiInterface $di Dependency Injection container.
     * @return string Language code.
     */
    private function determineLanguage(DiInterface $di): string
    {
        if ($this->isCliEnvironment()) {
            return $this->getLanguageForCli($di);
        }

        return $this->getLanguageForWeb($di);
    }

    /**
     * Checks if the current environment is CLI.
     *
     * @return bool True if CLI, false otherwise.
     */
    private function isCliEnvironment(): bool
    {
        return php_sapi_name() === 'cli';
    }

    /**
     * Determines the language for CLI environment.
     *
     * @param DiInterface $di Dependency Injection container.
     * @return string Language code.
     */
    private function getLanguageForCli(DiInterface $di): string
    {
        $processTitle = cli_get_process_title();

        if ($this->isApiOrModelEventProcess($processTitle) || $di->has(self::PREFERRED_LANG_WEB)) {
            return PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LANGUAGE);
        }

        return PbxSettings::getValueByKey(PbxSettings::SSH_LANGUAGE);
    }

    /**
     * Checks if the process is related to API commands, model events, or other workers that send EventBus messages.
     *
     * @param string $processTitle The title of the current process.
     * @return bool True if it's a worker that should use web admin language, false otherwise.
     */
    private function isApiOrModelEventProcess(string $processTitle): bool
    {
        $eventBusWorkers = [
            WorkerApiCommands::class,
            WorkerModelsEvents::class,
            WorkerBulkEmployees::class,
            WorkerMergeUploadedFile::class,
            WorkerExtensionStatusMonitor::class,
            WorkerNotifyAdministrator::class,
            WorkerNotifyByEmail::class,
            WorkerPrepareAdvice::class,
            WorkerProviderStatusMonitor::class,
        ];

        foreach ($eventBusWorkers as $workerClass) {
            if (str_contains($processTitle, $workerClass)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determines the language for web environment.
     *
     * @param DiInterface $di Dependency Injection container.
     * @return string Language code.
     */
    private function getLanguageForWeb(DiInterface $di): string
    {
        $session = $di->getShared(SessionProvider::SERVICE_NAME);
        $language = $session->get(PbxSettings::WEB_ADMIN_LANGUAGE) ?? '';

        if (empty($language)) {
            $language = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LANGUAGE);
        }

        return $language;
    }
}
