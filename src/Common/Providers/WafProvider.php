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

namespace MikoPBX\Common\Providers;

use MikoPBX\PBXCoreREST\Lib\Waf\WafRegistry;
use Phalcon\Di\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Registers the {@see WafRegistry} service in the DI container.
 *
 * MikoPBX does not have a generic module-lifecycle event bus, so this provider
 * intentionally does NOT subscribe to events. Module enable/disable call sites
 * (`EnableModuleAction`, `DisableModuleAction`) invoke
 * `WafRegistry::onModuleEnabled()` / `onModuleDisabled()` directly, mirroring
 * how those actions invoke `PBXConfModulesProvider::recreateModulesProvider()`.
 *
 * @package MikoPBX\Common\Providers
 */
class WafProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'wafRegistry';

    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function (): WafRegistry {
                return new WafRegistry(Di::getDefault());
            }
        );
    }
}
