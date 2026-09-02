<?php

declare(strict_types=1);

// Test doubles stay next to the lifecycle tests they support.
// phpcs:disable PSR1.Classes.ClassDeclaration.MultipleClasses

namespace MikoPBX\Tests\Unit\Common\Models;

use MikoPBX\Common\Models\DeferredModelEvents;
use MikoPBX\Common\Models\ModelsBase;
use MikoPBX\Common\Providers\BeanstalkConnectionModelsProvider;
use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use Phalcon\Di\Di;
use Phalcon\Di\FactoryDefault;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class ModelsBaseDeferredEventsTest extends TestCase
{
    private TransactionState $state;
    private CapturingQueue $queue;
    private CapturingEventBus $eventBus;

    protected function setUp(): void
    {
        parent::setUp();
        DeferredModelEvents::clear();

        $this->state = new TransactionState();
        $this->queue = new CapturingQueue($this->state);
        $this->eventBus = new CapturingEventBus($this->state);

        $di = new FactoryDefault();
        $di->setShared(MainDatabaseProvider::SERVICE_NAME, new TransactionDatabase($this->state));
        $di->setShared(MutexProvider::SERVICE_NAME, new ImmediateMutex());
        $di->setShared(BeanstalkConnectionModelsProvider::SERVICE_NAME, $this->queue);
        $di->setShared(EventBusProvider::SERVICE_NAME, $this->eventBus);
        Di::setDefault($di);
    }

    protected function tearDown(): void
    {
        ModelsBase::discardPendingModelEvents();
        Di::reset();
        parent::tearDown();
    }

    public function testTransactionPublishesModelEventOnlyAfterCommit(): void
    {
        BaseActionHelper::executeInTransaction(function (): void {
            TestableModelsBase::dispatch([
                'model' => 'ExampleModel',
                'recordId' => '3',
                'action' => 'afterSave',
                'changedFields' => ['agent'],
            ]);

            self::assertSame([], $this->queue->messages);
            self::assertSame([], $this->eventBus->messages);
        });

        self::assertTrue($this->state->committed);
        self::assertCount(1, $this->queue->messages);
        self::assertCount(1, $this->eventBus->messages);
        self::assertTrue($this->queue->messages[0]['afterCommit']);
        self::assertTrue($this->eventBus->messages[0]['afterCommit']);
        self::assertSame(
            [
                'source' => BeanstalkConnectionModelsProvider::SOURCE_MODELS_CHANGED,
                'model' => 'ExampleModel',
                'recordId' => '3',
                'action' => 'afterSave',
                'changedFields' => ['agent'],
            ],
            json_decode($this->queue->messages[0]['payload'], true)
        );
        self::assertSame('models-changed', $this->eventBus->messages[0]['type']);
        self::assertSame('ExampleModel', $this->eventBus->messages[0]['data']['model']);
    }

    public function testRollbackDiscardsDeferredModelEvent(): void
    {
        try {
            BaseActionHelper::executeInTransaction(function (): void {
                TestableModelsBase::dispatch([
                    'model' => 'ExampleModel',
                    'recordId' => '3',
                    'action' => 'afterSave',
                    'changedFields' => ['agent'],
                ]);
                throw new RuntimeException('rollback');
            });
            self::fail('Expected transaction callback to fail');
        } catch (RuntimeException $exception) {
            self::assertSame('rollback', $exception->getMessage());
        }

        self::assertTrue($this->state->rolledBack);
        self::assertSame([], $this->queue->messages);
        self::assertSame([], $this->eventBus->messages);
    }

    public function testNestedTransactionFlushesOnlyAfterOuterCommit(): void
    {
        BaseActionHelper::executeInTransaction(function (): void {
            BaseActionHelper::executeInTransaction(function (): void {
                TestableModelsBase::dispatch([
                    'model' => 'NestedModel',
                    'recordId' => '4',
                    'action' => 'afterSave',
                    'changedFields' => ['name'],
                ]);
            });

            self::assertSame([], $this->queue->messages);
            self::assertFalse($this->state->committed);
        });

        self::assertCount(1, $this->queue->messages);
        self::assertTrue($this->queue->messages[0]['afterCommit']);
    }

    public function testModelEventOutsideTransactionIsPublishedImmediately(): void
    {
        TestableModelsBase::dispatch([
            'model' => 'ExampleModel',
            'recordId' => '3',
            'action' => 'afterSave',
            'changedFields' => ['agent'],
        ]);

        self::assertCount(1, $this->queue->messages);
        self::assertCount(1, $this->eventBus->messages);
        self::assertFalse($this->queue->messages[0]['afterCommit']);
    }
}

final class TestableModelsBase extends ModelsBase
{
    /** @param array<string, mixed> $event */
    public static function dispatch(array $event): void
    {
        parent::dispatchModelChangeEvent($event);
    }
}

final class TransactionState
{
    public bool $underTransaction = false;
    public bool $committed = false;
    public bool $rolledBack = false;
}

final class TransactionDatabase
{
    public function __construct(private readonly TransactionState $state)
    {
    }

    public function isUnderTransaction(): bool
    {
        return $this->state->underTransaction;
    }

    public function begin(): void
    {
        $this->state->underTransaction = true;
    }

    public function commit(): void
    {
        $this->state->underTransaction = false;
        $this->state->committed = true;
    }

    public function rollback(): void
    {
        $this->state->underTransaction = false;
        $this->state->rolledBack = true;
    }
}

final class ImmediateMutex
{
    public function synchronized(string $name, callable $callback, int $timeout, int $ttl): mixed
    {
        return $callback();
    }
}

final class CapturingQueue
{
    /** @var list<array{payload: string, afterCommit: bool}> */
    public array $messages = [];

    public function __construct(private readonly TransactionState $state)
    {
    }

    public function publish(string $payload): void
    {
        $this->messages[] = ['payload' => $payload, 'afterCommit' => $this->state->committed];
    }
}

final class CapturingEventBus
{
    /** @var list<array{type: string, data: array<string, mixed>, afterCommit: bool}> */
    public array $messages = [];

    public function __construct(private readonly TransactionState $state)
    {
    }

    /** @param array<string, mixed> $data */
    public function publish(string $type, array $data): void
    {
        $this->messages[] = ['type' => $type, 'data' => $data, 'afterCommit' => $this->state->committed];
    }
}
