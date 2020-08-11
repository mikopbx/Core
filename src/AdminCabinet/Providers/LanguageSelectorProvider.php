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

use MikoPBX\AdminCabinet\Library\LanguageSelector;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * The URL component is used to generate all kind of urls in the application
 */
class LanguageSelectorProvider implements ServiceProviderInterface
{
    public function register(DiInterface $di): void
    {
        $di->setShared(
            'language',
            function () {
                $roSession = $this->getShared('sessionRO');
                if ($roSession !== null && array_key_exists(
                        'WebAdminLanguage',
                        $roSession
                    ) && ! empty($roSession['WebAdminLanguage'])) {
                    $language = $roSession['WebAdminLanguage'];
                } elseif (array_key_exists('HTTP_ACCEPT_LANGUAGE', $_SERVER)) {
                    $ls       = new LanguageSelector();
                    $language = $ls->getBestMatch();
                } else {
                    $language = 'en';
                }

                return $language;
            }
        );
    }
}