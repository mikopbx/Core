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

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Modules\Pipeline;

use MikoPBX\PBXCoreREST\Lib\Modules\Pipeline\RollbackService;
use PHPUnit\Framework\TestCase;

/**
 * Table-driven test of the rollback restore decision.
 *
 * This pure function is what keeps rollback retries from destroying an
 * already-restored module: the decision must be derived from which
 * directories actually exist, never from the swapDone flag alone.
 * Covers every combination of (backupPath recorded, backup dir exists,
 * swapDone) including the crash windows between the two swap renames.
 */
final class RollbackDecisionTest extends TestCase
{
    /**
     * @dataProvider decisionCases
     */
    public function testDecision(
        string $backupPath,
        bool $backupDirExists,
        bool $swapDone,
        string $expected,
        string $scenario
    ): void {
        $this->assertSame(
            $expected,
            RollbackService::decideRestoreAction($backupPath, $backupDirExists, $swapDone),
            $scenario
        );
    }

    public static function decisionCases(): array
    {
        $backup = '/mnt/modules/.backup/ModuleX-op1';
        return [
            'update failed after swap: backup present -> full restore' => [
                $backup, true, true,
                RollbackService::ACTION_RESTORE_BACKUP,
                'the normal after-swap failure must restore the previous version',
            ],
            'crash between the two renames: backup present, swapDone=0 -> full restore' => [
                $backup, true, false,
                RollbackService::ACTION_RESTORE_BACKUP,
                'live is absent or holds never-installed code — the backup must come back',
            ],
            'retry after a completed restore: backup gone, swapDone=1 -> keep live' => [
                $backup, false, true,
                RollbackService::ACTION_KEEP_LIVE,
                'a second rollback attempt must NOT delete the already-restored module',
            ],
            'write-ahead record without the rename: backup gone, swapDone=0 -> keep live' => [
                $backup, false, false,
                RollbackService::ACTION_KEEP_LIVE,
                'backupPath recorded before a rename that never happened — live still holds the previous version',
            ],
            'fresh install failed after swap -> remove the fresh live dir' => [
                '', false, true,
                RollbackService::ACTION_REMOVE_FRESH,
                'a fresh install that reached live must be removed together with its row',
            ],
            'failure before any swap -> nothing to do' => [
                '', false, false,
                RollbackService::ACTION_NONE,
                'the live system was never touched',
            ],
        ];
    }
}
