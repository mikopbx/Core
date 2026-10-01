<?php

declare(strict_types=1);

namespace MikoPBXTests\Unit\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\PBXCoreREST\Lib\ConferenceRooms\DataStructure;
use PHPUnit\Framework\TestCase;

final class DataStructureSecurityTest extends TestCase
{
    /**
     * @dataProvider invalidPinCodeProvider
     */
    public function testPinCodeRejectsNonDigitCharacters(string $pinCode): void
    {
        self::assertNotEmpty(DataStructure::validateInputData([
            'pinCode' => $pinCode,
        ]));
    }

    /**
     * @dataProvider validPinCodeProvider
     */
    public function testPinCodeAcceptsEmptyOrDigitOnlyValues(string $pinCode): void
    {
        self::assertSame([], DataStructure::validateInputData([
            'pinCode' => $pinCode,
        ]));
    }

    public function testPinCodeKeepsExistingMaximumLengthValidation(): void
    {
        self::assertNotEmpty(DataStructure::validateInputData([
            'pinCode' => str_repeat('1', 21),
        ]));
    }

    public static function invalidPinCodeProvider(): array
    {
        return [
            'dialplan injection' => ["1)\nsame => n,Hangup("],
            'carriage return' => ["12\r34"],
            'horizontal tab' => ["12\t34"],
            'letters' => ['12abc34'],
            'punctuation' => ['12-34'],
        ];
    }

    public static function validPinCodeProvider(): array
    {
        return [
            'empty PIN' => [''],
            'zero' => ['0'],
            'twenty digits' => ['12345678901234567890'],
        ];
    }
}
