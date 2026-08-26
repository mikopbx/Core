<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\PBXCoreREST\Lib\SoundFiles\DataStructure;
use PHPUnit\Framework\TestCase;

final class DataStructureSecurityTest extends TestCase
{
    public function testPathIsResponseOnlyAndConversionIdIsWritable(): void
    {
        $definitions = DataStructure::getParameterDefinitions();

        self::assertArrayNotHasKey('path', $definitions['request']);
        self::assertTrue($definitions['response']['path']['readOnly']);
        self::assertArrayHasKey('conversion_id', $definitions['request']);
    }
}
