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


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Url;

/**
 * The URL component is used to generate all kinds of URLs in the application.
 *
 * @package MikoPBX\Common\Providers
 */
class UrlProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'url';

    /**
     * Register the URL service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $baseUri = $di->getShared(ConfigProvider::SERVICE_NAME)->path('adminApplication.baseUri');
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($baseUri) {
                $url = new Url();
                $url->setBaseUri($baseUri);

                return $url;
            }
        );
    }
}