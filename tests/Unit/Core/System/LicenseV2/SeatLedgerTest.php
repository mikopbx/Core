<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\LicenseV2;

use MikoPBX\Core\System\LicenseV2\SeatException;
use MikoPBX\Core\System\LicenseV2\SeatLedger;
use MikoPBX\Core\System\LicenseV2\SessionCeilingException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class SeatLedgerTest extends TestCase
{
    private const int NOW = 1_800_000_000;

    private string $dir;
    private int $wallClock = self::NOW;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/seat-ledger-test-' . bin2hex(random_bytes(6));
        mkdir($this->dir, 0700, true);
        $this->wallClock = self::NOW;
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob("$this->dir/*") ?: []);
        rmdir($this->dir);
    }

    public function testLimitIsEnforcedAndRepeatedCaptureTakesNoSecondSeat(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession(['username' => 'a'], 60, 100);
        $b = $ledger->startSession(['username' => 'b'], 60, 100);
        $c = $ledger->startSession(['username' => 'c'], 60, 100);

        $this->assertSame(60, $ledger->capture($a, '54', 2));
        $this->assertSame(60, $ledger->capture($b, '54', 2));
        $this->assertSame(60, $ledger->capture($a, '54', 2), 'same session, same seat');
        $this->assertSame(['54' => 2], $ledger->usage());
        try {
            $ledger->capture($c, '54', 2);
            $this->fail('third seat granted');
        } catch (SeatException $e) {
            $this->assertSame(SeatException::NO_SEATS, $e->extcode);
        }
    }

    public function testSessionIdIsRandomAndFileIsPrivate(): void
    {
        $ledger = $this->newLedger();
        $id = $ledger->startSession([], 60, 100);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{32}$/', $id);
        $this->assertNotSame($id, $ledger->startSession([], 60, 100));
        $this->assertSame(0600, fileperms("$this->dir/seats.json") & 0777);
    }

    public function testTtlBelowMinimumIsRefused(): void
    {
        $ledger = $this->newLedger();
        $this->expectException(RuntimeException::class);
        $ledger->startSession([], 10, 100);
    }

    public function testTtlAboveMaximumIsRefused(): void
    {
        $ledger = $this->newLedger();
        $this->expectException(RuntimeException::class);
        $ledger->startSession([], 3601, 100);
    }

    public function testHolderTooLargeIsRefused(): void
    {
        $ledger = $this->newLedger();
        $this->expectException(RuntimeException::class);
        $ledger->startSession(['note' => str_repeat('x', 2000)], 60, 100);
    }

    public function testSessionCeilingIsRefused(): void
    {
        $ledger = $this->newLedger();
        $ledger->startSession([], 60, 2);
        $ledger->startSession([], 60, 2);
        // Its own type, so the REST layer can tell the protective cap from a storage failure.
        $this->expectException(SessionCeilingException::class);
        $ledger->startSession([], 60, 2);
    }

    public function testUnencodableHolderIsRejectedWithoutLosingEarlierSessions(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession(['username' => 'a'], 60, 100);
        $ledger->capture($a, '54', 2);

        try {
            $ledger->startSession(['name' => "\xB1\x31"], 60, 100);
            $this->fail('a holder that json_encode can not represent was accepted');
        } catch (RuntimeException $e) {
            $this->assertNotInstanceOf(SeatException::class, $e);
        }

        // The earlier session and its seat must still be intact: nothing was wiped.
        $this->assertSame(['54' => 1], $ledger->usage());
        $this->assertGreaterThan(0, filesize("$this->dir/seats.json"));
    }

    public function testExpiredSessionFreesTheSeatAndAnswers1021(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession([], 60, 100);
        $ledger->capture($a, '54', 1);
        $this->wallClock += 60; // expires <= now: expired
        $b = $ledger->startSession([], 60, 100);
        $this->assertSame(60, $ledger->capture($b, '54', 1));
        try {
            $ledger->capture($a, '54', 1);
            $this->fail('expired session captured');
        } catch (SeatException $e) {
            $this->assertSame(SeatException::NO_SESSION, $e->extcode);
        }
    }

    public function testKeepaliveRenewsWithoutAccumulatingAndDoesNotResurrect(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession([], 60, 100);
        $ledger->capture($a, '54', 1);
        $this->wallClock += 30;
        $this->assertSame(60, $ledger->keepalive($a));
        $this->assertSame(60, $ledger->keepalive($a), 'expires = now + ttl, not += ttl');
        $this->wallClock += 60;
        $this->expectException(SeatException::class);
        $ledger->keepalive($a);
    }

    public function testKeepaliveDropsFeatures(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession([], 60, 100);
        $ledger->capture($a, '54', 1);
        $ledger->capture($a, '55', 1);
        $ledger->keepalive($a, ['54']);
        $this->assertSame(['55'], $ledger->sessionFeatures($a));
        $this->assertSame(['55' => 1], $ledger->usage());
    }

    public function testReleaseKeepsOtherFeaturesAndEndFreesAll(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession([], 60, 100);
        $ledger->capture($a, '54', 1);
        $ledger->capture($a, '55', 1);
        $ledger->release($a, '54');
        $this->assertSame(['55' => 1], $ledger->usage());
        $ledger->release($a, '54'); // idempotent
        $ledger->endSession($a);
        $ledger->endSession($a); // idempotent
        $ledger->endSession('0000000000000000000000000000dead'); // unknown: no error
        $this->assertSame([], $ledger->usage());
    }

    public function testOverLimitIsAskedByRankSoOneRoundShedsTheWholeExcess(): void
    {
        $ledger = $this->newLedger();
        $sessions = [];
        foreach (['a', 'b', 'c'] as $name) {
            $sessions[$name] = $ledger->startSession(['username' => $name], 60, 100);
            $ledger->capture($sessions[$name], '54', 3);
            $this->wallClock += 1;
        }

        // Limit cut to one: both later holders answer "over limit" in the same round, not one per round.
        $this->assertFalse($ledger->isOverLimit($sessions['a'], '54', 1), 'the oldest holder keeps it');
        $this->assertTrue($ledger->isOverLimit($sessions['b'], '54', 1));
        $this->assertTrue($ledger->isOverLimit($sessions['c'], '54', 1));
        // Cut to two: only the newest is over.
        $this->assertFalse($ledger->isOverLimit($sessions['b'], '54', 2));
        $this->assertTrue($ledger->isOverLimit($sessions['c'], '54', 2));

        $this->assertFalse($ledger->isOverLimit($sessions['a'], '55', 1), 'a feature this session never took');
        $this->assertFalse($ledger->isOverLimit('0000000000000000000000000000dead', '54', 1));

        // The seats are given back: the one left behind is within any limit again.
        $ledger->release($sessions['b'], '54');
        $ledger->release($sessions['c'], '54');
        $this->assertFalse($ledger->isOverLimit($sessions['a'], '54', 1));
    }

    public function testSimultaneousCapturesMakeBothHoldersDroppable(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession([], 60, 100);
        $b = $ledger->startSession([], 60, 100);
        $ledger->capture($a, '54', 3);
        $ledger->capture($b, '54', 3);
        // Known simplification: capture times have a granularity of one second, so a cut to one
        // seat frees two rather than leaving both holders convinced they are within the limit.
        $this->assertTrue($ledger->isOverLimit($a, '54', 1));
        $this->assertTrue($ledger->isOverLimit($b, '54', 1));
        $this->assertFalse($ledger->isOverLimit($a, '54', 2), 'within the limit nobody is over it');
    }

    public function testCaptureWithoutLimitTakesNoSeatAndDoesNotRenewTheLease(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession([], 60, 100);
        $ledger->capture($a, '54', 1);
        $this->wallClock += 50;
        $this->assertSame(10, $ledger->capture($a, '55', null), 'what is left of the lease, not a full ttl');
        $this->assertSame(['54' => 1], $ledger->usage(), 'a feature without a limit takes no seat');
        $this->wallClock += 15;
        $this->expectException(SeatException::class);
        $ledger->keepalive($a);
    }

    public function testClockRollbackDoesNotExtendLeasesBeyondTheirTtl(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession([], 60, 100);
        $ledger->capture($a, '54', 1);
        $this->wallClock -= 3600; // system clock jumped back an hour
        $this->assertSame(60, $ledger->keepalive($a), 'lease is clamped to now + ttl');
        $this->wallClock += 60;
        $this->expectException(SeatException::class);
        $ledger->keepalive($a);
    }

    /**
     * keepalive() overwrites expires itself, so it can't tell us whether the rollback clamp in
     * transaction() actually fired. Use a read-only observer (usage/sessionFeatures) instead: the
     * clamp is the only thing that can shorten expires here.
     */
    public function testClockRollbackClampIsPersistedEvenWithoutKeepalive(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession([], 60, 100);
        $ledger->capture($a, '54', 1);
        $this->wallClock -= 3600; // system clock jumped back an hour
        $ledger->usage(); // clamp fires and is persisted: expires = now + 60
        $this->wallClock += 60;
        $this->expectException(SeatException::class);
        $ledger->sessionFeatures($a); // without the clamp this would still return ['54']
    }

    public function testCorruptFileFailsClosedAndIsSetAside(): void
    {
        $ledger = $this->newLedger();
        $ledger->startSession([], 60, 100);
        file_put_contents("$this->dir/seats.json", '{"v":1,"wall":1,"sessions":"nope"}');
        try {
            $ledger->startSession([], 60, 100);
            $this->fail('corrupt ledger accepted');
        } catch (RuntimeException $e) {
            $this->assertFileExists("$this->dir/seats.json.corrupt");
        }
        $this->assertSame([], $ledger->usage(), 'next call starts clean');
    }

    public function testEmptyFileIsCorruptToo(): void
    {
        $ledger = $this->newLedger();
        file_put_contents("$this->dir/seats.json", '');
        $this->expectException(RuntimeException::class);
        $ledger->usage();
    }

    public function testTwoProcessesRaceForTheLastSeatExactlyOneWins(): void
    {
        if (!function_exists('pcntl_fork')) {
            $this->markTestSkipped('pcntl is not available');
        }
        $ledger = new SeatLedger($this->dir);
        $a = $ledger->startSession([], 60, 100);
        $b = $ledger->startSession([], 60, 100);
        $results = [];
        foreach ([$a, $b] as $sessionId) {
            $pid = pcntl_fork();
            if ($pid === 0) {
                try {
                    (new SeatLedger($this->dir))->capture($sessionId, '54', 1);
                    exit(0);
                } catch (SeatException) {
                    exit(51);
                } catch (\Throwable) {
                    // Anything else (lock failure, JsonException, disk full...) must not escape:
                    // an uncaught exception here lets PHPUnit run tearDown() in the child, which
                    // deletes the ledger directory the parent still owns.
                    exit(52);
                }
            }
            $results[$pid] = null;
        }
        foreach (array_keys($results) as $pid) {
            pcntl_waitpid($pid, $status);
            $results[$pid] = pcntl_wexitstatus($status);
        }
        sort($results);
        $this->assertSame([0, 51], array_values($results));
        $this->assertSame(['54' => 1], $ledger->usage());
    }

    public function testReportTracksPeakAndDeniedUntilAccepted(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession(['username' => 'a'], 300, 100);
        $b = $ledger->startSession(['username' => 'b'], 300, 100);
        $c = $ledger->startSession(['username' => 'c'], 300, 100);
        $ledger->capture($a, '54', 2);
        $ledger->capture($b, '54', 2);
        try {
            $ledger->capture($c, '54', 2);
            $this->fail('third seat granted');
        } catch (SeatException $e) {
            $this->assertSame(SeatException::NO_SEATS, $e->extcode);
        }
        $this->assertSame(1, $this->newLedger()->report()['usage']['54']['denied'], 'the refusal is on disk');
        $ledger->release($a, '54');

        $sent = $ledger->report();
        $this->assertSame(['54' => ['used' => 1, 'peak' => 2, 'denied' => 1]], $sent['usage']);
        $this->assertSame(['54' => 1], $sent['marks']['denied']);

        // Refused while the answer to $sent is on its way: must survive that answer.
        try {
            $ledger->capture($c, '54', 1);
        } catch (SeatException) {
        }
        $ledger->reportAccepted($sent['marks']);
        $this->assertSame(['54' => ['used' => 1, 'peak' => 1, 'denied' => 1]], $ledger->report()['usage']);

        $ledger->reportAccepted($ledger->report()['marks']);
        $ledger->endSession($b);
        $this->assertSame(['54' => ['used' => 0, 'peak' => 1, 'denied' => 0]], $ledger->report()['usage']);
        $ledger->reportAccepted($ledger->report()['marks']);
        $this->assertSame([], $ledger->report()['usage']);
    }

    public function testOverlappingAnswersNeitherRepeatNorLoseRefusals(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession([], 300, 100);
        $b = $ledger->startSession([], 300, 100);
        $ledger->capture($a, '54', 1);
        $refuse = static function (int $times) use ($ledger, $b): void {
            for ($i = 0; $i < $times; $i++) {
                try {
                    $ledger->capture($b, '54', 1);
                } catch (SeatException) {
                }
            }
        };
        $refuse(5);
        $online = $ledger->report();
        $offline = $ledger->report();

        $ledger->reportAccepted($online['marks']);
        $this->assertSame(0, $ledger->report()['usage']['54']['denied']);
        $refuse(2);
        // The file answer covers the same five refusals: it must neither subtract them again nor eat the new two.
        $ledger->reportAccepted($offline['marks']);
        $this->assertSame(2, $ledger->report()['usage']['54']['denied']);

        // A mark beyond what happened confirms no future refusals.
        $ledger->reportAccepted(['gen' => $online['marks']['gen'], 'denied' => ['54' => 999]]);
        $refuse(1);
        $this->assertSame(1, $ledger->report()['usage']['54']['denied']);
    }

    public function testMarksOfAnEarlierLedgerConfirmNothing(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession([], 300, 100);
        $b = $ledger->startSession([], 300, 100);
        $ledger->capture($a, '54', 1);
        for ($i = 0; $i < 5; $i++) {
            try {
                $ledger->capture($b, '54', 1);
            } catch (SeatException) {
            }
        }
        $exported = $ledger->report();

        // The ledger is set aside as corrupt and starts again; two refusals happen in the new one.
        file_put_contents("$this->dir/seats.json", 'not json');
        try {
            $ledger->report();
        } catch (RuntimeException) {
        }
        $c = $ledger->startSession([], 300, 100);
        $d = $ledger->startSession([], 300, 100);
        $ledger->capture($c, '54', 1);
        for ($i = 0; $i < 2; $i++) {
            try {
                $ledger->capture($d, '54', 1);
            } catch (SeatException) {
            }
        }

        $ledger->reportAccepted($exported['marks']);
        $this->assertSame(2, $ledger->report()['usage']['54']['denied']);
    }

    public function testCaptureWithoutLimitIsNotReported(): void
    {
        $ledger = $this->newLedger();
        $ledger->capture($ledger->startSession([], 300, 100), '54', null);
        $this->assertSame([], $ledger->report()['usage']);
    }

    public function testDropRemovesOnlyListedHolders(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession(['username' => 'a'], 300, 100);
        $b = $ledger->startSession(['username' => 'b'], 300, 100);
        $ledger->capture($a, '54', 2);
        $ledger->capture($b, '54', 2);

        $ledger->drop([SeatLedger::ref($a), 'ffffffffffffffff']);

        $this->assertSame(['54' => 1], $ledger->usage());
        try {
            $ledger->keepalive($a);
            $this->fail('dropped session is still alive');
        } catch (SeatException $e) {
            $this->assertSame(SeatException::NO_SESSION, $e->extcode);
        }
        $this->assertSame(300, $ledger->keepalive($b));
    }

    public function testHoldersSnapshotHidesSessionIds(): void
    {
        $ledger = $this->newLedger();
        $a = $ledger->startSession(['username' => 'ivanov', 'ref' => 'forged'], 300, 100);
        $ledger->capture($a, '54', 2);
        $ledger->startSession(['username' => 'idle'], 300, 100);

        $holders = $ledger->holders();

        $this->assertSame(
            [['ref' => SeatLedger::ref($a), 'features' => ['54'], 'since' => self::NOW, 'username' => 'ivanov']],
            $holders
        );
        $this->assertStringNotContainsString($a, (string)json_encode($holders));
    }

    public function testLedgerWrittenBeforeReportsIsReadAsEmpty(): void
    {
        file_put_contents("$this->dir/seats.json", json_encode(['v' => 1, 'wall' => self::NOW, 'sessions' => [
            'aa' => ['holder' => [], 'ttl' => 300, 'expires' => self::NOW + 300, 'features' => ['54']],
        ]]));
        $ledger = $this->newLedger();
        $this->assertSame(['54' => ['used' => 1, 'peak' => 1, 'denied' => 0]], $ledger->report()['usage']);
        $this->assertSame(0, $ledger->holders()[0]['since']);
    }

    public function testMalformedReportCountersAreCorrupt(): void
    {
        file_put_contents("$this->dir/seats.json", json_encode([
            'v' => 1, 'wall' => self::NOW, 'sessions' => [],
            'report' => ['54' => ['peak' => 'x', 'denied' => 0, 'acked' => 0]],
        ]));
        $this->expectException(RuntimeException::class);
        $this->newLedger()->report();
    }

    private function newLedger(): SeatLedger
    {
        return new SeatLedger($this->dir, fn(): int => $this->wallClock);
    }
}
