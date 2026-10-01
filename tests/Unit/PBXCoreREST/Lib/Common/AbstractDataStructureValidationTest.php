<?php

declare(strict_types=1);

namespace MikoPBXTests\Unit\PBXCoreREST\Lib\Common;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use PHPUnit\Framework\TestCase;

final class AbstractDataStructureValidationTest extends TestCase
{
    public function testBaseValidationDoesNotEnforceResourcePatterns(): void
    {
        self::assertSame([], PatternDefinitionFixture::validateInputData([
            'legacy_value' => 'not-digits',
        ]));
    }
}

final class PatternDefinitionFixture extends AbstractDataStructure
{
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                'legacy_value' => [
                    'type' => 'string',
                    'pattern' => '^[0-9]+$',
                ],
            ],
        ];
    }
}
