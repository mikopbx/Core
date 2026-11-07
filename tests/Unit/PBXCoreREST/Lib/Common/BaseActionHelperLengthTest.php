<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Common;

use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use PHPUnit\Framework\TestCase;

/**
 * Issue #1386 (B-058): min/max_length counted bytes, so Cyrillic text hit the limit
 * at half the allowed number of characters.
 */
final class BaseActionHelperLengthTest extends TestCase
{
    public function testMaxLengthCountsCharacters(): void
    {
        $rules = ['name' => [['type' => 'max_length', 'value' => 6, 'message' => 'too long']]];

        self::assertSame([], BaseActionHelper::validateData(['name' => 'Привет'], $rules));
        self::assertSame(['name' => 'too long'], BaseActionHelper::validateData(['name' => 'Приветы'], $rules));
    }

    public function testMinLengthCountsCharacters(): void
    {
        $rules = ['name' => [['type' => 'min_length', 'value' => 4, 'message' => 'too short']]];

        self::assertSame(['name' => 'too short'], BaseActionHelper::validateData(['name' => 'Миш'], $rules));
        self::assertSame([], BaseActionHelper::validateData(['name' => 'Миша'], $rules));
    }
}
