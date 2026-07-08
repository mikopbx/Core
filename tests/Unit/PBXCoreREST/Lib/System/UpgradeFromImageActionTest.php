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

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\System;

use MikoPBX\PBXCoreREST\Lib\System\UpgradeFromImageAction;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for the single-disk layout detection that gates the pre-upgrade
 * warning (GitHub #1077).
 *
 * The heavy safety work (preserving partition 4) happens in the shell scripts
 * post-reboot; here we lock down the pure decision function that decides whether
 * Storage and system share one physical disk. It must:
 *   - report single-disk ONLY when both disks are the same non-empty name,
 *   - never misfire on a two-disk layout (the branch we must not break),
 *   - treat unknown/empty disk names as "not single-disk" (fail safe: no false warning).
 */
final class UpgradeFromImageActionTest extends TestCase
{
    /**
     * @dataProvider layoutCases
     */
    public function testIsSingleDiskLayout(string $storageDisk, string $systemDisk, bool $expected): void
    {
        $this->assertSame(
            $expected,
            UpgradeFromImageAction::isSingleDiskLayout($storageDisk, $systemDisk),
            "storageDisk='$storageDisk' systemDisk='$systemDisk'"
        );
    }

    public static function layoutCases(): array
    {
        return [
            // Single-disk: Storage partition 4 sits on the same disk as the system.
            'same disk sda'                 => ['sda', 'sda', true],
            'same disk vda (virtio)'        => ['vda', 'vda', true],
            'same disk nvme'                => ['nvme0n1', 'nvme0n1', true],

            // Two-disk: separate Storage disk — MUST NOT be flagged (protected branch).
            'system sda / storage sdb'      => ['sdb', 'sda', false],
            'system vda / storage vdb'      => ['vdb', 'vda', false],
            'system sda / storage nvme'     => ['nvme0n1', 'sda', false],

            // Degenerate / unresolved inputs must fail safe to "not single-disk".
            'both empty'                    => ['', '', false],
            'empty storage disk'            => ['', 'sda', false],
            'empty system disk'             => ['sda', '', false],

            // Substring look-alikes must not be treated as equal.
            'sda vs sda1 lookalike'         => ['sda1', 'sda', false],
            'sda vs sdaa lookalike'         => ['sdaa', 'sda', false],
        ];
    }
}
