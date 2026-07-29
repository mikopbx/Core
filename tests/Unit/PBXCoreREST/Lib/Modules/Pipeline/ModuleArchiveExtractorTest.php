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

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Modules\Pipeline;

use MikoPBX\PBXCoreREST\Lib\Modules\Pipeline\ModuleArchiveExtractor;
use PHPUnit\Framework\TestCase;
use ZipArchive;

/**
 * Regression tests of the shared module-package extractor on real zip files:
 * the hardening rules (Zip Slip, absolute paths, empty archives) must hold
 * for both the legacy installer and the orchestrator pipeline that now share
 * this code. Translation keys come back raw here (no DI) — the assertions
 * check outcome semantics, not message text.
 */
final class ModuleArchiveExtractorTest extends TestCase
{
    private string $workDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->workDir = sys_get_temp_dir() . '/extractor-test-' . uniqid('', false);
        mkdir($this->workDir, 0755, true);
    }

    protected function tearDown(): void
    {
        exec('rm -rf ' . escapeshellarg($this->workDir));
        parent::tearDown();
    }

    public function testExtractsAValidArchiveAndReportsProgress(): void
    {
        $zipFile = $this->makeZip([
            'module.json' => '{"moduleUniqueID":"ModuleX"}',
            'Setup/PbxExtensionSetup.php' => '<?php',
        ]);
        $target = $this->workDir . '/out';
        $progress = [];

        $error = ModuleArchiveExtractor::extract($zipFile, $target, function (int $p) use (&$progress): void {
            $progress[] = $p;
        });

        $this->assertSame('', $error, 'a valid archive must extract without errors');
        $this->assertFileExists("$target/module.json");
        $this->assertFileExists("$target/Setup/PbxExtensionSetup.php");
        $this->assertNotEmpty($progress, 'progress callback must be invoked');
        $this->assertSame(100, end($progress), 'progress must reach 100');
    }

    public function testRejectsPathTraversalEntries(): void
    {
        $zipFile = $this->makeZip([
            'good.txt' => 'ok',
            '../evil.txt' => 'escape attempt',
        ]);
        $target = $this->workDir . '/out';

        $error = ModuleArchiveExtractor::extract($zipFile, $target);

        $this->assertNotSame('', $error, 'a traversal entry must abort the extraction');
        $this->assertFileDoesNotExist($this->workDir . '/evil.txt', 'nothing may escape the target dir');
    }

    public function testRejectsAbsolutePathEntries(): void
    {
        $zipFile = $this->makeZip(['/etc/evil.conf' => 'x']);
        $target = $this->workDir . '/out';

        $error = ModuleArchiveExtractor::extract($zipFile, $target);

        $this->assertNotSame('', $error, 'an absolute-path entry must abort the extraction');
    }

    public function testRejectsCorruptArchive(): void
    {
        $zipFile = $this->workDir . '/corrupt.zip';
        file_put_contents($zipFile, 'not a zip at all');

        $error = ModuleArchiveExtractor::extract($zipFile, $this->workDir . '/out');
        $this->assertNotSame('', $error, 'a corrupt archive must be rejected');
    }

    public function testRejectsZeroEntryArchive(): void
    {
        // A handcrafted empty End-Of-Central-Directory record: the smallest
        // valid zip, which ZipArchive::open accepts with zero entries
        $zipFile = $this->workDir . '/empty.zip';
        file_put_contents($zipFile, "PK\x05\x06" . str_repeat("\0", 18));

        $error = ModuleArchiveExtractor::extract($zipFile, $this->workDir . '/out');
        $this->assertNotSame('', $error, 'an archive without entries is not a valid module package');
    }

    /**
     * @param array<string, string> $entries name => content
     */
    private function makeZip(array $entries): string
    {
        $zipFile = $this->workDir . '/package-' . uniqid('', false) . '.zip';
        $zip = new ZipArchive();
        $zip->open($zipFile, ZipArchive::CREATE);
        foreach ($entries as $name => $content) {
            $zip->addFromString($name, $content);
        }
        $zip->close();
        return $zipFile;
    }
}
