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

namespace MikoPBX\Tests\Core\Asterisk\Configs;

use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class SIPConfTest extends AbstractUnitTest
{
    public function testNeedAsteriskRestart(): void
    {
        $conf = new SIPConf();
        $conf->needAsteriskRestart();
        $this->assertTrue(true);
    }

    /**
     * Issue #1045: first occurrence of a uniqid wins, the seenUniqids tracker
     * stores the winner row id, and the call returns false (do not skip).
     */
    public function testShouldSkipDuplicateUniqidFirstOccurrenceIsKept(): void
    {
        $conf = new SIPConf();
        $seen = [];

        $skip = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['SIP-TRUNK-AAAA1111', '7', &$seen, 'provider']
        );

        $this->assertFalse($skip, 'First occurrence must not be skipped');
        $this->assertSame(['SIP-TRUNK-AAAA1111' => '7'], $seen);
    }

    /**
     * Issue #1045: a second row with the same uniqid is reported as duplicate
     * and the tracker keeps pointing at the original (smaller-id) winner.
     */
    public function testShouldSkipDuplicateUniqidSecondOccurrenceIsSkipped(): void
    {
        $conf = new SIPConf();
        $seen = ['SIP-TRUNK-AAAA1111' => '7'];

        $skip = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['SIP-TRUNK-AAAA1111', '12', &$seen, 'provider']
        );

        $this->assertTrue($skip, 'Duplicate uniqid must be skipped');
        $this->assertSame('7', $seen['SIP-TRUNK-AAAA1111'], 'Winner (id=7) must be preserved');
    }

    /**
     * Different uniqids must coexist in the tracker — the helper only blocks
     * exact uniqid collisions.
     */
    public function testShouldSkipDuplicateUniqidUnrelatedRowsCoexist(): void
    {
        $conf = new SIPConf();
        $seen = [];

        $skipFirst  = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['SIP-TRUNK-AAAA1111', '7', &$seen, 'provider']
        );
        $skipSecond = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['SIP-TRUNK-BBBB2222', '8', &$seen, 'provider']
        );

        $this->assertFalse($skipFirst);
        $this->assertFalse($skipSecond);
        $this->assertSame(
            ['SIP-TRUNK-AAAA1111' => '7', 'SIP-TRUNK-BBBB2222' => '8'],
            $seen
        );
    }

    /**
     * Empty/null uniqid degenerates to '' — the helper still dedups it (two
     * rows with empty uniqid would emit `[]` sections and break pjsip.conf
     * the same way as a real collision).
     */
    public function testShouldSkipDuplicateUniqidEmptyUniqidIsDedupedToo(): void
    {
        $conf = new SIPConf();
        $seen = [];

        $skipFirst  = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['', '3', &$seen, 'peer']
        );
        $skipSecond = $this->invokeMethod(
            $conf,
            'shouldSkipDuplicateUniqid',
            ['', '5', &$seen, 'peer']
        );

        $this->assertFalse($skipFirst);
        $this->assertTrue($skipSecond);
    }
}
