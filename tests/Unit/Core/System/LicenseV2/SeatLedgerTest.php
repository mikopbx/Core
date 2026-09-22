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

    public function testTtlBoundsHolderSizeAndSessionCeiling(): void
    {
        $ledger = $this->newLedger();
        $this->expectException(RuntimeException::class);
        $ledger->startSession([], 10, 100);
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

    private function newLedger(): SeatLedger
    {
        return new SeatLedger($this->dir, fn(): int => $this->wallClock);
    }
}
