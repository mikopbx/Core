<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\OutWorkTimes;

use MikoPBX\PBXCoreREST\Lib\OutWorkTimes\DataStructure;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * Issue #1383 (B-032): a byte-based cut of a Cyrillic description produced invalid
 * UTF-8, and json_encode failed for the whole time-conditions list.
 */
final class DataStructureShortDescriptionTest extends TestCase
{
    public function testLongCyrillicDescriptionIsCutByCharacters(): void
    {
        $description = str_repeat('Нерабочее время ', 5) . "\nвторая строка";

        $short = $this->shortDescription($description);

        self::assertSame(50, mb_strlen($short));
        self::assertStringEndsWith('...', $short);
        self::assertSame(mb_substr($description, 0, 47) . '...', $short);
        self::assertTrue(mb_check_encoding($short, 'UTF-8'));
        self::assertNotFalse(json_encode(['shortDescription' => $short]));
    }

    public function testFiftyCharacterCyrillicLineIsKept(): void
    {
        $line = str_repeat('я', 50);

        self::assertSame($line, $this->shortDescription($line . "\nignored"));
    }

    private function shortDescription(string $description): string
    {
        $method = new ReflectionMethod(DataStructure::class, 'getShotDescription');
        $method->setAccessible(true);

        return $method->invoke(null, $description);
    }
}
