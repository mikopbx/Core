<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Models;

use MikoPBX\Common\Models\LanInterfaces;
use PHPUnit\Framework\TestCase;

final class LanInterfacesVlanSecurityTest extends TestCase
{
    /**
     * @dataProvider vlanIdProvider
     */
    public function testVlanIdContract(mixed $value, bool $expected): void
    {
        self::assertTrue(method_exists(LanInterfaces::class, 'isValidVlanId'));
        self::assertSame($expected, LanInterfaces::isValidVlanId($value));
    }

    public static function vlanIdProvider(): array
    {
        return [
            'disabled' => ['0', true],
            'leading zero' => ['01', true],
            'four digits with leading zeros' => ['0001', true],
            'ordinary VLAN' => ['100', true],
            'upper product boundary' => ['4095', true],
            'integer input' => [100, true],
            'command injection' => ['1;printf PWNED;#', false],
            'newline' => ["1\nprintf PWNED", false],
            'negative' => ['-1', false],
            'above range' => ['4096', false],
            'too many digits' => ['00001', false],
            'boolean' => [true, false],
            'array' => [['1'], false],
        ];
    }
}
