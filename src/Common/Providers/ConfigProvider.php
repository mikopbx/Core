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

use Phalcon\Config;
use Phalcon\Config\Adapter\Json;
use Phalcon\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Exception;
use Throwable;

/**
 * Class ConfigProvider
 *
 * Service provider for registering the configuration provider in the DI container.
 *
 * @package MikoPBX\Common\Providers
 */
class ConfigProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'config';

    /**
     * Register config provider.
     *
     * @param \Phalcon\Di\DiInterface $di The DI container.
     *
     * @throws \Phalcon\Exception If the config file is not found or not readable.
     */
    public function register(DiInterface $di): void
    {
        $configPath = '/etc/inc/mikopbx-settings.json';

        if ( ! file_exists($configPath)
            || ! is_readable($configPath)
        ) {
            throw new Exception('Config file does not exist: ' . $configPath);
        }

        $di->setShared(
            self::SERVICE_NAME,
            function () use ($configPath) {
                try {
                    return new Json($configPath);
                } catch (Throwable $exception){
                    $jsonText = file_get_contents($configPath);
                    $jsonObj = json_decode($jsonText,true);
                    return new Config($jsonObj);
                }
            }
        );
    }

    /**
     * Recreates modules service after enable or disable them
     */
    public static function recreateConfigProvider(): void
    {
        $di = Di::getDefault();
        $di->remove(self::SERVICE_NAME);
        $di->register(new self());
    }
}