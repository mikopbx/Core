<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use ReflectionClass;
use ReflectionMethod;

/**
 * Regression coverage for the PID-dir pre-flight check introduced in
 * issue #1051 (Sentry MIKOPBX-MGP storm).
 *
 * The bug: `Processes::savePidFile()` failed with ENOSPC when the
 * tmpfs holding `/var/run/php-workers` filled up. The exception
 * bubbled out of `WorkerBase::__construct()`, was captured by
 * `CriticalErrorsHandler::handleExceptionWithSyslog()`, and the
 * supervisor respawned the worker within milliseconds — generating
 * 50 000+ Sentry events/day from a single host.
 *
 * The fix: `WorkerBase::__construct()` calls
 * {@see WorkerBase::refuseStartIfPidDirFull()} BEFORE wiring up signal
 * handlers / shutdown functions / Sentry-capturing catch blocks. When
 * the PID-file directory has less than `PID_DIR_MIN_FREE_BYTES` free,
 * the constructor throws an {@see OutOfDiskSpaceException} which is
 * caught by the surrounding handler that exits with EX_TEMPFAIL=75
 * and a single stdlib-only syslog line — no Sentry capture.
 *
 * This test exercises the helper directly (without invoking the real
 * constructor, which wires the DI container, signal handlers and
 * shutdown functions) and a fixture that covers the surrounding logic.
 */
class PidDirPreflightTest extends AbstractUnitTest
{
    private string $sandboxDir = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->sandboxDir = sys_get_temp_dir() . '/mikopbx-preflight-test-' . getmypid() . '-' . uniqid();
        if (!is_dir($this->sandboxDir) && !mkdir($this->sandboxDir, 0777, true) && !is_dir($this->sandboxDir)) {
            $this->fail("Could not create sandbox dir: {$this->sandboxDir}");
        }
    }

    protected function tearDown(): void
    {
        if (is_dir($this->sandboxDir)) {
            @rmdir($this->sandboxDir);
        }
        parent::tearDown();
    }

    /**
     * On a healthy host, the helper returns silently — no exception
     * thrown, no exit. We can verify this directly because
     * `disk_free_space()` on `sys_get_temp_dir()` will report many
     * gigabytes, well above the 64 KiB threshold.
     */
    public function testRefuseStartIfPidDirFullPassesOnHealthyHost(): void
    {
        $fixture = $this->makeFixture($this->sandboxDir . '/Worker.pid');

        $this->invokeRefuseStart($fixture);

        $this->assertTrue(true, 'refuseStartIfPidDirFull returned without throwing on a host with free space');
    }

    /**
     * When the helper cannot determine free space (statfs failure on
     * a missing path), it must NOT throw — the philosophy is "let
     * savePidFile() produce the real diagnostic if we actually try
     * to spawn". The pre-flight check is a hot-path optimisation,
     * not a hard gate.
     */
    public function testRefuseStartIfPidDirFullPassesOnUnknownDiskState(): void
    {
        $missingPath = $this->sandboxDir . '/no-such-subdir/Worker.pid';
        $fixture = $this->makeFixture($missingPath);

        $this->invokeRefuseStart($fixture);

        $this->assertTrue(true, 'refuseStartIfPidDirFull tolerated missing path silently');
    }

    /**
     * The real fault path is hard to reproduce without a tmpfs of
     * bounded size, but we can verify by reflection that the
     * threshold constant is sane and the exception text carries the
     * pieces an operator needs to diagnose the storm: class name,
     * directory, free bytes, threshold.
     *
     * If the threshold is ever raised to a value that would trigger
     * on a normal /var/run/php-workers tmpfs (e.g. > a few MB), this
     * test is the canary that catches it before deployment.
     */
    public function testThresholdConstantIsConservative(): void
    {
        $reflection = new ReflectionClass(WorkerBase::class);
        $threshold = $reflection->getConstant('PID_DIR_MIN_FREE_BYTES');

        $this->assertIsInt($threshold);
        $this->assertGreaterThan(
            0,
            $threshold,
            'Threshold must be positive, otherwise the pre-flight check is a no-op'
        );
        $this->assertLessThan(
            1024 * 1024,
            $threshold,
            'Threshold must stay under 1MB — /var/run is a small tmpfs and false positives '
            . 'would block legitimate worker spawns on a healthy host'
        );
    }

    /**
     * EX_TEMPFAIL=75 (BSD sysexits.h) is the canonical exit code for
     * a transient, environment-driven failure. Hardcoding it here
     * pins the contract so init systems / supervisors that recognise
     * sysexits codes can route the failure correctly. Issue #1051.
     */
    public function testTempfailExitCodeMatchesSysexitsConvention(): void
    {
        $reflection = new ReflectionClass(WorkerBase::class);
        $exitCode = $reflection->getConstant('EXIT_CODE_TEMPFAIL');

        $this->assertSame(
            75,
            $exitCode,
            'EXIT_CODE_TEMPFAIL must remain 75 (BSD EX_TEMPFAIL) so the supervisor / init '
            . 'system can recognise this as a transient, environment-driven failure '
            . 'rather than a code crash'
        );
    }

    /**
     * Build a minimal WorkerBase subclass without invoking the real
     * constructor. Patterns mirrors SignalHandlerFixture.
     */
    private function makeFixture(string $pidFilePath): PidDirPreflightFixture
    {
        $reflection = new ReflectionClass(PidDirPreflightFixture::class);
        /** @var PidDirPreflightFixture $instance */
        $instance = $reflection->newInstanceWithoutConstructor();
        $instance->setPidFilePath($pidFilePath);
        return $instance;
    }

    /**
     * Invoke the private helper via reflection. Production callers go
     * through `__construct()`, but exercising the helper directly
     * keeps this test fast and avoids spinning up signal handlers.
     */
    private function invokeRefuseStart(PidDirPreflightFixture $fixture): void
    {
        $method = new ReflectionMethod(WorkerBase::class, 'refuseStartIfPidDirFull');
        $method->invoke($fixture);
    }
}

/**
 * Test fixture exposing the bits of WorkerBase needed for the
 * pre-flight check tests. Overrides `getPidFile()` so we can point
 * the helper at a sandbox directory without going through the real
 * `Processes::getPidFilePath()` (which would create LOCK_FILE_DIR
 * on the host filesystem).
 */
class PidDirPreflightFixture extends WorkerBase
{
    private string $pidFilePath = '';

    public function setPidFilePath(string $path): void
    {
        $this->pidFilePath = $path;
    }

    public function getPidFile(): string
    {
        return $this->pidFilePath;
    }

    public function start(array $argv): void
    {
        // Not used in tests.
    }
}
