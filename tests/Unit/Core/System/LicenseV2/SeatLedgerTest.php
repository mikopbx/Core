<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\LicenseV2;

use MikoPBX\Core\System\LicenseV2\SeatException;
use MikoPBX\Core\System\LicenseV2\SeatLedger;
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
        $this->expectException(RuntimeException::class);
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

    private function newLedger(): SeatLedger
    {
        return new SeatLedger($this->dir, fn(): int => $this->wallClock);
    }
}
