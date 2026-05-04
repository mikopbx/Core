<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

use Error;
use MikoPBX\Common\Providers\LoggerProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use ReflectionClass;
use ReflectionMethod;

/**
 * Regression coverage for the signal-handler hardening introduced in
 * issue #1052 (Sentry MIKOPBX-MGF: `Class "MikoPBX\Core\System\SystemMessages"
 * not found` from inside `WorkerBase::signalHandler`).
 *
 * The bug: `pcntl_async_signals(true)` lets a signal interrupt the script
 * mid-opcode. If a signal lands while Composer's autoloader is busy
 * resolving an unrelated class, the handler's own autoloads can re-enter
 * the autoloader from a broken state and throw `Class … not found`.
 *
 * Two complementary fixes are tested here:
 *   (1) WorkerBase::__construct() eagerly resolves every class reachable
 *       from the signal-handler chain so the handler never autoloads
 *       at signal time;
 *   (2) WorkerBase::signalHandler() wraps its body in a try/Throwable
 *       with a stdlib-only fallback so any future autoload-class hazard
 *       still results in a clean exit instead of an unhandled fatal.
 */
class SignalHandlerTest extends AbstractUnitTest
{
    /**
     * Build a fixture without invoking `WorkerBase::__construct()`. The
     * real constructor wires PID files, signal handlers, and the DI
     * container — which is too much for a pure unit test and identical
     * to the pattern already used in WithRedisRetryTest.
     */
    private function makeFixture(): SignalHandlerFixture
    {
        $reflection = new ReflectionClass(SignalHandlerFixture::class);
        /** @var SignalHandlerFixture $instance */
        $instance = $reflection->newInstanceWithoutConstructor();
        // workerStartTime is read by sysLogMsg formatters; initialise so
        // the production path doesn't trip on uninitialised typed prop.
        $instance->initWorkerStartTime();
        return $instance;
    }

    /**
     * After preloadSignalHandlerDependencies() runs, every class that
     * signalHandler() / setWorkerState() / closeRedis() / shutdownHandler()
     * statically references must be resolvable WITHOUT triggering the
     * autoloader — that's exactly what the second `false` flag of
     * `class_exists()` checks.
     *
     * KNOWN LIMITATION: AbstractUnitTest::setUp() calls
     * RegisterDIServices::init() which transitively loads SystemMessages,
     * Util, Processes and LoggerProvider before the test body runs. So
     * this assertion really only catches the case where someone shrinks
     * BOTH lists in lockstep — it does not catch a missing entry that is
     * silently covered by the bootstrap. A faithful test would need a
     * forked PHP child process; the trade-off is documented here so the
     * next reviewer doesn't trust this test more than it deserves.
     */
    public function testSignalHandlerClassesArePreloaded(): void
    {
        $fixture = $this->makeFixture();
        $fixture->exposePreload();

        $signalHandlerChain = [
            SystemMessages::class,
            LoggerProvider::class,
            Processes::class,
            Util::class,
        ];

        foreach ($signalHandlerChain as $cls) {
            $this->assertTrue(
                class_exists($cls, false),
                sprintf(
                    'Class "%s" must be resolvable without triggering '
                    . 'the autoloader after preloadSignalHandlerDependencies(). '
                    . 'Issue #1052: signal arriving mid-autoload would otherwise '
                    . 'surface as `Class … not found`.',
                    $cls
                )
            );
        }
    }

    /**
     * If the inner dispatch throws a `Class … not found` Error
     * (the exact race documented in Sentry MIKOPBX-MGF), the public
     * signalHandler() must:
     *   - swallow the Throwable (no propagation),
     *   - emit a stdlib-only syslog warning,
     *   - on SIGTERM/SIGINT, still exit so the supervisor can respawn.
     *
     * We can't test the `exit(1)` branch without forking, so we use
     * SIGUSR1 — the no-exit signal — to verify the swallow + syslog
     * path on its own. The exit-on-SIGTERM branch is covered by code
     * review (`exit(1)` is unconditional on the catch path for those
     * signals).
     */
    public function testSignalHandlerSwallowsAutoloaderFailure(): void
    {
        $fixture = $this->makeFixture();
        // Simulate the exact failure mode from Sentry MGF: an Error
        // raised from inside the dispatch chain when an autoload re-entry
        // fails. Here we throw it from setWorkerState (the actual
        // culprit in the original stacktrace).
        $fixture->setWorkerStateThrows = true;

        // Capture syslog output: openlog with LOG_PERROR mirrors syslog
        // calls to stderr. We cannot easily assert on the syslog daemon,
        // but we CAN assert that:
        //   (a) no Throwable propagates out of signalHandler(),
        //   (b) the inner dispatch was actually invoked.
        $threw = false;
        try {
            $fixture->signalHandler(SIGUSR1);
        } catch (\Throwable $e) {
            $threw = true;
        }

        $this->assertFalse(
            $threw,
            'signalHandler() must swallow Throwables from its dispatch '
            . 'so a mid-autoload race never aborts worker shutdown. '
            . 'Issue #1052.'
        );
        $this->assertGreaterThanOrEqual(
            1,
            $fixture->setWorkerStateCalls,
            'Inner dispatch must have been entered (sanity check that '
            . 'the test actually exercised the catch path).'
        );
    }

    /**
     * Even when the inner dispatch fails, SIGUSR1 must still flip
     * `needRestart` so the supervisor's graceful-restart contract is
     * preserved. Without this, a mid-autoload race silently drops the
     * restart request and the worker keeps running with stale state
     * until it is killed by SIGTERM. Issue #1052 review feedback.
     */
    public function testSignalHandlerSigusr1PreservesRestartContractOnFailure(): void
    {
        $fixture = $this->makeFixture();
        $fixture->setWorkerStateThrows = true;
        $this->assertFalse($fixture->getNeedRestart(), 'precondition');

        $fixture->signalHandler(SIGUSR1);

        $this->assertTrue(
            $fixture->getNeedRestart(),
            'SIGUSR1 must set needRestart=true even when dispatch '
            . 'throws — the supervisor relies on this signal to '
            . 'gracefully restart the worker. Issue #1052.'
        );
    }

    /**
     * Smoke test: the same swallow-on-failure behaviour must hold for
     * any Throwable subclass, not only the `Class … not found` Error
     * that motivated the fix. RuntimeException is the canonical "I'm
     * not an autoload race" exception — if the catch arm only handled
     * Errors we'd regress here. (Strict catch-arm internal robustness
     * — e.g. forcing closeRedis itself to throw on the SIGTERM path —
     * cannot be tested without forking, since that path calls exit(1)
     * which would terminate PHPUnit.)
     */
    public function testSignalHandlerSwallowsAnyThrowable(): void
    {
        $fixture = $this->makeFixture();
        $fixture->setWorkerStateThrows = true;
        $fixture->throwableClass = \RuntimeException::class;

        $fixture->signalHandler(SIGUSR1);
        $this->addToAssertionCount(1); // reaching here = pass
    }

    /**
     * Sanity check on the structure of preloadSignalHandlerDependencies():
     * it must remain a private no-arg method on WorkerBase so static
     * analysis and IDEs surface its callers correctly.
     */
    public function testPreloadIsPrivateInstanceMethod(): void
    {
        $method = new ReflectionMethod(WorkerBase::class, 'preloadSignalHandlerDependencies');
        $this->assertTrue($method->isPrivate(), 'preload helper must stay private to WorkerBase');
        $this->assertFalse($method->isStatic(), 'preload helper is part of __construct flow');
        $this->assertSame(0, $method->getNumberOfParameters());
    }
}

/**
 * Test fixture exposing the parts of WorkerBase needed for signal-handler
 * regression coverage. Avoids the full constructor (signal handlers, PID
 * files, DI) which is irrelevant to the unit tests below.
 */
class SignalHandlerFixture extends WorkerBase
{
    public bool $setWorkerStateThrows = false;
    public string $throwableClass = Error::class;
    public int $setWorkerStateCalls = 0;

    public function start(array $argv): void
    {
        // Not used in tests.
    }

    public function initWorkerStartTime(): void
    {
        $this->workerStartTime = microtime(true);
    }

    public function exposePreload(): void
    {
        $method = new ReflectionMethod(WorkerBase::class, 'preloadSignalHandlerDependencies');
        $method->invoke($this);
    }

    public function getNeedRestart(): bool
    {
        return $this->needRestart;
    }

    /**
     * Override to simulate the failure mode from Sentry MGF: an Error
     * (typically `Class … not found`) raised from inside setWorkerState
     * during signal-time autoload re-entry.
     */
    protected function setWorkerState(int $state): void
    {
        $this->setWorkerStateCalls++;
        if ($this->setWorkerStateThrows) {
            $cls = $this->throwableClass;
            throw new $cls('Class "MikoPBX\\Core\\System\\SystemMessages" not found');
        }
        // Don't call parent::setWorkerState — it would actually try to
        // log via SystemMessages and we're testing the failure path.
    }

    /**
     * No-op closeRedis: the fixture has no real Redis client and the
     * exit(1) branch in signalHandler would terminate the test runner.
     */
    protected function closeRedis(): void
    {
        // Intentionally empty.
    }
}
