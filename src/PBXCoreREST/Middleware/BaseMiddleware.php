<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Middleware;

use MikoPBX\PBXCoreREST\Traits\ResponseTrait;
use Phalcon\Mvc\Micro\MiddlewareInterface;

/**
 * Base class for all REST API middleware
 *
 * Provides common functionality:
 * - ResponseTrait for halt() method
 * - DI container access
 * - Consistent interface implementation
 *
 * Usage:
 * ```php
 * class MyMiddleware extends BaseMiddleware
 * {
 *     public function call(Micro $application): bool
 *     {
 *         // Your middleware logic
 *         return true;
 *     }
 * }
 * ```
 *
 * @package MikoPBX\PBXCoreREST\Middleware
 */
abstract class BaseMiddleware implements MiddlewareInterface
{
    use ResponseTrait;

    /**
     * Get DI container
     *
     * @return \Phalcon\Di\DiInterface
     * @throws \RuntimeException if DI container is not initialized
     */
    protected function getDI(): \Phalcon\Di\DiInterface
    {
        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            throw new \RuntimeException('DI container is not initialized');
        }
        return $di;
    }
}
