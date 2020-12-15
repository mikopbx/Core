<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\AdminCabinet\Providers;

use MikoPBX\AdminCabinet\Library\LanguageSelector;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * The URL component is used to generate all kind of urls in the application
 */
class LanguageSelectorProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'language';

    /**
     * Register language service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($di){
                $roSession = $di->getShared('sessionRO');
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