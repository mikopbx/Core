<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\Core\Asterisk\Configs;

use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\IncomingContexts;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use ReflectionMethod;

class ExtensionsConfTest extends AbstractUnitTest
{
    /**
     * @backupGlobals disabled
     */
    public function testGenerateIncomingContextPeers()
    {
        $conf = IncomingContexts::generate('none');
        $this->assertStringContainsStringIgnoringCase('add-trim-prefix-clid', $conf);
    }

    /**
     * A custom Gosub that hangs the transfer leg up runs the subroutine's h-extension,
     * so [hangup_handler] must emit transfer_dial_hangup for the Local transfer leg
     * (once, before hangup_chan) or the operator's recording is never resumed.
     *
     * @backupGlobals disabled
     */
    public function testHangupHandlerEmitsTransferDialHangupFallback(): void
    {
        $conf = ExtensionsConf::generateHangupHandlerContext();

        $this->assertStringStartsWith('[hangup_handler]', $conf);
        $fallback = 'same => n,ExecIf($["${ISTRANSFER}x" != "x" && "${TRANSFER_DIAL_HANGUP_SENT}x" == "x"'
            . ' && "${CUT(CHANNEL,\;,2)}" == "2"'
            . ' && "${STRREPLACE(CHANNEL,@internal-transfer-)}" != "${CHANNEL}"]'
            . '?Gosub(transfer_dial_hangup,${EXTEN},1(return)))';
        $this->assertStringContainsString($fallback, $conf);
        $this->assertLessThan(
            strpos($conf, 'Gosub(hangup_chan,${EXTEN},1)'),
            strpos($conf, 'Gosub(transfer_dial_hangup')
        );
    }

    /**
     * Forwarding targets are baked into the dialplan [globals] section, so the
     * value must be reduced to the characters Asterisk accepts for a dialled
     * number: digits and * # +. Everything else has to be stripped.
     *
     * @dataProvider forwardingNumberProvider
     * @backupGlobals disabled
     */
    public function testSanitizeForwardingNumber(?string $raw, string $expected): void
    {
        $method = new ReflectionMethod(ExtensionsConf::class, 'sanitizeForwardingNumber');
        $method->setAccessible(true);
        $this->assertSame($expected, $method->invoke(null, $raw));
    }

    /**
     * @return array<string, array{0: string|null, 1: string}>
     */
    public function forwardingNumberProvider(): array
    {
        return [
            'plain number'       => ['89991234567', '89991234567'],
            'with spaces/dashes' => ['+7 999 000-11-22', '+79990001122'],
            'letters stripped'   => ['abc123def', '123'],
            'dial symbols kept'  => ['*21#+100', '*21#+100'],
            'empty'              => ['', ''],
            'null'               => [null, ''],
        ];
    }
}
