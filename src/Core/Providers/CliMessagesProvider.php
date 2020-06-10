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

use function MikoPBX\Common\Config\appPath;

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
        $di->setShared(
            'messages',
            function () {
                $messages = [];
                try {
                    $conf     = new MikoPBXConfig();
                    $language = $conf->getGeneralSettings('SSHLanguage');
                } catch (Exception $e) {
                    $language = 'en-en';
                }
                $translationsPath = appPath('src/Core/Messages');
                if (empty($_ENV['SSH_CLIENT']) && file_exists("{$translationsPath}/{$language}.php")) {
                    require "{$translationsPath}/{$language}.php";
                } else {
                    require "{$translationsPath}/en-en.php";
                }

                return $messages;
            }
        );
    }
}