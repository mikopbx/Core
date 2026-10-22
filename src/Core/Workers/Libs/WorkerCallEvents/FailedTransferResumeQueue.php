<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/**
 * In-memory retry schedule for resuming the operator's recording after a failed attended transfer.
 *
 * transfer_dial_hangup can arrive before Asterisk has moved the operator back into the bridge
 * with the caller (e.g. the transfer leg is hung up by Busy() inside a custom Gosub and the
 * event is sent from its hangup handler). At that moment BRIDGEPEER does not name the caller
 * yet, so the resume check is repeated a few times instead of being given up on.
 */
final class FailedTransferResumeQueue
{
    /** @var array<string, array{linkedid: string, attemptsLeft: int, dueAt: float}> keyed by transferer */
    private array $pending = [];

    public function __construct(
        private readonly float $intervalSeconds,
        private readonly int $maxAttempts
    ) {
    }

    public function schedule(string $transferer, string $linkedId, float $now): void
    {
        if ($transferer === '' || $linkedId === '' || $this->maxAttempts < 1) {
            return;
        }

        $this->pending[$transferer] = [
            'linkedid' => $linkedId,
            'attemptsLeft' => $this->maxAttempts,
            'dueAt' => $now + $this->intervalSeconds,
        ];
    }

    /**
     * @return array<string, string> transferer => linkedid
     */
    public function due(float $now): array
    {
        $due = [];
        foreach ($this->pending as $transferer => $entry) {
            if ($entry['dueAt'] > $now) {
                continue;
            }
            $due[$transferer] = $entry['linkedid'];
        }

        return $due;
    }

    public function acknowledge(string $transferer): void
    {
        unset($this->pending[$transferer]);
    }

    /**
     * Consumes one attempt and reschedules the entry.
     *
     * @return bool false when the attempts are exhausted and the entry was dropped.
     */
    public function retry(string $transferer, float $now): bool
    {
        if (!isset($this->pending[$transferer])) {
            return false;
        }

        $attemptsLeft = $this->pending[$transferer]['attemptsLeft'] - 1;
        if ($attemptsLeft < 1) {
            unset($this->pending[$transferer]);
            return false;
        }

        $this->pending[$transferer]['attemptsLeft'] = $attemptsLeft;
        $this->pending[$transferer]['dueAt'] = $now + $this->intervalSeconds;
        return true;
    }
}
