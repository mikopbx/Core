<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Models;

use MikoPBX\Common\Models\Extensions;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * Issue #1384 (B-064): the starting number came from SQL MIN() over a TEXT column,
 * so '1000' won over '200' and free numbers below it were never offered.
 */
final class ExtensionsNextInternalNumberTest extends TestCase
{
    public function testStartsFromNumericallySmallestNumber(): void
    {
        self::assertSame('202', $this->findFree(['1000', '200', '201'], ['1000', '200', '201'], 9999));
    }

    public function testStartsFrom200WithoutInternalNumbers(): void
    {
        self::assertSame('200', $this->findFree([], ['100'], 999));
    }

    public function testIgnoresNonNumericNumbers(): void
    {
        self::assertSame('301', $this->findFree(['300', 'abc', ''], ['300'], 999));
    }

    public function testReturnsEmptyStringWhenRangeIsFull(): void
    {
        self::assertSame('', $this->findFree(['998'], ['998', '999'], 999));
    }

    private function findFree(array $userNumbers, array $occupied, int $maxExtension): string
    {
        $method = new ReflectionMethod(Extensions::class, 'findFreeInternalNumber');
        $method->setAccessible(true);

        return $method->invoke(null, $userNumbers, $occupied, $maxExtension);
    }
}
