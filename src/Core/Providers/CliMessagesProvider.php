<?php

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\Core\Providers;


use Exception;
use MikoPBX\Core\System\MikoPBXConfig;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Array of translations is created based on the translations files
 */
class CliMessagesProvider implements ServiceProviderInterface
{
    /**
     * Register messages service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $coreConfig = $di->getShared('config')->get('core');
        $di->setShared(
            'messages',
            function () use ($coreConfig) {
                $messages = [];
                try {
                    $conf     = new MikoPBXConfig();
                    $language = $conf->getGeneralSettings('SSHLanguage');
                } catch (Exception $e) {
                    $language = 'en-en';
                }
                if (empty($_ENV['SSH_CLIENT']) && file_exists("{$coreConfig->translationsPath}{$language}.php")) {
                    require "{$coreConfig->translationsPath}{$language}.php";
                } else {
                    require "{$coreConfig->translationsPath}en-en.php";
                }

                return $messages;
            }
        );
    }
}