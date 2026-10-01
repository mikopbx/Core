<?php

declare(strict_types=1);

namespace MikoPBX\Common\Models;

/**
 * Process-local FIFO buffer for model events created inside a database transaction.
 */
final class DeferredModelEvents
{
    /** @var list<array<string, mixed>> */
    private static array $events = [];

    /**
     * @param array<string, mixed> $event
     */
    public static function enqueue(array $event): void
    {
        self::$events[] = $event;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function drain(): array
    {
        $events = self::$events;
        self::$events = [];
        return $events;
    }

    public static function clear(): void
    {
        self::$events = [];
    }
}
