<?php

declare(strict_types=1);

namespace MikoPBX\Core\Asterisk;

use Closure;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use Throwable;

final class AmiSessionWatchdog
{
    private const CHECK_INTERVAL_SEC = 15;
    private const WARNING_BYTES = 65_536;
    private const CANDIDATE_BYTES = 98_304;
    private const RESET_BYTES = 32_768;
    private const PROGRESS_BYTES = 32_768;
    private const CANDIDATE_SAMPLES = 9;
    private const USER_COOLDOWN_SEC = 300;
    private const GLOBAL_LIMIT_WINDOW_SEC = 600;
    private const GLOBAL_LIMIT_COUNT = 3;

    private AmiSessionInspector $inspector;

    private Closure $snapshotProvider;

    private Closure $managerOutputProvider;

    private Closure $clock;

    private Closure $kickRunner;

    private Closure $logger;

    /** @var array<string, array<string, int|bool|null>> */
    private array $observations = [];

    /** @var list<int> */
    private array $kickTimestamps = [];

    /** @var array<string, int> */
    private array $cooldowns = [];

    public function __construct(
        ?AmiSessionInspector $inspector = null,
        ?callable $snapshotProvider = null,
        ?callable $managerOutputProvider = null,
        ?callable $clock = null,
        ?callable $kickRunner = null,
        ?callable $logger = null,
        private readonly int $amiPort = 5038,
    ) {
        $this->inspector = $inspector ?? new AmiSessionInspector();
        $this->managerOutputProvider = Closure::fromCallable(
            $managerOutputProvider ?? fn(): string => $this->readManagerSessions()
        );
        $this->snapshotProvider = Closure::fromCallable(
            $snapshotProvider ?? fn(): array => $this->readSnapshots()
        );
        $this->clock = Closure::fromCallable($clock ?? static fn(): int => time());
        $this->kickRunner = Closure::fromCallable(
            $kickRunner ?? fn(int $fd): array => $this->kickSession($fd)
        );
        $this->logger = Closure::fromCallable(
            $logger ?? static function (string $level, string $event, array $context): void {
                $priority = $level === 'error' ? LOG_ERR : ($level === 'warning' ? LOG_WARNING : LOG_NOTICE);
                SystemMessages::sysLogMsg(
                    self::class,
                    $event . ' ' . json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                    $priority
                );
            }
        );
    }

    public function check(bool $autoKickEnabled): void
    {
        try {
            $now = ($this->clock)();
            $snapshots = ($this->snapshotProvider)();
            $seen = [];
            $candidates = [];

            foreach ($snapshots as $snapshot) {
                if (!$snapshot instanceof AmiSessionSnapshot) {
                    continue;
                }
                $identity = $snapshot->identity();
                $seen[$identity] = true;
                if ($snapshot->sendQueueBytes < self::RESET_BYTES) {
                    unset($this->observations[$identity]);
                    continue;
                }

                $state = $this->observations[$identity] ?? $this->newObservation();
                $previousQueue = is_int($state['previousQueue']) ? $state['previousQueue'] : null;
                $this->updateWarningState($snapshot, $state, $now);
                $this->updateCandidateState($snapshot, $state, $now, $previousQueue);
                $state['previousQueue'] = $snapshot->sendQueueBytes;
                $state['lastSeen'] = $now;
                $this->observations[$identity] = $state;

                if ($this->isCandidate($state, $now)) {
                    $candidates[] = $snapshot;
                }
            }

            foreach (array_keys($this->observations) as $identity) {
                if (!isset($seen[$identity])) {
                    unset($this->observations[$identity]);
                }
            }

            foreach ($candidates as $candidate) {
                if ($this->processCandidate($candidate, $autoKickEnabled, $now)) {
                    break;
                }
            }
        } catch (Throwable $throwable) {
            ($this->logger)('error', 'ami_watchdog_error', ['message' => $throwable->getMessage()]);
        }
    }

    /** @return array<string, int|bool|null> */
    private function newObservation(): array
    {
        return [
            'previousQueue' => null,
            'warningSince' => null,
            'warningLogged' => false,
            'candidateSince' => null,
            'candidateSamples' => 0,
            'lastCandidateLog' => null,
            'lastSeen' => null,
        ];
    }

    /** @param array<string, int|bool|null> $state */
    private function updateWarningState(AmiSessionSnapshot $snapshot, array &$state, int $now): void
    {
        if ($snapshot->sendQueueBytes < self::WARNING_BYTES) {
            $state['warningSince'] = null;
            $state['warningLogged'] = false;
            return;
        }
        if (!is_int($state['warningSince'])) {
            $state['warningSince'] = $now;
        }
        if ($state['warningLogged'] === false && $now - $state['warningSince'] >= 30) {
            $state['warningLogged'] = true;
            ($this->logger)('warning', 'ami_backlog_warning', $this->context($snapshot, $now - $state['warningSince'], 'observe'));
        }
    }

    /** @param array<string, int|bool|null> $state */
    private function updateCandidateState(
        AmiSessionSnapshot $snapshot,
        array &$state,
        int $now,
        ?int $previousQueue
    ): void {
        if ($snapshot->sendQueueBytes < self::CANDIDATE_BYTES) {
            $state['candidateSince'] = null;
            $state['candidateSamples'] = 0;
            return;
        }

        $madeProgress = $previousQueue !== null
            && $previousQueue - $snapshot->sendQueueBytes >= self::PROGRESS_BYTES;
        if (!is_int($state['candidateSince']) || $madeProgress) {
            $state['candidateSince'] = $now;
            $state['candidateSamples'] = 1;
            return;
        }
        $state['candidateSamples'] = (int)$state['candidateSamples'] + 1;
    }

    /** @param array<string, int|bool|null> $state */
    private function isCandidate(array $state, int $now): bool
    {
        return is_int($state['candidateSince'])
            && (int)$state['candidateSamples'] >= self::CANDIDATE_SAMPLES
            && $now - $state['candidateSince'] >= self::CHECK_INTERVAL_SEC * (self::CANDIDATE_SAMPLES - 1);
    }

    /**
     * Returns true when an automatic kick attempt consumed this inspection pass.
     */
    private function processCandidate(AmiSessionSnapshot $candidate, bool $autoKickEnabled, int $now): bool
    {
        if (!$candidate->isLocalhost()) {
            $this->logCandidate($candidate, 'external_endpoint', $now);
            return false;
        }
        if (!$candidate->hasStrongStaleDescriptorEvidence()) {
            $this->logCandidate($candidate, 'single_owner', $now);
            return false;
        }

        $cooldownKey = $candidate->username . '|' . $candidate->endpoint();
        if (isset($this->cooldowns[$cooldownKey])
            && $now - $this->cooldowns[$cooldownKey] < self::USER_COOLDOWN_SEC
        ) {
            $this->logCandidate($candidate, 'endpoint_cooldown', $now);
            return false;
        }

        $this->kickTimestamps = array_values(array_filter(
            $this->kickTimestamps,
            static fn(int $timestamp): bool => $now - $timestamp < self::GLOBAL_LIMIT_WINDOW_SEC
        ));
        if (count($this->kickTimestamps) >= self::GLOBAL_LIMIT_COUNT) {
            $this->logCandidate($candidate, 'global_rate_limit', $now);
            return false;
        }

        $revalidated = $this->findSnapshotByIdentity(($this->snapshotProvider)(), $candidate->identity());
        if ($revalidated === null) {
            $this->logCandidate($candidate, 'identity_changed', $now);
            return false;
        }
        if ($revalidated->sendQueueBytes < self::CANDIDATE_BYTES
            || !$revalidated->isLocalhost()
            || !$revalidated->hasStrongStaleDescriptorEvidence()
        ) {
            $this->logCandidate($candidate, 'conditions_changed', $now);
            return false;
        }
        if (!$autoKickEnabled) {
            $this->logCandidate($revalidated, 'auto_kick_disabled', $now);
            return false;
        }

        $result = ($this->kickRunner)((int)$revalidated->fd);
        $this->kickTimestamps[] = $now;
        $this->cooldowns[$cooldownKey] = $now;
        unset($this->observations[$candidate->identity()]);
        $stillConnected = $this->findSnapshotByIdentity(
            ($this->snapshotProvider)(),
            $candidate->identity()
        ) !== null;
        ($this->logger)(
            ((int)($result['exitCode'] ?? 1) === 0) ? 'warning' : 'error',
            'ami_session_kick',
            $this->context($revalidated, 0, 'kick') + [
                'exitCode' => (int)($result['exitCode'] ?? 1),
                'result' => (string)($result['output'] ?? ''),
                'sessionStillConnected' => $stillConnected,
            ]
        );
        return true;
    }

    private function logCandidate(AmiSessionSnapshot $snapshot, string $reason, int $now): void
    {
        $identity = $snapshot->identity();
        if (!isset($this->observations[$identity])) {
            return;
        }
        $lastLog = $this->observations[$identity]['lastCandidateLog'];
        if (is_int($lastLog) && $now - $lastLog < self::USER_COOLDOWN_SEC) {
            return;
        }
        $this->observations[$identity]['lastCandidateLog'] = $now;
        $candidateSince = $this->observations[$identity]['candidateSince'];
        $duration = is_int($candidateSince) ? $now - $candidateSince : 0;
        ($this->logger)(
            'warning',
            'ami_backlog_candidate',
            $this->context($snapshot, $duration, 'observe') + ['reason' => $reason]
        );
    }

    /** @return array<string, int|string|bool|list<int>> */
    private function context(AmiSessionSnapshot $snapshot, int $duration, string $action): array
    {
        return [
            'username' => $snapshot->username,
            'fd' => $snapshot->fd,
            'endpoint' => $snapshot->endpoint(),
            'sendQueueBytes' => $snapshot->sendQueueBytes,
            'clientReceiveQueueBytes' => $snapshot->clientReceiveQueueBytes,
            'durationSeconds' => $duration,
            'ownerPids' => $snapshot->ownerPids,
            'serverState' => $snapshot->serverState,
            'clientState' => $snapshot->clientState,
            'action' => $action,
        ];
    }

    /**
     * @param mixed $snapshots
     */
    private function findSnapshotByIdentity(mixed $snapshots, string $identity): ?AmiSessionSnapshot
    {
        if (!is_array($snapshots)) {
            return null;
        }
        foreach ($snapshots as $snapshot) {
            if ($snapshot instanceof AmiSessionSnapshot && $snapshot->identity() === $identity) {
                return $snapshot;
            }
        }
        return null;
    }

    /** @return list<AmiSessionSnapshot> */
    private function readSnapshots(): array
    {
        $asteriskPid = $this->inspector->findAsteriskPid();
        if ($asteriskPid === null || !$this->inspector->hasQueuedAmiSockets($asteriskPid, $this->amiPort)) {
            return [];
        }
        return $this->inspector->inspect(
            $asteriskPid,
            $this->amiPort,
            (string)($this->managerOutputProvider)()
        );
    }

    private function readManagerSessions(): string
    {
        $asterisk = Util::which('asterisk');
        $output = [];
        Processes::mwExec($asterisk . ' -rx ' . escapeshellarg('manager show connected'), $output);
        return implode("\n", $output);
    }

    /** @return array{exitCode: int, output: string} */
    private function kickSession(int $fd): array
    {
        $asterisk = Util::which('asterisk');
        $output = [];
        $exitCode = -1;
        Processes::mwExec(
            $asterisk . ' -rx ' . escapeshellarg('manager kick session ' . (int)$fd),
            $output,
            $exitCode
        );
        return ['exitCode' => $exitCode, 'output' => implode(' ', $output)];
    }
}
