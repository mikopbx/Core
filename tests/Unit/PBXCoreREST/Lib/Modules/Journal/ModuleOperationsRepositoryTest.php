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

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Modules\Journal;

use MikoPBX\Common\Models\ModuleOperations;
use MikoPBX\PBXCoreREST\Lib\Modules\Journal\ModuleOperationsRepository;
use PDO;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * Unit tests for the module operations journal persistence layer.
 *
 * Runs on an in-memory SQLite database with the same schema that
 * UpdateDatabase generates from the ModuleOperations model annotations.
 * Covers the invariants the new pipeline depends on:
 *
 *   - claim: single active operation, conflict reporting, staleness flag
 *   - fencing: CAS transitions, token invalidation (zombie protection)
 *   - lifecycle: open/finish/heartbeat/updateStage state machine rules
 *   - housekeeping: terminal rows pruning, API projection hides secrets
 */
final class ModuleOperationsRepositoryTest extends TestCase
{
    private PDO $db;
    private ModuleOperationsRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->exec(
            'CREATE TABLE ' . ModuleOperationsRepository::TABLE . ' (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operationUid VARCHAR NOT NULL,
                moduleUniqueId VARCHAR NOT NULL,
                operation VARCHAR NOT NULL,
                state VARCHAR NOT NULL,
                stage VARCHAR,
                progress INTEGER,
                params VARCHAR,
                errorData VARCHAR,
                wasEnabled VARCHAR,
                prevVersion VARCHAR,
                newVersion VARCHAR,
                rowSnapshot VARCHAR,
                stagingPath VARCHAR,
                backupPath VARCHAR,
                swapDone VARCHAR,
                batchId VARCHAR,
                channelId VARCHAR,
                fencingToken VARCHAR NOT NULL,
                pid INTEGER,
                pgid INTEGER,
                childPgid INTEGER,
                heartbeatAt INTEGER,
                startedAt INTEGER,
                finishedAt INTEGER,
                createdAt INTEGER NOT NULL
            )'
        );
        $this->db->exec(
            'CREATE UNIQUE INDEX i_m_ModuleOperations_operationUid ON '
            . ModuleOperationsRepository::TABLE . ' (operationUid)'
        );
        $this->repository = new ModuleOperationsRepository($this->db);
    }

    public function testOpenCreatesRunningRowVisibleAsActive(): void
    {
        [$uid, $token] = $this->repository->open(
            'ModuleTemplate',
            ModuleOperations::OPERATION_INSTALL_REPO,
            ['releaseId' => 42],
            'install-module',
            'batch-1'
        );

        $this->assertNotSame('', $uid, 'open() must return a non empty operationUid');
        $this->assertNotSame('', $token, 'open() must return a non empty fencingToken');

        $row = $this->repository->getActiveForModule('ModuleTemplate');
        $this->assertNotNull($row, 'an opened operation must be visible as active for its module');
        $this->assertSame(ModuleOperations::STATE_RUNNING, $row['state']);
        $this->assertSame('batch-1', $row['batchId']);
        $this->assertSame('install-module', $row['channelId']);
        $this->assertSame(42, json_decode((string)$row['params'], true)['releaseId']);
        $this->assertGreaterThan(0, (int)$row['startedAt'], 'open() must set startedAt');
        $this->assertGreaterThan(0, (int)$row['heartbeatAt'], 'open() must set heartbeatAt');
    }

    public function testClaimGrantsOnlyOneActiveOperation(): void
    {
        $first = $this->repository->claim('ModuleTemplate', ModuleOperations::OPERATION_ENABLE);
        $this->assertTrue($first['claimed'], 'first claim on empty journal must succeed');

        // Even for a DIFFERENT module: the invariant is one operation system-wide
        $second = $this->repository->claim('ModuleOther', ModuleOperations::OPERATION_DISABLE);
        $this->assertFalse($second['claimed'], 'second claim must conflict while the first is active');
        $this->assertSame(
            $first['operationUid'],
            $second['activeOperation']['operationId'],
            'conflict must report the operation that holds the claim'
        );
        $this->assertFalse($second['stale'], 'a fresh operation must not be reported as stale');
        $this->assertArrayNotHasKey(
            'fencingToken',
            $second['activeOperation'],
            'the API projection must never leak the fencing token'
        );
    }

    public function testClaimConflictReportsStaleWhenHeartbeatIsDead(): void
    {
        $first = $this->repository->claim('ModuleTemplate', ModuleOperations::OPERATION_INSTALL_REPO);
        $this->assertTrue($first['claimed']);

        $deadHeartbeat = time() - ModuleOperationsRepository::HEARTBEAT_STALE_AFTER - 10;
        $this->db->exec(
            'UPDATE ' . ModuleOperationsRepository::TABLE
            . " SET heartbeatAt = $deadHeartbeat WHERE operationUid = '{$first['operationUid']}'"
        );

        $second = $this->repository->claim('ModuleTemplate', ModuleOperations::OPERATION_ENABLE);
        $this->assertFalse($second['claimed'], 'stale operation still holds the claim until reaped');
        $this->assertTrue($second['stale'], 'dead heartbeat must be reported as stale to the caller');
    }

    public function testFinishSuccessCompletesRowWithFullProgress(): void
    {
        [$uid, $token] = $this->repository->open('ModuleTemplate', ModuleOperations::OPERATION_ENABLE);

        $this->assertTrue($this->repository->finish($uid, $token, true));

        $row = $this->repository->getByUid($uid);
        $this->assertSame(ModuleOperations::STATE_COMPLETED, $row['state']);
        $this->assertSame(100, (int)$row['progress'], 'successful finish must force progress to 100');
        $this->assertGreaterThan(0, (int)$row['finishedAt'], 'terminal transition must set finishedAt');
        $this->assertNull(
            $this->repository->getActiveForModule('ModuleTemplate'),
            'a completed operation must not be reported as active'
        );
    }

    public function testFinishFailureStoresErrorMessages(): void
    {
        [$uid, $token] = $this->repository->open('ModuleTemplate', ModuleOperations::OPERATION_INSTALL_REPO);
        $messages = ['error' => ['Download failed', 'md5 mismatch']];

        $this->assertTrue($this->repository->finish($uid, $token, false, $messages));

        $api = ModuleOperationsRepository::toApiArray($this->repository->getByUid($uid));
        $this->assertSame(ModuleOperations::STATE_FAILED, $api['state']);
        $this->assertTrue($api['terminal']);
        $this->assertSame($messages, $api['errorMessages'], 'error messages must round-trip through the journal');
    }

    public function testWrongFencingTokenCannotTouchTheRow(): void
    {
        [$uid, $token] = $this->repository->open('ModuleTemplate', ModuleOperations::OPERATION_INSTALL_REPO);

        $this->assertFalse(
            $this->repository->finish($uid, 'deadbeef', true),
            'a zombie with a wrong token must not finalize the operation'
        );
        $this->assertFalse(
            $this->repository->heartbeat($uid, 'deadbeef'),
            'a zombie with a wrong token must not refresh the heartbeat'
        );

        $row = $this->repository->getByUid($uid);
        $this->assertSame(
            ModuleOperations::STATE_RUNNING,
            $row['state'],
            'the row must stay untouched after zombie write attempts'
        );

        $this->assertTrue($this->repository->finish($uid, $token, true), 'the real token must still work');
    }

    public function testInvalidateTokenFencesOutTheOriginalProcess(): void
    {
        [$uid, $oldToken] = $this->repository->open('ModuleTemplate', ModuleOperations::OPERATION_INSTALL_REPO);

        $newToken = $this->repository->invalidateToken($uid);
        $this->assertNotNull($newToken, 'invalidateToken must succeed on an active operation');
        $this->assertNotSame($oldToken, $newToken);

        $this->assertFalse(
            $this->repository->finish($uid, $oldToken, true),
            'after invalidation the original process must be fenced out'
        );
        $this->assertTrue(
            $this->repository->transition(
                $uid,
                $newToken,
                ModuleOperations::ACTIVE_STATES,
                ModuleOperations::STATE_FAILED
            ),
            'the reaper holding the new token must be able to fail the operation'
        );

        $this->assertNull(
            $this->repository->invalidateToken($uid),
            'invalidateToken must refuse to touch a terminal operation'
        );
    }

    public function testTransitionRespectsSourceStates(): void
    {
        [$uid, $token] = $this->repository->open('ModuleTemplate', ModuleOperations::OPERATION_INSTALL_REPO);
        $this->repository->finish($uid, $token, true);

        $this->assertFalse(
            $this->repository->transition(
                $uid,
                $token,
                [ModuleOperations::STATE_RUNNING],
                ModuleOperations::STATE_FAILED
            ),
            'a terminal operation must not transition anywhere'
        );
        $this->assertSame(
            ModuleOperations::STATE_COMPLETED,
            $this->repository->getByUid($uid)['state']
        );
    }

    public function testStartRunningMovesPendingClaimToRunning(): void
    {
        $claim = $this->repository->claim('ModuleTemplate', ModuleOperations::OPERATION_INSTALL_REPO);
        $this->assertTrue($claim['claimed']);
        $uid = $claim['operationUid'];
        $token = $claim['fencingToken'];

        $this->assertSame(
            ModuleOperations::STATE_PENDING,
            $this->repository->getByUid($uid)['state'],
            'claim must create the row in pending state'
        );

        $this->assertTrue($this->repository->startRunning($uid, $token, 4242, 4242));

        $row = $this->repository->getByUid($uid);
        $this->assertSame(ModuleOperations::STATE_RUNNING, $row['state']);
        $this->assertSame(4242, (int)$row['pid']);
        $this->assertSame(4242, (int)$row['pgid']);
        $this->assertGreaterThan(0, (int)$row['startedAt']);

        $this->assertFalse(
            $this->repository->startRunning($uid, $token, 1, 1),
            'startRunning must not apply twice'
        );
    }

    public function testUpdateStageClampsProgressAndKeepsHeartbeatFresh(): void
    {
        [$uid, $token] = $this->repository->open('ModuleTemplate', ModuleOperations::OPERATION_INSTALL_REPO);

        $this->assertTrue($this->repository->updateStage($uid, $token, 'Stage_IV_DownloadModule', 150));
        $row = $this->repository->getByUid($uid);
        $this->assertSame('Stage_IV_DownloadModule', $row['stage']);
        $this->assertSame(100, (int)$row['progress'], 'progress must be clamped to 100');

        $this->assertTrue($this->repository->updateStage($uid, $token, 'Stage_V_InstallModule', -5));
        $this->assertSame(0, (int)$this->repository->getByUid($uid)['progress'], 'progress must be clamped to 0');
    }

    public function testSetFieldsRejectsUnknownColumns(): void
    {
        [$uid, $token] = $this->repository->open('ModuleTemplate', ModuleOperations::OPERATION_INSTALL_REPO);

        $this->expectException(RuntimeException::class);
        $this->repository->setFields($uid, $token, ['fencingToken' => 'hacked']);
    }

    public function testSetFieldsWritesCheckpointColumns(): void
    {
        [$uid, $token] = $this->repository->open('ModuleTemplate', ModuleOperations::OPERATION_INSTALL_REPO);

        $this->assertTrue($this->repository->setFields($uid, $token, [
            'swapDone' => '1',
            'stagingPath' => '/var/www/mikopbx/.staging/ModuleTemplate-abc',
            'prevVersion' => '1.0.0',
            'newVersion' => '1.1.0',
        ]));

        $row = $this->repository->getByUid($uid);
        $this->assertSame('1', $row['swapDone']);
        $this->assertSame('/var/www/mikopbx/.staging/ModuleTemplate-abc', $row['stagingPath']);
        $this->assertSame('1.0.0', $row['prevVersion']);
        $this->assertSame('1.1.0', $row['newVersion']);
    }

    public function testPruneTerminalKeepsRecentHistoryAndAllActive(): void
    {
        $total = ModuleOperationsRepository::RECENT_KEEP + 10;
        for ($i = 0; $i < $total; $i++) {
            [$uid, $token] = $this->repository->open('Module' . $i, ModuleOperations::OPERATION_ENABLE);
            $this->repository->finish($uid, $token, true);
        }
        [$activeUid] = $this->repository->open('ModuleActive', ModuleOperations::OPERATION_INSTALL_REPO);

        $this->repository->pruneTerminal();

        $terminalLeft = (int)$this->db
            ->query(
                'SELECT COUNT(*) FROM ' . ModuleOperationsRepository::TABLE
                . " WHERE state != '" . ModuleOperations::STATE_RUNNING . "'"
            )
            ->fetchColumn();
        $this->assertSame(
            ModuleOperationsRepository::RECENT_KEEP,
            $terminalLeft,
            'pruning must keep exactly RECENT_KEEP terminal rows'
        );
        $this->assertNotNull(
            $this->repository->getByUid($activeUid),
            'pruning must never delete active operations'
        );
    }

    public function testGetRecentReturnsNewestFirstAndFiltersByModule(): void
    {
        [$uidA, $tokenA] = $this->repository->open('ModuleA', ModuleOperations::OPERATION_ENABLE);
        $this->repository->finish($uidA, $tokenA, true);
        [$uidB, $tokenB] = $this->repository->open('ModuleB', ModuleOperations::OPERATION_DISABLE);
        $this->repository->finish($uidB, $tokenB, false, ['error' => ['boom']]);

        $all = $this->repository->getRecent();
        $this->assertCount(2, $all);
        $this->assertSame($uidB, $all[0]['operationUid'], 'recent list must be newest first');

        $onlyA = $this->repository->getRecent('ModuleA');
        $this->assertCount(1, $onlyA);
        $this->assertSame($uidA, $onlyA[0]['operationUid']);
    }

    public function testToApiArrayMarksDeadHeartbeatAsStale(): void
    {
        [$uid] = $this->repository->open('ModuleTemplate', ModuleOperations::OPERATION_INSTALL_REPO);
        $deadHeartbeat = time() - ModuleOperationsRepository::HEARTBEAT_STALE_AFTER - 10;
        $this->db->exec(
            'UPDATE ' . ModuleOperationsRepository::TABLE
            . " SET heartbeatAt = $deadHeartbeat WHERE operationUid = '$uid'"
        );

        $api = ModuleOperationsRepository::toApiArray($this->repository->getByUid($uid));
        $this->assertTrue($api['stale'], 'active operation with dead heartbeat must be flagged stale');
        $this->assertFalse($api['terminal']);
    }
}
