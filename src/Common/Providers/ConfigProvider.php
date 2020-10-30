<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use Phalcon\Config\Adapter\Json;
use Phalcon\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Exception;

/**
 * Read the configuration
 */
class ConfigProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'config';

    /**
     * Register config provider
     *
     * @param \Phalcon\Di\DiInterface $di
     *
     * @throws \Phalcon\Exception
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
                return new Json($configPath);
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