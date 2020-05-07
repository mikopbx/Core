<?php
declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\AdminCabinet\Providers;


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use function MikoPBX\Common\Config\appPath;

class AppMessagesProvider implements ServiceProviderInterface
{

    /**
     * @inheritDoc
     */
    public function register(DiInterface $di):void
    {
        $coreConfig = $di->getShared('config')->get('core');
        $di->setShared('messages', function () use ($di, $coreConfig) {
            $language = $di->getLanguage();
            $messages = [];
            // Заглянем сначала в кеш переводов
            $session  = $this->get('session');
            $cacheKey = false;
            if ($session !== null && $session->has('versionHash')) {
                $cacheKey = 'LocalisationArray' . $session->get('versionHash') . $language . '.php';
            }
            if ($cacheKey) {
                $translates = $this->get('managedCache')->get($cacheKey, 3600);
                if ( is_array($translates)) {
                    return $translates;
                }
            }

            $translates = [];
            // Возьмем английский интерфейс
            $enFilePath = appPath('/src/AdminCabinet/Messages/en.php');
            if (file_exists($enFilePath)) {
                $translates = require $enFilePath;
            }


            if ($language !== 'en') {
                $additionalTranslates = [];
                // Check if we have a translation file for that lang
                $langFile =  appPath("/src/AdminCabinet/Messages/{$language}.php");
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
            $results              = glob($coreConfig->modulesDir . '/*/{messages}/en.php', GLOB_BRACE);
            foreach ($results as $path) {
                $langArr = require $path;
                if (is_array($langArr)) {
                    $extensionsTranslates[] = $langArr;
                } else {
                    $extensionsTranslates[] = $messages; // Поддержка старых модулей
                }
            }
            if ($extensionsTranslates !== [[]]) {
                $translates = array_merge($translates, ...$extensionsTranslates);
            }
            if ($language !== 'en') {
                $additionalTranslates = [[]];
                $results              = glob($coreConfig->modulesDir . "/*/{messages}/{$language}.php",
                    GLOB_BRACE);
                foreach ($results as $path) {
                    $langArr = require $path;
                    if (is_array($langArr)) {
                        $additionalTranslates[] = $langArr;
                    } else {
                        $additionalTranslates[] = $messages; // Поддержка старых модулей
                    }
                }
                if ($additionalTranslates !== [[]]) {
                    $translates = array_merge($translates, ...$additionalTranslates);
                }
            }
            if ($cacheKey) {
                $this->get('managedCache')->set($cacheKey, $translates);
            }

            // Return a translation object
            return $translates;
        });
    }
}