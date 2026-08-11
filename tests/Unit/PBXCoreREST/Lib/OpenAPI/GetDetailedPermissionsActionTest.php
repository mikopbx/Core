<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\OpenAPI;

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\PBXCoreREST\Lib\OpenAPI\GetDetailedPermissionsAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

final class GetDetailedPermissionsActionTest extends TestCase
{
    protected function tearDown(): void
    {
        Di::reset();
        parent::tearDown();
    }

    public function testPublishesOnlyOverriddenLegacyRestCallbacks(): void
    {
        $inherited = $this->makeConfig(InheritedLegacyModule::class, 'InheritedLegacyModule');
        $overridden = $this->makeConfig(OverriddenLegacyModule::class, 'OverriddenLegacyModule');
        $inheritedOverride = $this->makeConfig(
            InheritedIntermediateLegacyModule::class,
            'InheritedIntermediateLegacyModule'
        );

        $di = new Di();
        $di->setShared(
            PBXConfModulesProvider::SERVICE_NAME,
            static fn (): array => [$inherited, $overridden, $inheritedOverride]
        );
        Di::setDefault($di);

        $method = new ReflectionMethod(GetDetailedPermissionsAction::class, 'scanModuleRestControllers');
        $method->setAccessible(true);

        $this->assertSame(
            [
                'OverriddenLegacyModule' => [
                    'type' => 'REST',
                    'controllers' => [
                        '/pbxcore/api/modules/overridden-legacy-module' => [
                            'name' => 'OverriddenLegacyModule',
                            'label' => 'OverriddenLegacyModule',
                            'actions' => ['*'],
                        ],
                    ],
                ],
                'InheritedIntermediateLegacyModule' => [
                    'type' => 'REST',
                    'controllers' => [
                        '/pbxcore/api/modules/inherited-intermediate-legacy-module' => [
                            'name' => 'InheritedIntermediateLegacyModule',
                            'label' => 'InheritedIntermediateLegacyModule',
                            'actions' => ['*'],
                        ],
                    ],
                ],
            ],
            $method->invoke(null)
        );
    }

    /**
     * @template T of ConfigClass
     * @param class-string<T> $className
     * @return T
     */
    private function makeConfig(string $className, string $moduleUniqueId): ConfigClass
    {
        /** @var T $config */
        $config = (new ReflectionClass($className))->newInstanceWithoutConstructor();
        $config->moduleUniqueId = $moduleUniqueId;

        return $config;
    }
}

final class InheritedLegacyModule extends ConfigClass
{
}

final class OverriddenLegacyModule extends ConfigClass
{
    public function moduleRestAPICallback(array $request): PBXApiResult
    {
        return new PBXApiResult();
    }
}

class IntermediateOverriddenLegacyModule extends ConfigClass
{
    public function moduleRestAPICallback(array $request): PBXApiResult
    {
        return new PBXApiResult();
    }
}

final class InheritedIntermediateLegacyModule extends IntermediateOverriddenLegacyModule
{
}
