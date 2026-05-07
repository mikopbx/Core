<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\Exceptions\OutOfDiskSpaceException;
use MikoPBX\Core\System\Processes;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use ReflectionClass;
use RuntimeException;

/**
 * Regression coverage for the ENOSPC handling introduced in issue #1051
 * (Sentry MIKOPBX-MGP: `file_put_contents() ... errno=28 No space left
 * on device` storming Sentry with 50k+ events/day from a single host
 * because every worker respawn crashed on the same disk-full condition).
 *
 * Behaviours exercised:
 *
 *   (1) `savePidFile()` writes the PID atomically and leaves no
 *       `.pid.tmp.<pid>` orphan after a successful write.
 *   (2) The temp filename embeds the writer PID so Sentry deduplicates
 *       correctly (the previous `uniqid()` form produced a unique
 *       fingerprint per crash, splitting one root cause across 14
 *       sibling issue groups).
 *   (3) `throwIfOutOfSpace()` classifies real ENOSPC writes (via Linux
 *       `/dev/full`) as {@see OutOfDiskSpaceException} and lets every
 *       other failure fall through to a generic `RuntimeException`.
 *   (4) `cleanupStalePidFilesIn()` unlinks dead-writer tmp orphans
 *       once they age past PID_TMP_ORPHAN_AGE_SEC, preserves both
 *       real `.pid` files for live processes and in-flight tmp
 *       files belonging to the current process.
 *   (5) `extractPidFromTmpName()` parses the production filename
 *       shape and returns 0 for any other shape.
 */
class ProcessesPidFileTest extends AbstractUnitTest
{
    private string $sandboxDir = '';

    protected function setUp(): void
    {
        parent::setUp();
        // Each test gets its own sandbox under sys_get_temp_dir(); we
        // never touch the real /var/run/php-workers from a unit test.
        $this->sandboxDir = sys_get_temp_dir() . '/mikopbx-pidfile-test-' . getmypid() . '-' . uniqid();
        if (!is_dir($this->sandboxDir) && !mkdir($this->sandboxDir, 0777, true) && !is_dir($this->sandboxDir)) {
            $this->fail("Could not create sandbox dir: {$this->sandboxDir}");
        }
    }

    protected function tearDown(): void
    {
        $this->removeDirectoryRecursively($this->sandboxDir);
        parent::tearDown();
    }

    /**
     * Happy path: a PID is written atomically and no `.pid.tmp.*`
     * file remains in the directory.
     */
    public function testSavePidFileWritesPidAndLeavesNoOrphan(): void
    {
        $pidFile = $this->sandboxDir . '/Worker.pid';
        $pid = getmypid() ?: 1;

        Processes::savePidFile($pidFile, $pid);

        $this->assertFileExists($pidFile);
        $this->assertSame((string)$pid, file_get_contents($pidFile));

        $tmpLeftovers = glob($this->sandboxDir . '/*.pid.tmp.*');
        $this->assertSame([], $tmpLeftovers, 'Atomic write should leave no .pid.tmp.* orphan after success');
    }

    /**
     * Sentry deduplication regression: every event from a single
     * crashing worker must carry the same exception text so Sentry
     * groups them under one issue. The producer-side guarantee is
     * that the temp filename is a function of the worker PID, not
     * `uniqid()`. We assert the shape by dropping a sentinel file
     * with a foreign PID before the write — savePidFile must use a
     * different (PID-derived) tmp name and must not collide.
     */
    public function testTempFileNameIsDeterministicPerWriter(): void
    {
        $pidFile = $this->sandboxDir . '/Worker.pid';
        $pid = getmypid() ?: 1;

        $sentinel = $pidFile . '.tmp.999999';
        file_put_contents($sentinel, '999999');

        Processes::savePidFile($pidFile, $pid);

        $this->assertFileExists($sentinel, 'savePidFile must not delete other writers\' temp files');
        $this->assertFileDoesNotExist($pidFile . '.tmp.' . $pid, 'Own .tmp.<pid> path must be gone after rename');
    }

    /**
     * Real ENOSPC classification via Linux `/dev/full`: a write to
     * `/dev/full` always fails with `errno=28 No space left on
     * device`, populating `error_get_last()` with the exact payload
     * PHP produces in the production storm. We then invoke the
     * private `throwIfOutOfSpace()` classifier through reflection
     * and verify it raises {@see OutOfDiskSpaceException}.
     *
     * This test exercises the actual production path that distinguishes
     * ENOSPC from a generic I/O failure — the bug under #1051 was that
     * we were wrapping it as `RuntimeException("PID file operation
     * failed")` which Sentry then captured 50k times/day.
     *
     * Skipped on platforms without `/dev/full` (macOS, Windows). CI
     * runs Linux so coverage is preserved there.
     */
    public function testThrowIfOutOfSpaceClassifiesRealEnospc(): void
    {
        // Some environments (notably stripped-down Alpine containers)
        // ship `/dev/full` as a regular file rather than the kernel
        // character device. A regular-file `/dev/full` accepts writes,
        // so we only proceed when the path is genuinely a chardev.
        if (!$this->isLinuxDevFullChardev()) {
            $this->markTestSkipped('/dev/full character device not available on this platform');
        }

        // Trigger a real ENOSPC: every write to the /dev/full chardev
        // returns -1 with errno=28 from the kernel. PHP captures this
        // in error_get_last() with the exact libc strerror text.
        error_clear_last();
        $res = @file_put_contents('/dev/full', 'x');
        $this->assertFalse($res, 'Test setup expects /dev/full chardev write to fail');
        $err = error_get_last();
        $this->assertNotNull($err);
        $this->assertStringContainsString(
            'No space left on device',
            (string)($err['message'] ?? ''),
            'Test setup expects libc strerror in error_get_last()'
        );

        $reflection = new ReflectionClass(Processes::class);
        $method = $reflection->getMethod('throwIfOutOfSpace');
        $method->setAccessible(true);

        $this->expectException(OutOfDiskSpaceException::class);
        $this->expectExceptionMessage('worker context');
        $method->invoke(null, 'worker context: /tmp/some.pid.tmp.123');
    }

    /**
     * Detects whether `/dev/full` exists AND is the kernel chardev
     * (major=1, minor=7 on Linux) that returns ENOSPC on every write.
     * Some minimal containers ship a regular file at that path which
     * silently accepts writes — those environments cannot exercise
     * the ENOSPC path. Fall back to `filetype()` since PHP does not
     * expose `S_ISCHR` directly.
     */
    private function isLinuxDevFullChardev(): bool
    {
        if (!file_exists('/dev/full')) {
            return false;
        }
        // filetype() returns 'char' for character devices on Linux.
        return @filetype('/dev/full') === 'char';
    }

    /**
     * `throwIfOutOfSpace()` must return silently when the last error
     * is NOT ENOSPC. This is the negative-path complement of
     * {@see testThrowIfOutOfSpaceClassifiesRealEnospc()}: a permission
     * failure produces a different libc strerror, so the helper must
     * not classify it as a disk-full event.
     */
    public function testThrowIfOutOfSpaceIgnoresNonEnospcErrors(): void
    {
        if (function_exists('posix_geteuid') && posix_geteuid() === 0) {
            $this->markTestSkipped('Cannot test permission failure as root');
        }

        // Trigger a permission failure: write into a directory the
        // test user cannot write to.
        $forbiddenDir = $this->sandboxDir . '/forbidden';
        mkdir($forbiddenDir, 0500, true);
        @file_put_contents($forbiddenDir . '/x', 'x');
        $err = error_get_last();
        $this->assertNotNull($err);
        // The message should NOT be ENOSPC (it'll be EACCES "Permission denied").
        $this->assertStringNotContainsStringIgnoringCase(
            'No space left on device',
            (string)($err['message'] ?? ''),
            'Test setup expects a non-ENOSPC error'
        );

        $reflection = new ReflectionClass(Processes::class);
        $method = $reflection->getMethod('throwIfOutOfSpace');
        $method->setAccessible(true);

        // Must return silently (no throw). The probe-dir fallback
        // also runs but the sandbox is healthy and reports plenty
        // of free space, so it does not falsely trigger.
        $method->invoke(null, 'worker context: ' . $forbiddenDir . '/x');
        $this->assertTrue(true, 'throwIfOutOfSpace returned without throwing on non-ENOSPC');
    }

    /**
     * Non-ENOSPC failures (permissions, races, etc.) must continue
     * to produce a generic RuntimeException so existing call sites
     * keep their behaviour. We force a write into a directory that
     * the test user cannot create files in.
     */
    public function testSavePidFileWrapsGenericFailureAsRuntimeException(): void
    {
        if (function_exists('posix_geteuid') && posix_geteuid() === 0) {
            $this->markTestSkipped('Cannot test permission failure as root');
        }

        $unwritable = $this->sandboxDir . '/readonly';
        mkdir($unwritable, 0500, true); // r-x for owner, no write
        $pidFile = $unwritable . '/Worker.pid';

        $this->expectException(RuntimeException::class);
        // The test must NOT receive OutOfDiskSpaceException for a
        // pure permission failure on a healthy filesystem.
        Processes::savePidFile($pidFile, getmypid() ?: 1);
    }

    /**
     * `cleanupStalePidFilesIn()` end-to-end behaviour against a real
     * sandbox directory:
     *
     *   - a fresh tmp file owned by the live test process survives;
     *   - an old tmp file owned by a non-existent PID is unlinked;
     *   - a `.pid` file pointing at the live test process survives;
     *   - a `.pid` file pointing at a non-existent PID is unlinked.
     *
     * This calls the real production helper, not a re-implementation
     * — a regression in glob pattern, age threshold or liveness check
     * fails this test. Issue #1051 review feedback.
     */
    public function testCleanupStalePidFilesInProcessesAllFourCategories(): void
    {
        $myPid = getmypid() ?: 1;
        $deadPid = 4194303; // > Linux PID_MAX_LIMIT default — guaranteed dead

        // (a) Live writer's in-flight tmp — must survive.
        $liveTmp = $this->sandboxDir . '/LiveWorker.pid.tmp.' . $myPid;
        file_put_contents($liveTmp, (string)$myPid);

        // (b) Dead writer's orphan tmp — must be unlinked.
        $oldTmp = $this->sandboxDir . '/DeadWorker.pid.tmp.' . $deadPid;
        file_put_contents($oldTmp, (string)$deadPid);
        // Backdate well past PID_TMP_ORPHAN_AGE_SEC=60.
        touch($oldTmp, time() - 300);

        // (c) Live worker's PID file — must survive.
        $livePid = $this->sandboxDir . '/LiveWorker.pid';
        file_put_contents($livePid, (string)$myPid);

        // (d) Dead worker's PID file — must be unlinked.
        $deadPidFile = $this->sandboxDir . '/DeadWorker.pid';
        file_put_contents($deadPidFile, (string)$deadPid);

        Processes::cleanupStalePidFilesIn($this->sandboxDir);

        $this->assertFileExists($liveTmp, 'Live writer tmp file must survive cleanup');
        $this->assertFileDoesNotExist($oldTmp, 'Stale orphan tmp file must be unlinked');
        $this->assertFileExists($livePid, 'Live worker PID file must survive cleanup');
        $this->assertFileDoesNotExist($deadPidFile, 'Dead worker PID file must be unlinked');
    }

    /**
     * `cleanupStalePidFilesIn()` must tolerate a missing directory
     * silently — the supervisor calls it on every spawn and we do
     * not want a missing /var/run/php-workers to escalate to a
     * fatal error during cold boot.
     */
    public function testCleanupStalePidFilesInToleratesMissingDir(): void
    {
        $missing = $this->sandboxDir . '/no-such-dir';
        Processes::cleanupStalePidFilesIn($missing);
        $this->assertTrue(true, 'cleanupStalePidFilesIn returned without throwing on missing dir');
    }

    /**
     * Pass 1's glob (`*.pid`) must NOT match `.pid.tmp.<pid>` files.
     * Otherwise the cleanup would treat tmp files as PID files,
     * read them as integer PIDs, and unlink them through the wrong
     * code path. Issue #1051 review feedback (BUG #2 / NIT #9).
     */
    public function testGlobPidPatternExcludesTmpFiles(): void
    {
        // Sanity: verify the production glob behaviour directly so
        // the contract is documented in code.
        $pidFile = $this->sandboxDir . '/Worker.pid';
        $tmpFile = $this->sandboxDir . '/Worker.pid.tmp.123';
        file_put_contents($pidFile, '999');
        file_put_contents($tmpFile, '123');

        $matches = glob($this->sandboxDir . '/*.pid') ?: [];
        $this->assertContains($pidFile, $matches);
        $this->assertNotContains($tmpFile, $matches, 'glob *.pid must NOT match *.pid.tmp.* files');
    }

    /**
     * `extractPidFromTmpName()` must parse the trailing PID from the
     * production filename shape and return 0 for anything else.
     */
    public function testExtractPidFromTmpName(): void
    {
        $reflection = new ReflectionClass(Processes::class);
        $extract = $reflection->getMethod('extractPidFromTmpName');
        $extract->setAccessible(true);

        $cases = [
            '/var/run/php-workers/MikoPBX-Core-Workers-WorkerCdr.pid.tmp.12345' => 12345,
            '/tmp/Foo.pid.tmp.1' => 1,
            '/tmp/Foo.pid' => 0,                 // no marker
            '/tmp/Foo.pid.tmp.notanumber' => 0,  // non-digit suffix
            '/tmp/.pid.tmp.7' => 7,              // edge: empty stem
        ];
        foreach ($cases as $path => $expected) {
            $this->assertSame(
                $expected,
                $extract->invoke(null, $path),
                "extractPidFromTmpName mismatch for: $path"
            );
        }
    }

    /**
     * `Processes::getLockFileDir()` must return the same value as
     * the internal LOCK_FILE_DIR constant. Pinning this contract
     * prevents the supervisor's disk-watchdog from drifting from
     * the producer's literal — a regression that would silently
     * disable the disk watchdog. Issue #1051 review (WARNING #7).
     */
    public function testGetLockFileDirMatchesInternalConstant(): void
    {
        $reflection = new ReflectionClass(Processes::class);
        $constants = $reflection->getConstants();
        $this->assertArrayHasKey('LOCK_FILE_DIR', $constants);
        $this->assertSame($constants['LOCK_FILE_DIR'], Processes::getLockFileDir());
    }

    private function removeDirectoryRecursively(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $entries = @scandir($dir) ?: [];
        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            $path = $dir . DIRECTORY_SEPARATOR . $entry;
            if (is_dir($path) && !is_link($path)) {
                $this->removeDirectoryRecursively($path);
            } else {
                @chmod($path, 0666);
                @unlink($path);
            }
        }
        @chmod($dir, 0777);
        @rmdir($dir);
    }
}
