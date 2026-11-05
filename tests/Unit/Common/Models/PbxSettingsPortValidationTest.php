<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Tests\Unit\Common\Models;

require_once 'Globals.php';

use MikoPBX\Common\Models\PbxSettings;
use PHPUnit\Framework\TestCase;

/**
 * Port settings are interpolated into iptables/fail2ban/dropbear shell commands
 * and service configs (GHSA-29c5-67mj-g4w9), so only plain decimal ports are allowed.
 */
class PbxSettingsPortValidationTest extends TestCase
{
    private const TEST_KEY = PbxSettings::SIP_PORT;

    private ?string $originalValue = null;

    protected function tearDown(): void
    {
        if ($this->originalValue !== null) {
            $messages = [];
            PbxSettings::setValueByKey(self::TEST_KEY, $this->originalValue, $messages);
            PbxSettings::rebuildCache();
        }
        parent::tearDown();
    }

    /**
     * @return array<string, array{mixed, bool}>
     */
    public static function portValueProvider(): array
    {
        return [
            'int'                 => [5060, true],
            'numeric string'      => ['5060', true],
            'lower bound'         => ['1', true],
            'upper bound'         => ['65535', true],
            'zero'                => ['0', false],
            'above range'         => ['65536', false],
            'negative int'        => [-1, false],
            'shell injection'     => ['5060; id > /tmp/pwned;', false],
            'command substitution' => ['$(id)', false],
            'newline injection'   => ["5060\nfoo=bar", false],
            'trailing newline'    => ["5060\n", false],
            'leading space'       => [' 5060', false],
            'exponent'            => ['1e3', false],
            'float string'        => ['5060.5', false],
            'empty string'        => ['', false],
            'null'                => [null, false],
            'array'               => [['5060'], false],
        ];
    }

    /**
     * @dataProvider portValueProvider
     */
    public function testIsValidPort(mixed $value, bool $expected): void
    {
        self::assertSame($expected, PbxSettings::isValidPort($value));
    }

    public function testSaveRejectsInjectedPortValue(): void
    {
        $this->originalValue = PbxSettings::getValueByKey(self::TEST_KEY, false);

        $messages = [];
        self::assertFalse(PbxSettings::setValueByKey(self::TEST_KEY, '5060; id > /tmp/pwned;', $messages));
        self::assertNotEmpty($messages);
        self::assertSame($this->originalValue, PbxSettings::getValueByKey(self::TEST_KEY, false));
    }

    public function testGetPortByKeyFallsBackToDefaultForInvalidStoredValue(): void
    {
        $this->storeRawValue('5070; id > /tmp/pwned;');

        $default = (int)PbxSettings::getDefaultArrayValues()[self::TEST_KEY];
        self::assertSame($default, PbxSettings::getPortByKey(self::TEST_KEY));
    }

    public function testGetPortByKeyKeepsStoredPortWithSurroundingWhitespace(): void
    {
        // Older releases validated with an (int) cast and accepted such values.
        $this->storeRawValue(" 5070\n");

        self::assertSame(5070, PbxSettings::getPortByKey(self::TEST_KEY));
    }

    /**
     * Writes a value bypassing model validation, as an old release or a restored backup would.
     */
    private function storeRawValue(string $value): void
    {
        $this->originalValue = PbxSettings::getValueByKey(self::TEST_KEY, false);

        $record = PbxSettings::findFirstByKey(self::TEST_KEY);
        self::assertNotNull($record);
        self::assertTrue($record->getWriteConnection()->execute(
            'UPDATE m_PbxSettings SET value = :value WHERE key = :key',
            [
                'value' => $value,
                'key'   => self::TEST_KEY,
            ]
        ));
        PbxSettings::rebuildCache();
    }
}
