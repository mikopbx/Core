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
     * Available languages with metadata
     * Single source of truth for all web admin languages
     *
     * Structure:
     * - code: language code (ISO 639-1)
     * - name: native language name
     * - flag: Fomantic UI flag class
     * - translationKey: translation key for use in MessagesProvider (ex_Russian, ex_English, etc.)
     *
     * @var array<string, array{name: string, flag: string, translationKey: string}>
     */
    public const array AVAILABLE_LANGUAGES = [
        'en' => ['name' => 'English', 'flag' => 'united kingdom', 'translationKey' => 'ex_English'],
        'en_GB' => ['name' => 'English (UK)', 'flag' => 'united kingdom', 'translationKey' => 'ex_EnglishUK'],
        'ru' => ['name' => 'Русский', 'flag' => 'russia', 'translationKey' => 'ex_Russian'],
        'de' => ['name' => 'Deutsch', 'flag' => 'germany', 'translationKey' => 'ex_Deutsch'],
        'es' => ['name' => 'Español', 'flag' => 'spain', 'translationKey' => 'ex_Spanish'],
        'el' => ['name' => 'Ελληνικά', 'flag' => 'greece', 'translationKey' => 'ex_Greek'],
        'fr' => ['name' => 'Français', 'flag' => 'france', 'translationKey' => 'ex_French'],
        'pt' => ['name' => 'Português', 'flag' => 'portugal', 'translationKey' => 'ex_Portuguese'],
        'pt_BR' => ['name' => 'Português (Brasil)', 'flag' => 'brazil', 'translationKey' => 'ex_PortugueseBrazil'],
        'uk' => ['name' => 'Українська', 'flag' => 'ukraine', 'translationKey' => 'ex_Ukrainian'],
        'ka' => ['name' => 'ქართული', 'flag' => 'georgia', 'translationKey' => 'ex_Georgian'],
        'it' => ['name' => 'Italiano', 'flag' => 'italy', 'translationKey' => 'ex_Italian'],
        'da' => ['name' => 'Dansk', 'flag' => 'denmark', 'translationKey' => 'ex_Danish'],
        'nl' => ['name' => 'Nederlands', 'flag' => 'netherlands', 'translationKey' => 'ex_Dutch'],
        'pl' => ['name' => 'Polski', 'flag' => 'poland', 'translationKey' => 'ex_Polish'],
        'sv' => ['name' => 'Svenska', 'flag' => 'sweden', 'translationKey' => 'ex_Swedish'],
        'cs' => ['name' => 'Čeština', 'flag' => 'czech republic', 'translationKey' => 'ex_Czech'],
        'tr' => ['name' => 'Türkçe', 'flag' => 'turkey', 'translationKey' => 'ex_Turkish'],
        'ja' => ['name' => '日本語', 'flag' => 'japan', 'translationKey' => 'ex_Japanese'],
        'vi' => ['name' => 'Tiếng Việt', 'flag' => 'vietnam', 'translationKey' => 'ex_Vietnamese'],
        'az' => ['name' => 'Azərbaycan', 'flag' => 'azerbaijan', 'translationKey' => 'ex_Azerbaijan'],
        'ro' => ['name' => 'Română', 'flag' => 'romania', 'translationKey' => 'ex_Romanian'],
        'th' => ['name' => 'ไทย', 'flag' => 'thailand', 'translationKey' => 'ex_Thai'],
        'hu' => ['name' => 'Magyar', 'flag' => 'hungary', 'translationKey' => 'ex_Hungarian'],
        'fi' => ['name' => 'Suomi', 'flag' => 'finland', 'translationKey' => 'ex_Finnish'],
        'hr' => ['name' => 'Hrvatski', 'flag' => 'croatia', 'translationKey' => 'ex_Croatian'],
        'zh_Hans' => ['name' => '中文', 'flag' => 'china', 'translationKey' => 'ex_Chinese'],
    ];

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
     * Priority:
     * 1. JWT token payload (for authenticated users)
     * 2. System settings (default fallback)
     *
     * @param DiInterface $di Dependency Injection container.
     * @return string Language code.
     */
    private function getLanguageForWeb(DiInterface $di): string
    {
        // Check JWT token first (for authenticated users)
        if ($di->has('request')) {
            $request = $di->getShared('request');
            if (method_exists($request, 'getJwtPayload')) {
                $jwtPayload = $request->getJwtPayload();
                if ($jwtPayload !== null && isset($jwtPayload['language']) && is_string($jwtPayload['language'])) {
                    return $jwtPayload['language'];
                }
            }
        }

        // Fall back to system settings
        return PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LANGUAGE);
    }
}
