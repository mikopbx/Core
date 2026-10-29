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
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\InternalContexts;
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
     * so [hangup_handler] must emit transfer_dial_hangup for the Local transfer leg, also when the
     * phone forwarded it to [internal-redirect] (once, before hangup_chan), or the operator's
     * recording is never resumed.
     *
     * @backupGlobals disabled
     */
    public function testHangupHandlerEmitsTransferDialHangupFallback(): void
    {
        $conf = ExtensionsConf::generateHangupHandlerContext();

        $this->assertStringStartsWith('[hangup_handler]', $conf);
        $fallback = 'same => n,ExecIf($["${ISTRANSFER}x" != "x" && "${TRANSFER_DIAL_HANGUP_SENT}x" == "x"'
            . ' && "${CUT(CHANNEL,\;,2)}" == "2"'
            . ' && ("${STRREPLACE(CHANNEL,@internal-transfer-)}" != "${CHANNEL}"'
            . ' || "${STRREPLACE(CHANNEL,@' . ExtensionsConf::PHONE_REDIRECT_CONTEXT . '-)}" != "${CHANNEL}")]'
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

    /**
     * A call forwarded by the phone (SIP 302) lands in [internal-redirect]. A plain call drops the
     * inherited CDR id, as [internal-fw] does, so the forwarded leg gets its own row, and continues in
     * [all_peers], where the forward used to land. A transfer keeps the id and continues in
     * [internal-transfer] (one transfer_dial, one row) with the transferer passed by [internal-users];
     * an external number continues in [all_peers] without its transfer_dial (the [outgoing] route runs it).
     *
     * @backupGlobals disabled
     */
    public function testPhoneRedirectContextSplitsPlainCallsAndTransfers(): void
    {
        $method = new ReflectionMethod(InternalContexts::class, 'generatePhoneRedirect');
        $method->setAccessible(true);
        $conf = $method->invoke(new InternalContexts());

        $allPeers = ExtensionsConf::ALL_PEERS_CONTEXT;
        $this->assertSame(
            '[' . ExtensionsConf::PHONE_REDIRECT_CONTEXT . "]\n"
            . 'exten => ' . ExtensionsConf::ALL_EXTENSION
            . ',1,NoOp(--- Forwarded by the phone to ${EXTEN} ---)' . "\n\t"
            . 'same => n,GotoIf($["${ISTRANSFER}x" != "x"]?transfer)' . "\n\t"
            . 'same => n,Set(__pt1c_UNIQUEID=${UNDEFINED})' . "\n\t"
            . 'same => n,Goto(' . $allPeers . ',${EXTEN},1)' . "\n\t"
            . 'same => n(transfer),Set(REDIRECT_TRANSFER_LEG=1)' . "\n\t"
            . 'same => n,ExecIf($["${TRANSFERERNAME}x" == "x"]'
            . '?Set(TRANSFERERNAME=${REDIRECT_TRANSFERERNAME}))' . "\n\t"
            . 'same => n,GotoIf(${DIALPLAN_EXISTS(internal-transfer,${EXTEN},1)}'
            . '?internal-transfer,${EXTEN},1)' . "\n\t"
            . 'same => n,ExecIf($[!${DIALPLAN_EXISTS(applications,${EXTEN},1)}'
            . ' && !${DIALPLAN_EXISTS(internal,${EXTEN},1)}]?Set(REDIRECT_SKIP_TRANSFER_DIAL=1))' . "\n\t"
            . 'same => n,Goto(' . $allPeers . ',${EXTEN},1)' . "\n\n",
            $conf
        );

        $contexts = new InternalContexts();
        $contexts->getSettings();
        $method = new ReflectionMethod(InternalContexts::class, 'generateAllPeers');
        $method->setAccessible(true);
        $this->assertStringContainsString(
            'same => n,GosubIf($["${REDIRECT_SKIP_TRANSFER_DIAL}" != "1"]?${ISTRANSFER}dial,${EXTEN},1)',
            $method->invoke($contexts)
        );
    }

    /**
     * [dial_create_chan] is shared with trunk dials, so it sets FORWARD_CONTEXT only from the Gosub
     * argument, before the -custom hook so a customization can still override it.
     *
     * @backupGlobals disabled
     */
    public function testDialCreateChanSetsForwardContextFromArgument(): void
    {
        $method = new ReflectionMethod(ExtensionsConf::class, 'generateOtherExten');
        $method->setAccessible(true);
        $conf = '';
        $method->invokeArgs(new ExtensionsConf(), [&$conf]);

        $start = strpos($conf, '[dial_create_chan]');
        $this->assertNotFalse($start);
        $section = substr($conf, $start, strpos($conf, 'same => n,return', $start) - $start);

        $set = 'same => n,ExecIf($["${ARG1}x" != "x"]?Set(FORWARD_CONTEXT=${ARG1}))';
        $custom = 'same => n,ExecIf($[${DIALPLAN_EXISTS(${CONTEXT}-custom,s,1)}]?Gosub(${CONTEXT}-custom,s,1))';
        $this->assertStringContainsString($set, $section);
        $this->assertStringContainsString($custom, $section);
        $this->assertLessThan(strpos($section, $custom), strpos($section, $set));
        $this->assertStringNotContainsString('PJSIP_ENDPOINT', $section);
    }

    /**
     * [internal-users] passes the redirect context to [dial_create_chan] when it dials the phone, and
     * the transferer one level down, before the Dial, for a forward during a transfer.
     *
     * @backupGlobals disabled
     */
    public function testInternalUsersDialPassesPhoneRedirectContext(): void
    {
        $contexts = new InternalContexts();
        $contexts->getSettings();
        $method = new ReflectionMethod(InternalContexts::class, 'generateInternalUsers');
        $method->setAccessible(true);
        $conf = $method->invoke($contexts);

        $this->assertStringContainsString(
            'U(${ISTRANSFER}dial_answer)b(dial_create_chan,s,1(' . ExtensionsConf::PHONE_REDIRECT_CONTEXT . ')))',
            $conf
        );
        $pass = 'same => n,ExecIf($["${ISTRANSFER}x" != "x"]?Set(_REDIRECT_TRANSFERERNAME=${TRANSFERERNAME}))';
        $this->assertStringContainsString($pass, $conf);
        $this->assertLessThan(strpos($conf, 'b(dial_create_chan,s,1('), strpos($conf, $pass));
    }
}
