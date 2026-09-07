<?php

declare(strict_types=1);

namespace MikoPBXTests\Unit\PBXCoreREST\Lib\Employees;

use MikoPBX\PBXCoreREST\Lib\Employees\DataStructure;
use PHPUnit\Framework\TestCase;

final class DataStructureExtensionLengthTest extends TestCase
{
    public function testEmployeeNumberAcceptsElevenDigits(): void
    {
        self::assertSame([], DataStructure::validateInputData([
            'number' => '10000000005',
        ]));
    }

    public function testEmployeeNumberRejectsMoreThanElevenDigits(): void
    {
        self::assertNotEmpty(DataStructure::validateInputData([
            'number' => '100000000006',
        ]));
    }
}
