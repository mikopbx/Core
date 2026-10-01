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

namespace MikoPBX\Tests\Unit\Common\Library;

use MikoPBX\Common\Library\CdrResponseCacheLink;
use PHPUnit\Framework\TestCase;

final class CdrResponseCacheLinkTest extends TestCase
{
    private string $rootDir;
    private string $cacheDir;
    private string $responseDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->rootDir = sys_get_temp_dir() . '/cdr-response-cache-link-' . bin2hex(random_bytes(8));
        $this->cacheDir = $this->rootDir . '/cache';
        $this->responseDir = $this->rootDir . '/responses';

        self::assertTrue(mkdir($this->cacheDir, 0700, true));
        self::assertTrue(mkdir($this->responseDir, 0700, true));
    }

    protected function tearDown(): void
    {
        foreach ([$this->cacheDir, $this->responseDir] as $directory) {
            foreach (scandir($directory) ?: [] as $entry) {
                if ($entry !== '.' && $entry !== '..') {
                    unlink($directory . '/' . $entry);
                }
            }
            rmdir($directory);
        }
        rmdir($this->rootDir);

        parent::tearDown();
    }

    public function testRemoveDeletesOnlyTheDeterministicLink(): void
    {
        $hash = '0123456789abcdef0123456789abcdef';
        $responseFile = $this->responseDir . '/temp-' . $hash;
        $expectedLink = $this->cacheDir . '/' . $hash;
        $sameTargetNeighbor = $this->cacheDir . '/unrelated-link';

        file_put_contents($responseFile, '[]');
        symlink($responseFile, $expectedLink);
        symlink($responseFile, $sameTargetNeighbor);

        self::assertTrue(CdrResponseCacheLink::remove($this->cacheDir, $responseFile));
        self::assertFalse(is_link($expectedLink), 'The deterministic response link must be removed');
        self::assertTrue(
            is_link($sameTargetNeighbor),
            'No directory-wide same-file search may remove neighboring links'
        );
        self::assertFileExists($responseFile, 'Removing the cache link must not remove the response file');
    }

    public function testRemovePreservesLinkThatPointsToAnotherFile(): void
    {
        $hash = 'fedcba9876543210fedcba9876543210';
        $responseFile = $this->responseDir . '/temp-' . $hash;
        $otherFile = $this->responseDir . '/other-response';
        $expectedLink = $this->cacheDir . '/' . $hash;

        file_put_contents($responseFile, '[]');
        file_put_contents($otherFile, '[]');
        symlink($otherFile, $expectedLink);

        self::assertFalse(CdrResponseCacheLink::remove($this->cacheDir, $responseFile));
        self::assertTrue(is_link($expectedLink), 'A cache link owned by another response must be preserved');
        self::assertSame($otherFile, readlink($expectedLink));
    }

    /**
     * @dataProvider invalidResponseNames
     */
    public function testRemoveRejectsUnexpectedResponseFilename(string $responseName, string $derivedLinkName): void
    {
        $responseFile = $this->responseDir . '/' . $responseName;
        $derivedLink = $this->cacheDir . '/' . $derivedLinkName;

        file_put_contents($responseFile, '[]');
        symlink($responseFile, $derivedLink);

        self::assertFalse(CdrResponseCacheLink::remove($this->cacheDir, $responseFile));
        self::assertTrue(
            is_link($derivedLink),
            'Unexpected response names must never select a cache entry for deletion'
        );
    }

    public static function invalidResponseNames(): array
    {
        return [
            'wrong prefix' => [
                'other-0123456789abcdef0123456789abcdef',
                '-0123456789abcdef0123456789abcdef',
            ],
            'short non-hash identifier' => [
                'temp-not-a-hash',
                'not-a-hash',
            ],
            'uppercase identifier' => [
                'temp-0123456789ABCDEF0123456789ABCDEF',
                '0123456789ABCDEF0123456789ABCDEF',
            ],
        ];
    }
}
