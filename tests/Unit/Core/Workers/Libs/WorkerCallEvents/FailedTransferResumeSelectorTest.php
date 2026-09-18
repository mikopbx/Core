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

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\FailedTransferResumeSelector;
use PHPUnit\Framework\TestCase;

final class FailedTransferResumeSelectorTest extends TestCase
{
    private const OPERATOR = 'PJSIP/202-000002a8';
    private const CALLER = 'PJSIP/SIP-TRUNK-03E89C97-000002a7';
    private const OTHER_AGENT = 'PJSIP/241-000002b3';

    /** Inbound call: caller is src_chan, the operator answered as dst_chan. */
    private function inbound(): object
    {
        return (object)[
            'src_chan' => self::CALLER,
            'dst_chan' => self::OPERATOR,
            'answer' => '2026-09-18 10:11:34',
        ];
    }

    public function testDoesNotResumeWithoutTransferer(): void
    {
        self::assertNull(
            FailedTransferResumeSelector::select([$this->inbound()], '', self::CALLER)
        );
    }

    public function testResumesWhenOperatorBridgedBackToCaller(): void
    {
        $row = $this->inbound();

        self::assertSame(
            $row,
            FailedTransferResumeSelector::select([$row], self::OPERATOR, self::CALLER)
        );
    }

    public function testResumesWhenOperatorIsSourceSide(): void
    {
        // Operator-originated (outbound) call: operator is src_chan, caller is dst_chan.
        $row = (object)[
            'src_chan' => self::OPERATOR,
            'dst_chan' => self::CALLER,
            'answer' => '2026-09-18 10:11:34',
        ];

        self::assertSame(
            $row,
            FailedTransferResumeSelector::select([$row], self::OPERATOR, self::CALLER)
        );
    }

    public function testDoesNotResumeWhenBridgePeerUnknown(): void
    {
        // Bridge state not observable (empty BRIDGEPEER) — never resume, so a completed
        // transfer (operator gone) can never be mistaken for a return to the caller.
        self::assertNull(
            FailedTransferResumeSelector::select([$this->inbound()], self::OPERATOR, '')
        );
    }

    public function testDoesNotResumeWhenOperatorBridgedElsewhere(): void
    {
        // Operator is bridged to another agent — the transfer completed, do not resume.
        self::assertNull(
            FailedTransferResumeSelector::select([$this->inbound()], self::OPERATOR, self::OTHER_AGENT)
        );
    }

    public function testDoesNotResumeWhenNoConversation(): void
    {
        self::assertNull(
            FailedTransferResumeSelector::select([], self::OPERATOR, self::CALLER)
        );
    }

    public function testDoesNotResumeWhenAmbiguous(): void
    {
        // Two conversations both bridged to the same caller channel — refuse to guess.
        $row = $this->inbound();

        self::assertNull(
            FailedTransferResumeSelector::select([$row, clone $row], self::OPERATOR, self::CALLER)
        );
    }
}
