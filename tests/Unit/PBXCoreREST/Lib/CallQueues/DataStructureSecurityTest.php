<?php

declare(strict_types=1);

namespace MikoPBXTests\Unit\PBXCoreREST\Lib\CallQueues;

use MikoPBX\PBXCoreREST\Lib\CallQueues\DataStructure;
use PHPUnit\Framework\TestCase;

final class DataStructureSecurityTest extends TestCase
{
    /**
     * @dataProvider controlCharacterProvider
     */
    public function testQueueNameRejectsControlCharacters(string $controlCharacter): void
    {
        $errors = DataStructure::validateInputData([
            'name' => "Sales{$controlCharacter}[INJECTED-QUEUE]",
        ]);

        self::assertNotEmpty($errors);
    }

    public function testQueueNameAcceptsOrdinaryUnicodeText(): void
    {
        self::assertSame([], DataStructure::validateInputData([
            'name' => 'Очередь продаж №1',
        ]));
    }

    /**
     * @dataProvider optionalRoutingDestinationProvider
     */
    public function testEmptyOptionalRoutingDestinationIsAccepted(string $fieldName): void
    {
        self::assertSame([], DataStructure::validateInputData([
            $fieldName => '',
        ]));
    }

    public function testSingleDigitQueueExtensionIsAccepted(): void
    {
        self::assertSame([], DataStructure::validateInputData([
            'extension' => '1',
        ]));
    }

    public static function optionalRoutingDestinationProvider(): array
    {
        return [
            'timeout' => ['timeout_extension'],
            'empty queue' => ['redirect_to_extension_if_empty'],
            'unanswered' => ['redirect_to_extension_if_unanswered'],
            'repeat exceeded' => ['redirect_to_extension_if_repeat_exceeded'],
        ];
    }

    public static function controlCharacterProvider(): array
    {
        return [
            'line feed' => ["\n"],
            'carriage return' => ["\r"],
            'horizontal tab' => ["\t"],
            'unit separator' => ["\x1F"],
            'delete' => ["\x7F"],
        ];
    }
}
