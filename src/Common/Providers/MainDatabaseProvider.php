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

/**
 * Main database connection is created based in the parameters defined in the configuration file
 *
 *  @package MikoPBX\Common\Providers
 *
 * @method bool begin(bool $nesting = true)
 * @method bool commit(bool $nesting = true)
 * @method bool rollback(bool $nesting = true)
 *
 */
class MainDatabaseProvider extends DatabaseProviderBase implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'db';

    /**
     * Register db service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $dbConfig = $di->getShared(ConfigProvider::SERVICE_NAME)->get('database')->toArray();
        $this->registerDBService(self::SERVICE_NAME, $di, $dbConfig);
    }
}