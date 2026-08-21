<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Asterisk\AmiSessionSnapshot;
use MikoPBX\Core\Asterisk\AmiSessionWatchdog;
use PHPUnit\Framework\TestCase;

final class AmiSessionWatchdogTest extends TestCase
{
    private int $now = 1_000;

    /** @var list<AmiSessionSnapshot> */
    private array $snapshots = [];

    /** @var list<int> */
    private array $kicks = [];

    /** @var list<array{level: string, event: string, context: array}> */
    private array $logs = [];

    public function testHiddenAutoKickSettingIsDisabledByDefault(): void
    {
        self::assertSame('AMIStalledSessionAutoKick', PbxSettings::AMI_STALLED_SESSION_AUTO_KICK);
        $defaults = PbxSettings::getDefaultArrayValues();
        self::assertSame('0', $defaults[PbxSettings::AMI_STALLED_SESSION_AUTO_KICK]);
    }

    public function testSustainedWarningIsLoggedOnceAndRecoveryClearsHistory(): void
    {
        $watchdog = $this->newWatchdog();
        $this->snapshots = [$this->snapshot(65_536)];
        $watchdog->check(false);
        $this->now += 30;
        $watchdog->check(false);
        $this->now += 30;
        $watchdog->check(false);

        self::assertCount(1, $this->logsFor('ami_backlog_warning'));

        $this->snapshots = [$this->snapshot(0)];
        $watchdog->check(false);
        $this->now += 30;
        $this->snapshots = [$this->snapshot(65_536)];
        $watchdog->check(false);
        $this->now += 30;
        $watchdog->check(false);

        self::assertCount(2, $this->logsFor('ami_backlog_warning'));
    }

    public function testSingleOwnerAndExternalCandidatesRemainObserveOnly(): void
    {
        $singleOwnerWatchdog = $this->newWatchdog();
        $this->driveCandidate($singleOwnerWatchdog, $this->snapshot(98_304, [101]), true);
        self::assertSame([], $this->kicks);
        self::assertSame('single_owner', $this->lastCandidateReason());

        $this->resetHarness();
        $externalWatchdog = $this->newWatchdog();
        $this->driveCandidate(
            $externalWatchdog,
            $this->snapshot(98_304, [], '192.0.2.10'),
            true
        );
        self::assertSame([], $this->kicks);
        self::assertSame('external_endpoint', $this->lastCandidateReason());
    }

    public function testInheritedLocalCandidateIsObservedWhenDisabledAndKickedWhenEnabled(): void
    {
        $observeWatchdog = $this->newWatchdog();
        $this->driveCandidate($observeWatchdog, $this->snapshot(98_304, [101, 202]), false);
        self::assertSame([], $this->kicks);
        self::assertSame('auto_kick_disabled', $this->lastCandidateReason());

        $this->resetHarness();
        $kickWatchdog = $this->newWatchdog();
        $this->driveCandidate($kickWatchdog, $this->snapshot(98_304, [101, 202]), true);
        self::assertSame([14], $this->kicks);
        self::assertCount(1, $this->logsFor('ami_session_kick'));
    }

    public function testLargeQueueProgressRestartsCandidateWindow(): void
    {
        $watchdog = $this->newWatchdog();
        for ($sample = 0; $sample < 8; $sample++) {
            $this->snapshots = [$this->snapshot(150_000, [101, 202])];
            $watchdog->check(true);
            $this->now += 15;
        }
        $this->snapshots = [$this->snapshot(117_232, [101, 202])];
        $watchdog->check(true);

        for ($sample = 0; $sample < 7; $sample++) {
            $this->now += 15;
            $watchdog->check(true);
        }
        self::assertSame([], $this->kicks);

        $this->now += 15;
        $watchdog->check(true);
        self::assertSame([14], $this->kicks);
    }

    public function testRevalidationIdentityChangeCancelsKick(): void
    {
        $providerCalls = 0;
        $original = $this->snapshot(98_304, [101, 202]);
        $replacement = $this->snapshot(98_304, [101, 202], '127.0.0.1', 14, 9999, 'new-start');
        $watchdog = $this->newWatchdog(static function () use (&$providerCalls, $original, $replacement): array {
            $providerCalls++;
            return $providerCalls === 10 ? [$replacement] : [$original];
        });

        $this->driveCandidate($watchdog, $original, true, false);

        self::assertSame([], $this->kicks);
        self::assertSame('identity_changed', $this->lastCandidateReason());
    }

    public function testRevalidationQueueRecoveryCancelsKick(): void
    {
        $providerCalls = 0;
        $original = $this->snapshot(98_304, [101, 202]);
        $recovered = $this->snapshot(0, [101, 202]);
        $watchdog = $this->newWatchdog(static function () use (&$providerCalls, $original, $recovered): array {
            $providerCalls++;
            return $providerCalls === 10 ? [$recovered] : [$original];
        });

        $this->driveCandidate($watchdog, $original, true, false);

        self::assertSame([], $this->kicks);
        self::assertSame('conditions_changed', $this->lastCandidateReason());
    }

    public function testOneKickPerPassGlobalLimitAndEndpointCooldown(): void
    {
        $watchdog = $this->newWatchdog();
        $sessions = [
            $this->snapshot(98_304, [1, 2], '127.0.0.1', 14, 1111, 'start-a', 'user-a', 55001),
            $this->snapshot(98_304, [3, 4], '127.0.0.1', 15, 1112, 'start-b', 'user-b', 55002),
            $this->snapshot(98_304, [5, 6], '127.0.0.1', 16, 1113, 'start-c', 'user-c', 55003),
            $this->snapshot(98_304, [7, 8], '127.0.0.1', 17, 1114, 'start-d', 'user-d', 55004),
        ];
        for ($sample = 0; $sample < 9; $sample++) {
            $this->snapshots = $sessions;
            $watchdog->check(true);
            $this->now += 15;
        }
        self::assertCount(1, $this->kicks);
        $watchdog->check(true);
        $this->now += 15;
        $watchdog->check(true);
        $this->now += 15;
        $watchdog->check(true);

        self::assertSame([14, 15, 16], $this->kicks);
        self::assertSame('global_rate_limit', $this->lastCandidateReason());

        $this->resetHarness();
        $cooldownWatchdog = $this->newWatchdog();
        $first = $this->snapshot(98_304, [1, 2], '127.0.0.1', 20, 2000, 'first', 'same-user', 55100);
        $this->driveCandidate($cooldownWatchdog, $first, true);
        $replacement = $this->snapshot(98_304, [3, 4], '127.0.0.1', 21, 2001, 'second', 'same-user', 55100);
        $this->driveCandidate($cooldownWatchdog, $replacement, true);

        self::assertSame([20], $this->kicks);
        self::assertSame('endpoint_cooldown', $this->lastCandidateReason());
    }

    private function newWatchdog(?callable $snapshotProvider = null): AmiSessionWatchdog
    {
        return new AmiSessionWatchdog(
            snapshotProvider: $snapshotProvider ?? fn(): array => $this->snapshots,
            clock: fn(): int => $this->now,
            kickRunner: function (int $fd): array {
                $this->kicks[] = $fd;
                return ['exitCode' => 0, 'output' => 'Manager session kicked'];
            },
            logger: function (string $level, string $event, array $context): void {
                $this->logs[] = compact('level', 'event', 'context');
            },
        );
    }

    private function driveCandidate(
        AmiSessionWatchdog $watchdog,
        AmiSessionSnapshot $snapshot,
        bool $autoKick,
        bool $updateProvider = true
    ): void {
        for ($sample = 0; $sample < 9; $sample++) {
            if ($updateProvider) {
                $this->snapshots = [$snapshot];
            }
            $watchdog->check($autoKick);
            if ($sample < 8) {
                $this->now += 15;
            }
        }
    }

    /** @param list<int> $owners */
    private function snapshot(
        int $queue,
        array $owners = [101, 202],
        string $address = '127.0.0.1',
        int $fd = 14,
        int $inode = 1111,
        string $start = 'start-1',
        string $username = 'phpagi',
        int $clientPort = 55302,
    ): AmiSessionSnapshot {
        return new AmiSessionSnapshot(
            fd: $fd,
            serverInode: $inode,
            clientInode: 2222,
            serverAddress: '127.0.0.1',
            serverPort: 5038,
            clientAddress: $address,
            clientPort: $clientPort,
            sendQueueBytes: $queue,
            receiveQueueBytes: 0,
            clientSendQueueBytes: 0,
            clientReceiveQueueBytes: $queue,
            serverState: 'ESTABLISHED',
            clientState: 'ESTABLISHED',
            ownerPids: $owners,
            username: $username,
            sessionStart: $start,
        );
    }

    /** @return list<array{level: string, event: string, context: array}> */
    private function logsFor(string $event): array
    {
        return array_values(array_filter(
            $this->logs,
            static fn(array $entry): bool => $entry['event'] === $event
        ));
    }

    private function lastCandidateReason(): string
    {
        $candidates = $this->logsFor('ami_backlog_candidate');
        self::assertNotEmpty($candidates);
        return (string)end($candidates)['context']['reason'];
    }

    private function resetHarness(): void
    {
        $this->now = 1_000;
        $this->snapshots = [];
        $this->kicks = [];
        $this->logs = [];
    }
}
