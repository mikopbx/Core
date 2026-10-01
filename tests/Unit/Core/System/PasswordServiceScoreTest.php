<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\PasswordService;
use PHPUnit\Framework\TestCase;

/**
 * Regression coverage for password strength scoring.
 */
class PasswordServiceScoreTest extends TestCase
{
    /**
     * @dataProvider strongMachineGeneratedPasswordProvider
     */
    public function testLongDiverseMachineGeneratedPasswordsRemainStrong(
        string $password,
        int $expectedScore
    ): void {
        $this->assertSame($expectedScore, PasswordService::calculateScore($password));
    }

    public static function strongMachineGeneratedPasswordProvider(): array
    {
        return [
            'mixed case generated password' => ['aDlnREd3YnJ2SFVWakl5', 90],
            'legacy hexadecimal token' => ['6355a1b3bd8d2eb5b8b001db186474b6', 60],
            'hexadecimal token containing eee' => ['dba06e1a1f03cceee3fb06b4cf07cc56', 60],
            'hexadecimal token containing ddd' => ['d31579fc75ddd914484b023a9a65dd32', 60],
            'diverse token with a long repeated run' => ['aB3gjkmnpRstuvWyxzH2aaaa', 80],
        ];
    }

    /**
     * @dataProvider weakRepeatedPasswordProvider
     */
    public function testLowDiversityRepeatedPasswordsStayBelowSipThreshold(string $password): void
    {
        $this->assertLessThan(
            PasswordService::SCORE_FAIR,
            PasswordService::calculateScore($password)
        );
    }

    public static function weakRepeatedPasswordProvider(): array
    {
        return [
            'one repeated hexadecimal character' => ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
            'one repeated digit' => ['11111111111111111111111111111111'],
            'short pattern repeated' => ['abcabcabcabcabcabcabcabcabcabcab'],
        ];
    }
}
