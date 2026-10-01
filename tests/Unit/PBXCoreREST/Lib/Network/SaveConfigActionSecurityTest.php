<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Network;

use MikoPBX\PBXCoreREST\Lib\Network\SaveConfigAction;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

final class SaveConfigActionSecurityTest extends TestCase
{
    /**
     * @dataProvider invalidVlanIdProvider
     */
    public function testDynamicVlanIdRejectsInvalidValues(mixed $vlanId): void
    {
        [$isValid, $messages] = $this->validate(['vlanid_1' => $vlanId]);

        self::assertFalse($isValid);
        self::assertContains('nw_ValidateVlanRange', $messages);
    }

    /**
     * @dataProvider validVlanIdProvider
     */
    public function testDynamicVlanIdAcceptsSupportedRange(string|int $vlanId): void
    {
        self::assertSame([true, []], $this->validate(['vlanid_42' => $vlanId]));
    }

    public static function invalidVlanIdProvider(): array
    {
        return [
            'command injection' => ['1;printf PWNED;#'],
            'newline' => ["1\nprintf PWNED"],
            'negative' => ['-1'],
            'above supported range' => ['4096'],
            'too many digits' => ['00001'],
            'boolean' => [true],
            'array' => [['1']],
        ];
    }

    public static function validVlanIdProvider(): array
    {
        return [
            'disabled string' => ['0'],
            'leading zero' => ['01'],
            'four digits with leading zeros' => ['0001'],
            'ordinary VLAN' => ['100'],
            'upper product boundary' => ['4095'],
            'integer input' => [100],
        ];
    }

    private function validate(array $data): array
    {
        $method = new ReflectionMethod(SaveConfigAction::class, 'validateInputData');
        $method->setAccessible(true);

        return $method->invoke(null, $data);
    }
}
