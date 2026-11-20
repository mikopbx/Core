<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Library;

use MikoPBX\Common\Library\ExtensionsNumberMatcher;
use PHPUnit\Framework\TestCase;

final class ExtensionsNumberMatcherTest extends TestCase
{
    public function testInternalNumberMatchesItselfOnly(): void
    {
        self::assertSame(['233'], ExtensionsNumberMatcher::candidateNumbers('233'));
    }

    public function testLongDistancePrefixVariantsAreCandidates(): void
    {
        self::assertSame(
            ['79047159077', '89047159077', '9047159077'],
            ExtensionsNumberMatcher::candidateNumbers('79047159077')
        );
        self::assertSame(
            ['89047159077', '79047159077', '9047159077'],
            ExtensionsNumberMatcher::candidateNumbers('89047159077')
        );
    }

    public function testUnprefixedNumberGetsPrefixedCandidates(): void
    {
        self::assertSame(
            ['4952293042', '74952293042', '84952293042'],
            ExtensionsNumberMatcher::candidateNumbers('4952293042')
        );
    }

    public function testNonDigitsAreStripped(): void
    {
        self::assertSame(
            ['79047159077', '89047159077', '9047159077'],
            ExtensionsNumberMatcher::candidateNumbers('+7 (904) 715-90-77')
        );
    }

    public function testInputWithoutDigitsHasNoCandidates(): void
    {
        self::assertSame([], ExtensionsNumberMatcher::candidateNumbers(''));
        self::assertSame([], ExtensionsNumberMatcher::candidateNumbers('+---'));
    }

    public function testNineDigitNumberMatchesItselfOnly(): void
    {
        // Must NOT produce a wildcard-style tail match: a stored extension sharing
        // the last digits of an unrelated number is a different party.
        self::assertSame(['904715907'], ExtensionsNumberMatcher::candidateNumbers('904715907'));
    }
}
