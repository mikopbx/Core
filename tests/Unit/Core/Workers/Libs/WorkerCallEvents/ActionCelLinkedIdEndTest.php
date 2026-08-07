<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\ActionCelLinkedIdEnd;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

final class ActionCelLinkedIdEndTest extends TestCase
{
    public function testClosesRowsWithoutChangingCallOutcomeFields(): void
    {
        $row = new FakeTemporaryCdrRow([
            'endtime' => '',
            'transfer' => 1,
            'answer' => '2026-08-06 14:27:37',
            'recordingfile' => '/monitor/call.wav',
            'dialstatus' => 'ANSWERED',
        ]);
        $method = new ReflectionMethod(ActionCelLinkedIdEnd::class, 'closeRows');
        $method->setAccessible(true);

        self::assertSame(1, $method->invoke(null, [$row], '2026-08-06 14:46:40'));
        self::assertSame('2026-08-06 14:46:40', $row->attributes['endtime']);
        self::assertSame(0, $row->attributes['transfer']);
        self::assertSame('2026-08-06 14:27:37', $row->attributes['answer']);
        self::assertSame('/monitor/call.wav', $row->attributes['recordingfile']);
        self::assertSame('ANSWERED', $row->attributes['dialstatus']);
    }
}

final class FakeTemporaryCdrRow
{
    public function __construct(public array $attributes)
    {
    }

    public function writeAttribute(string $name, mixed $value): void
    {
        $this->attributes[$name] = $value;
    }

    public function save(): bool
    {
        return true;
    }

    public function getMessages(): array
    {
        return [];
    }
}
