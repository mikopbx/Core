<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/**
 * In-memory debounce for terminal CEL events.
 */
final class LinkedIdFinalizationQueue
{
    /** @var array<string, array{end: string, dueAt: float}> */
    private array $pending = [];

    public function __construct(private readonly float $delaySeconds)
    {
    }

    public function schedule(string $linkedId, string $eventTime, float $now): void
    {
        if ($linkedId === '' || $eventTime === '') {
            return;
        }

        $currentEnd = $this->pending[$linkedId]['end'] ?? '';
        $this->pending[$linkedId] = [
            'end' => $currentEnd === '' || strcmp($eventTime, $currentEnd) > 0 ? $eventTime : $currentEnd,
            'dueAt' => $now + $this->delaySeconds,
        ];
    }

    /**
     * @return array<string, string>
     */
    public function due(float $now): array
    {
        $due = [];
        foreach ($this->pending as $linkedId => $entry) {
            if ($entry['dueAt'] > $now) {
                continue;
            }
            $due[$linkedId] = $entry['end'];
        }

        return $due;
    }

    public function acknowledge(string $linkedId, string $eventTime): void
    {
        if (($this->pending[$linkedId]['end'] ?? null) === $eventTime) {
            unset($this->pending[$linkedId]);
        }
    }

    public function retry(string $linkedId, string $eventTime, float $now, float $delaySeconds): void
    {
        if (($this->pending[$linkedId]['end'] ?? null) !== $eventTime) {
            return;
        }
        $this->pending[$linkedId]['dueAt'] = $now + $delaySeconds;
    }
}
