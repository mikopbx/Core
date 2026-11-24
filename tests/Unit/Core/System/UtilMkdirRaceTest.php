<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\Util;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Util::mwMkdir() (#1348): a directory another process created between file_exists() and
 * mkdir() must be accepted instead of aborting the caller, while any other creation
 * failure is still reported. Needs root, like the workers that hit the race.
 */
final class UtilMkdirRaceTest extends AbstractUnitTest
{
    private const string RACER = __DIR__ . '/fixtures/mwmkdir-race-child.php';
    private const int RACERS = 2;
    private const int ITERATIONS = 3000;
    private const int READY_TIMEOUT_NS = 15000000000;

    private string $sandbox;
    private string $projectRoot;
    private int $savedErrorReporting;

    protected function setUp(): void
    {
        parent::setUp();
        if (posix_getuid() !== 0) {
            self::markTestSkipped('mwMkdir() creates directories only as root');
        }
        if (!function_exists('proc_open')) {
            self::markTestSkipped('proc_open() is needed to run the racers');
        }
        $this->sandbox = sys_get_temp_dir() . '/mikopbx-mwmkdir-' . getmypid() . '-' . uniqid('', true);
        $this->projectRoot = dirname(__DIR__, 4);
        self::assertTrue(mkdir($this->sandbox, 0755, true));

        // WorkerBase::setResourceLimits() keeps E_WARNING in error_reporting, so the handler
        // registered at bootstrap turns the mkdir() warning into an exception.
        $this->savedErrorReporting = error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);
    }

    protected function tearDown(): void
    {
        if (isset($this->savedErrorReporting)) {
            error_reporting($this->savedErrorReporting);
        }
        if (isset($this->sandbox)) {
            exec('rm -rf ' . escapeshellarg($this->sandbox));
        }
        parent::tearDown();
    }

    /**
     * Two processes create the same directories in lockstep. The loser of every race must
     * accept the directory the winner created, not raise "mkdir(): File exists".
     */
    public function testConcurrentCreationOfTheSameDirectoryIsAccepted(): void
    {
        $baseDir = $this->sandbox . '/race';
        $goFile = $this->sandbox . '/go';

        $racers = [];
        try {
            for ($number = 0; $number < self::RACERS; $number++) {
                $racers[$number] = $this->startRacer($baseDir, $goFile, $number);
            }
            $this->armBarrier($goFile, $racers);

            foreach ($racers as $number => $racer) {
                [$process, $resultFile, $outputFile, $errorFile] = $racer;
                $output = file_get_contents($outputFile) . file_get_contents($errorFile);

                // The checks below throw instead of failing an assertion: PHPUnit's process
                // isolation cannot hand a failed assertion back from a DI-booted test.
                if (proc_close($process) !== 0 || !is_file($resultFile)) {
                    throw new \RuntimeException("Racer $number exited without a result: $output");
                }

                $result = json_decode(file_get_contents($resultFile), true, 512, JSON_THROW_ON_ERROR);
                if ($result['threw'] !== []) {
                    $thrown = [];
                    foreach ($result['threw'] as $key => $count) {
                        $thrown[] = "$count x $key";
                    }
                    throw new \RuntimeException(
                        'Racer ' . $number . ' got an exception from mwMkdir(): ' . implode(', ', $thrown)
                    );
                }
                if ($result['failed'] !== 0) {
                    throw new \RuntimeException("Racer $number reported a creation failure");
                }
                self::assertSame(self::ITERATIONS, $result['ok'], "Racer $number lost calls");
                $racers[$number][0] = null;
            }
        } finally {
            foreach ($racers as $racer) {
                if (is_resource($racer[0])) {
                    proc_terminate($racer[0]);
                    proc_close($racer[0]);
                }
            }
        }

        self::assertDirectoryExists($baseDir . '/' . (self::ITERATIONS - 1) . '/a/b');
    }

    /**
     * A dangling symlink is not a race: file_exists() is false, mkdir() fails with
     * "File exists" and the path is still not a directory. That failure must be reported.
     */
    public function testCreationFailureIsStillReported(): void
    {
        $link = $this->sandbox . '/dangling';
        self::assertTrue(symlink($this->sandbox . '/missing-target', $link));

        self::assertFalse(Util::mwMkdir($link));
        self::assertFalse(is_dir($link));
    }

    /**
     * Starts one racer process with its output redirected to files, not pipes: a racer
     * flooding its output can never block the parent reading it.
     *
     * @param string $baseDir Directory the racers create their paths in.
     * @param string $goFile File the shared start instant is written to.
     * @param int $number Racer number, used for its result file.
     *
     * @return array{resource|null, string, string, string} Process, result, output and error files.
     */
    private function startRacer(string $baseDir, string $goFile, int $number): array
    {
        $resultFile = $this->sandbox . "/racer-$number.json";
        $outputFile = $this->sandbox . "/racer-$number.out";
        $errorFile = $this->sandbox . "/racer-$number.err";
        $command = [
            PHP_BINARY,
            self::RACER,
            $this->projectRoot,
            $baseDir,
            $goFile,
            (string)self::ITERATIONS,
            $resultFile,
        ];
        $process = proc_open(
            $command,
            [1 => ['file', $outputFile, 'w'], 2 => ['file', $errorFile, 'w']],
            $pipes
        );
        self::assertIsResource($process, 'Cannot start the racer process');

        return [$process, $resultFile, $outputFile, $errorFile];
    }

    /**
     * Waits until every racer has booted and announced itself, then arms the shared start
     * instant. Waiting for readiness keeps the test racing even when PHP starts slowly.
     *
     * @param string $goFile File the start instant is written to.
     * @param array<array{resource|null, string, string}> $racers Racer processes.
     */
    private function armBarrier(string $goFile, array $racers): void
    {
        $deadline = hrtime(true) + self::READY_TIMEOUT_NS;
        do {
            clearstatcache();
            $ready = 0;
            foreach ($racers as $racer) {
                $ready += (int) is_file($racer[1] . '.ready');
            }
            if ($ready === count($racers)) {
                // Rename, so a racer never reads a partially written instant.
                file_put_contents($goFile . '.tmp', (string) (hrtime(true) + 1000000000));
                rename($goFile . '.tmp', $goFile);

                return;
            }
            usleep(2000);
        } while (hrtime(true) < $deadline);

        $progress = [];
        foreach ($racers as $number => $racer) {
            $progress[] = sprintf(
                'racer %d: out=%s err=%s result=%s',
                $number,
                file_get_contents($racer[2]) ?: '(empty)',
                file_get_contents($racer[3]) ?: '(empty)',
                is_file($racer[1]) ? 'written' : 'missing'
            );
        }
        throw new \RuntimeException(
            'The racers did not boot within ' . self::READY_TIMEOUT_NS / 1000000000 . ' s: ' . implode(' | ', $progress)
        );
    }
}
