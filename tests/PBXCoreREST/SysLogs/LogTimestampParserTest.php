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

namespace MikoPBX\Tests\PBXCoreREST\SysLogs;

use MikoPBX\PBXCoreREST\Lib\SysLogs\LogTimestampParser;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

/**
 * Unit tests for LogTimestampParser, in particular the regression for issue #1021
 * (OOM in readLastLines when the file contains no newline characters).
 *
 * Tests use reflection to call the private readLastLines() method directly so the
 * algorithm can be exercised without standing up a full DI container.
 */
class LogTimestampParserTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tmpDir = sys_get_temp_dir() . '/log_ts_parser_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->tmpDir . '/*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($this->tmpDir);
        parent::tearDown();
    }

    /**
     * Invoke the private readLastLines method via reflection.
     *
     * @return array<int, string>
     */
    private function callReadLastLines(string $filename, int $lines): array
    {
        $reflection = new ReflectionClass(LogTimestampParser::class);
        $method = $reflection->getMethod('readLastLines');
        $method->setAccessible(true);
        return $method->invoke(null, $filename, $lines);
    }

    private function writeFile(string $name, string $content): string
    {
        $path = $this->tmpDir . '/' . $name;
        file_put_contents($path, $content);
        return $path;
    }

    public function testMissingFileReturnsEmpty(): void
    {
        self::assertSame([], $this->callReadLastLines($this->tmpDir . '/nope.log', 10));
    }

    public function testEmptyFileReturnsEmpty(): void
    {
        $path = $this->writeFile('empty.log', '');
        self::assertSame([], $this->callReadLastLines($path, 10));
    }

    public function testZeroLinesRequestedReturnsEmpty(): void
    {
        $path = $this->writeFile('basic.log', "a\nb\nc\n");
        self::assertSame([], $this->callReadLastLines($path, 0));
    }

    public function testSmallFileWithTrailingNewline(): void
    {
        $path = $this->writeFile('small.log', "line1\nline2\nline3\n");
        self::assertSame(['line1', 'line2', 'line3'], $this->callReadLastLines($path, 10));
    }

    public function testSmallFileWithoutTrailingNewline(): void
    {
        $path = $this->writeFile('small.log', "line1\nline2\nline3");
        self::assertSame(['line1', 'line2', 'line3'], $this->callReadLastLines($path, 10));
    }

    public function testSmallFileLimitsToRequestedTail(): void
    {
        $content = '';
        for ($i = 1; $i <= 50; $i++) {
            $content .= "line{$i}\n";
        }
        $path = $this->writeFile('tail.log', $content);

        $result = $this->callReadLastLines($path, 5);
        self::assertSame(['line46', 'line47', 'line48', 'line49', 'line50'], $result);
    }

    public function testLargeFileBackwardSeekPath(): void
    {
        // Build a file safely above the 64 KiB small-file threshold so the backward
        // seeking path is exercised. 5000 short lines ≈ 50 KiB per 1k lines, so 5k lines ≈ 250 KiB.
        $content = '';
        for ($i = 1; $i <= 5000; $i++) {
            $content .= sprintf("[2025-10-09 08:21:%02d] line%05d payload\n", $i % 60, $i);
        }
        $path = $this->writeFile('big.log', $content);
        self::assertGreaterThan(65536, filesize($path));

        $result = $this->callReadLastLines($path, 100);
        self::assertCount(100, $result);
        self::assertStringContainsString('line04901', $result[0]);
        self::assertStringContainsString('line05000', $result[99]);
    }

    public function testLargeFileWithLongLinesCrossingBufferBoundary(): void
    {
        // Lines longer than the 4 KiB internal buffer to verify the partial-line
        // accumulation across iterations works correctly after the seek fix.
        $longPayload = str_repeat('x', 5000);
        $content = '';
        for ($i = 1; $i <= 50; $i++) {
            $content .= "tag{$i}|{$longPayload}\n";
        }
        $path = $this->writeFile('long_lines.log', $content);
        self::assertGreaterThan(65536, filesize($path));

        $result = $this->callReadLastLines($path, 3);
        self::assertCount(3, $result);
        self::assertStringStartsWith('tag48|', $result[0]);
        self::assertStringStartsWith('tag49|', $result[1]);
        self::assertStringStartsWith('tag50|', $result[2]);
        self::assertSame(strlen("tag50|") + 5000, strlen($result[2]));
    }

    /**
     * Regression for issue #1021: a multi-megabyte file containing no '\n' must NOT
     * exhaust memory_limit. Before the fix, $chunk grew by 4 KiB per iteration until
     * it consumed the entire file. The guard caps it at READ_LAST_LINES_MAX_BUFFER (1 MiB).
     */
    public function testFileWithoutNewlinesDoesNotExhaustMemory(): void
    {
        // 4 MiB of 'A' with zero newlines — the worst case from the Sentry crash.
        $payload = str_repeat('A', 4 * 1024 * 1024);
        $path = $this->writeFile('binaryish.log', $payload);

        // Reset the process-wide peak so prior fixtures in this run can't mask the leak.
        // PHP 8.2+ — the project requires 8.3.
        memory_reset_peak_usage();
        $memBefore = memory_get_usage();
        $result = $this->callReadLastLines($path, 100);
        $memPeak = memory_get_peak_usage();

        // Should bail cleanly without OOM, not crash. Result content is best-effort
        // (algorithm cannot recover lines from a file with no separators).
        self::assertIsArray($result);

        // Critically: peak memory growth must stay under a few MiB, not climb to 4+ MiB
        // (the file size). The 1 MiB chunk cap plus the 4 KiB read buffer plus PHP's
        // per-string overhead leaves ~3 MiB of headroom; we assert 6 MiB to absorb
        // explode()'s element-array allocations on small fixtures.
        self::assertLessThan(
            6 * 1024 * 1024,
            $memPeak - $memBefore,
            'readLastLines leaked memory while scanning a newline-free file'
        );
    }

    /**
     * file()/FILE_IGNORE_NEW_LINES preserves blank lines in the middle and (importantly)
     * blank lines at the end. Our backward-seek implementation should match.
     */
    public function testLargeFileWithMultipleTrailingBlankLines(): void
    {
        // 18 KiB filler so the file crosses the 64 KiB threshold and the backward
        // seek path is exercised.
        $filler = str_repeat("filler line keeps file above the small-file threshold\n", 1500);
        $content = $filler . "alpha\nbeta\n\n\n";
        $path = $this->writeFile('trailing_blanks.log', $content);
        self::assertGreaterThan(65536, filesize($path));

        $result = $this->callReadLastLines($path, 5);

        // The trailing single \n is the file terminator (not a content line).
        // The two preceding \n produce two empty content lines, matching file().
        self::assertSame(['filler line keeps file above the small-file threshold', 'alpha', 'beta', '', ''], $result);
    }

    public function testGetLogTimeRangeOnNormalFile(): void
    {
        $content = <<<LOG
[2025-10-09 08:00:00] start of log
[2025-10-09 08:15:32] some entry
[2025-10-09 09:30:45] another entry
[2025-10-09 10:00:00] end of log

LOG;
        $path = $this->writeFile('asterisk.log', $content);

        $range = LogTimestampParser::getLogTimeRange($path);
        self::assertSame(strtotime('2025-10-09 08:00:00'), $range['start']);
        self::assertSame(strtotime('2025-10-09 10:00:00'), $range['end']);
    }

    public function testGetLogTimeRangeOnFileWithoutNewlinesReturnsNullsCleanly(): void
    {
        // 2 MiB of garbage without newlines — must not crash even though
        // no timestamp can be extracted.
        $path = $this->writeFile('garbage.log', str_repeat("\x01\x02\x03\x04", 512 * 1024));

        $range = LogTimestampParser::getLogTimeRange($path);
        self::assertNull($range['start']);
        self::assertNull($range['end']);
    }
}
