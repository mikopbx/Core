<?php

declare(strict_types=1);

namespace Tests\Unit\PBXCoreREST\Lib\Extensions;

use MikoPBX\PBXCoreREST\Lib\Extensions\ModuleExtensionOwnerResolver;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ModuleExtensionOwnerResolverTest extends TestCase
{
    public function testKeepsModuleOwnerWhenIncomingRouteRelationFollowsIt(): void
    {
        $relatedModelClasses = [
            'Modules\\ModuleSmartIVR\\Models\\ModuleSmartIVR',
            'MikoPBX\\Common\\Models\\IncomingRoutingTable',
        ];

        self::assertSame(
            'ModuleSmartIVR',
            ModuleExtensionOwnerResolver::resolve($relatedModelClasses)
        );
    }

    #[DataProvider('invalidRelationsProvider')]
    public function testIgnoresRelationsThatDoNotIdentifyAModule(array $relatedModelClasses): void
    {
        self::assertNull(ModuleExtensionOwnerResolver::resolve($relatedModelClasses));
    }

    public static function invalidRelationsProvider(): array
    {
        return [
            'core relation' => [[
                'MikoPBX\\Common\\Models\\IncomingRoutingTable',
            ]],
            'missing module id' => [[
                'Modules\\\\Models\\SomeModel',
            ]],
            'missing Models segment' => [[
                'Modules\\ModuleSmartIVR\\Lib\\SmartIVRConf',
            ]],
            'missing model class' => [[
                'Modules\\ModuleSmartIVR\\Models\\',
            ]],
            'empty relations' => [[]],
        ];
    }
}
