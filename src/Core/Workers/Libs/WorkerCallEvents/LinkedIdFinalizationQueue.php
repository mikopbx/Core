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

        $this->pending[$linkedId] = [
            'end' => $eventTime,
            'dueAt' => $now + $this->delaySeconds,
        ];
    }

    /**
     * @return array<string, string>
     */
    public function takeDue(float $now): array
    {
        $due = [];
        foreach ($this->pending as $linkedId => $entry) {
            if ($entry['dueAt'] > $now) {
                continue;
            }
            $due[$linkedId] = $entry['end'];
            unset($this->pending[$linkedId]);
        }

        return $due;
    }
}
