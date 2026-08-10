<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

use MikoPBX\Core\Workers\WorkerCdr;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

final class WorkerCdrTerminalFinalizationTest extends TestCase
{
    public function testTerminalMessageProcessesOnlyExactLinkedIdWithoutAmi(): void
    {
        $worker = (new ReflectionClass(TestableWorkerCdr::class))->newInstanceWithoutConstructor();
        $worker->rows = [
            ['linkedid' => 'call-a', 'UNIQUEID' => 'a-1'],
            ['linkedid' => 'call-b', 'UNIQUEID' => 'b-1'],
            ['linkedid' => 'call-a', 'UNIQUEID' => 'a-1'],
        ];

        self::assertTrue($worker->handle(['linkedid' => 'call-a', 'eventTime' => '2026-08-06 14:46:40']));
        self::assertSame('call-a', $worker->loadedLinkedId);
        self::assertSame([['linkedid' => 'call-a', 'UNIQUEID' => 'a-1']], $worker->processedRows);
        self::assertSame(0, $worker->amiCalls);
    }

    public function testTerminalMessageRejectsEmptyLinkedId(): void
    {
        $worker = (new ReflectionClass(TestableWorkerCdr::class))->newInstanceWithoutConstructor();

        self::assertFalse($worker->handle(['linkedid' => '']));
        self::assertSame([], $worker->processedRows);
        self::assertSame(0, $worker->amiCalls);
    }

    public function testDuplicateTerminalMessageDoesNotProcessRowTwice(): void
    {
        $worker = (new ReflectionClass(TestableWorkerCdr::class))->newInstanceWithoutConstructor();
        $worker->rows = [['linkedid' => 'call-a', 'UNIQUEID' => 'a-1']];

        $message = ['linkedid' => 'call-a', 'eventTime' => '2026-08-06 14:46:40'];
        self::assertTrue($worker->handle($message));
        self::assertTrue($worker->handle($message));

        self::assertSame(1, $worker->processedBatches);
    }

    public function testPollingPathStillChecksAmiAndSkipsActiveLinkedId(): void
    {
        $worker = (new ReflectionClass(TestableWorkerCdr::class))->newInstanceWithoutConstructor();
        $worker->activeLinkedIds = ['call-a' => []];

        $worker->poll([
            ['linkedid' => 'call-a', 'UNIQUEID' => 'a-1'],
            ['linkedid' => 'call-b', 'UNIQUEID' => 'b-1'],
        ]);

        self::assertSame(1, $worker->amiCalls);
        self::assertSame([['linkedid' => 'call-b', 'UNIQUEID' => 'b-1']], $worker->processedRows);
    }
}

final class TestableWorkerCdr extends WorkerCdr
{
    /** @var array<int, array<string, mixed>> */
    public array $rows = [];
    /** @var array<int, array<string, mixed>> */
    public array $processedRows = [];
    public array $activeLinkedIds = [];
    public int $amiCalls = 0;
    public int $processedBatches = 0;
    public string $loadedLinkedId = '';

    public function handle(array $data): bool
    {
        return $this->processLinkedIdFinalizationMessage($data);
    }

    public function poll(array $rows): void
    {
        $this->updateCdr($rows);
    }

    protected function claimCompletedRows(array $request): array
    {
        if (($request['mode'] ?? '') === 'linkedid') {
            $this->loadedLinkedId = (string)$request['linkedid'];
            $result = [];
            $seen = [];
            foreach ($this->rows as $row) {
                if (($row['linkedid'] ?? '') !== $this->loadedLinkedId || isset($seen[$row['UNIQUEID']])) {
                    continue;
                }
                $seen[$row['UNIQUEID']] = true;
                $result[] = $row;
            }
            $this->rows = [];
            return $result;
        }
        $ids = array_flip($request['uniqueids'] ?? []);
        return array_values(array_filter($this->rows ?: [
            ['linkedid' => 'call-a', 'UNIQUEID' => 'a-1'],
            ['linkedid' => 'call-b', 'UNIQUEID' => 'b-1'],
        ], static fn(array $row): bool => isset($ids[$row['UNIQUEID']])));
    }

    protected function processCompletedRows(array $result): void
    {
        ++$this->processedBatches;
        $this->processedRows = $result;
    }

    protected function getActiveIdChannels(): array
    {
        ++$this->amiCalls;
        return $this->activeLinkedIds;
    }

    protected function logTerminalFinalization(string $message, int $level): void
    {
    }
}
