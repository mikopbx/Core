<?php

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\Common\Providers;

use MikoPBX\PBXCoreREST\Workers\WorkerApiCommands;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use MikoPBX\Common\Models\PbxSettings;

use function MikoPBX\Common\Config\appPath;

class MessagesProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'messages';


    /**
     * Register messages service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $coreConfig = $di->getShared('config')->path('core');
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($di, $coreConfig) {
                $cacheKey = false;
                if (php_sapi_name() === 'cli'){
                    if (cli_get_process_title()=== WorkerApiCommands::class){
                        $language = PbxSettings::getValueByKey('WebAdminLanguage');
                    } elseif (!empty($_ENV['SSH_CLIENT'])) {
                        $language = 'en';
                    } else {
                        $language = PbxSettings::getValueByKey('SSHLanguage');
                    }
                } else {
                    $language = $di->get('language');
                    $session  = $di->get('session');
                    if ($session !== null && $session->has('versionHash')) {
                        $cacheKey = 'LocalisationArray' . $session->get('versionHash') . $language . '.php';
                    }
                }

                $messages = [];
                // Заглянем сначала в кеш переводов
                if ($cacheKey) {
                    $translates = $di->get('managedCache')->get($cacheKey, 3600);
                    if (is_array($translates)) {
                        return $translates;
                    }
                }

                $translates = [];
                // Возьмем английский интерфейс
                $enFilePath = appPath('/src/Common/Messages/en.php');
                if (file_exists($enFilePath)) {
                    $translates = require $enFilePath;
                }

                if ($language !== 'en') {
                    $additionalTranslates = [];
                    // Check if we have a translation file for that lang
                    $langFile = appPath("/src/Common/Messages/{$language}.php");
                    if (file_exists($langFile)) {
                        $additionalTranslates = require $langFile;
                    }
                    // Заменим английские переводы на выбранный админом язык
                    if ($additionalTranslates !== [[]]) {
                        $translates = array_merge($translates, $additionalTranslates);
                    }
                }

                // Возьмем английский перевод расширений
                $extensionsTranslates = [[]];
                $results              = glob($coreConfig->modulesDir . '/*/{Messages}/en.php', GLOB_BRACE);
                foreach ($results as $path) {
                    $langArr = require $path;
                    if (is_array($langArr)) {
                        $extensionsTranslates[] = $langArr;
                    }
                }
                if ($extensionsTranslates !== [[]]) {
                    $translates = array_merge($translates, ...$extensionsTranslates);
                }
                if ($language !== 'en') {
                    $additionalTranslates = [[]];
                    $results              = glob(
                        $coreConfig->modulesDir . "/*/{Messages}/{$language}.php",
                        GLOB_BRACE
                    );
                    foreach ($results as $path) {
                        $langArr = require $path;
                        if (is_array($langArr)) {
                            $additionalTranslates[] = $langArr;
                        }
                    }
                    if ($additionalTranslates !== [[]]) {
                        $translates = array_merge($translates, ...$additionalTranslates);
                    }
                }
                if ($cacheKey) {
                    $di->get('managedCache')->set($cacheKey, $translates);
                }

                // Return a translation object
                return $translates;
            }
        );
    }
}