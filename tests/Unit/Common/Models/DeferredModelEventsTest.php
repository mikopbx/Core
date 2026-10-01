<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Models;

use MikoPBX\Common\Models\DeferredModelEvents;
use PHPUnit\Framework\TestCase;

final class DeferredModelEventsTest extends TestCase
{
    protected function tearDown(): void
    {
        DeferredModelEvents::clear();
        parent::tearDown();
    }

    public function testDrainReturnsEventsInInsertionOrderAndEmptiesBuffer(): void
    {
        $first = ['model' => 'FirstModel', 'recordId' => '1'];
        $second = ['model' => 'SecondModel', 'recordId' => '2'];

        DeferredModelEvents::enqueue($first);
        DeferredModelEvents::enqueue($second);

        self::assertSame([$first, $second], DeferredModelEvents::drain());
        self::assertSame([], DeferredModelEvents::drain());
    }

    public function testClearDiscardsQueuedEvents(): void
    {
        DeferredModelEvents::enqueue(['model' => 'RolledBackModel', 'recordId' => '3']);

        DeferredModelEvents::clear();

        self::assertSame([], DeferredModelEvents::drain());
    }
}
