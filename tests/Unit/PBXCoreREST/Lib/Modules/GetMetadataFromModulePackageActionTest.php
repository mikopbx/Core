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

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Modules;

use MikoPBX\PBXCoreREST\Lib\Modules\GetMetadataFromModulePackageAction;
use PHPUnit\Framework\TestCase;
use ZipArchive;

/**
 * The moduleUniqueID read from module.json becomes a directory name during
 * installation, so it must be rejected unless it matches the shared pattern.
 * Translation keys come back raw here (no DI) — the assertions check the key.
 */
final class GetMetadataFromModulePackageActionTest extends TestCase
{
    private string $workDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->workDir = sys_get_temp_dir() . '/module-metadata-test-' . uniqid('', false);
        mkdir($this->workDir, 0755, true);
    }

    protected function tearDown(): void
    {
        exec('rm -rf ' . escapeshellarg($this->workDir));
        parent::tearDown();
    }

    public function testAcceptsValidModuleUniqueId(): void
    {
        $zipFile = $this->makeZip(json_encode(['moduleUniqueID' => 'ModuleTemplate']));

        $res = GetMetadataFromModulePackageAction::main($zipFile);

        $this->assertTrue($res->success);
        $this->assertSame('ModuleTemplate', $res->data['uniqid']);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function invalidStringIdProvider(): array
    {
        return [
            'path traversal' => ['../../evil'],
            'space' => ['Module X'],
            'trailing newline' => ["ModuleX\n"],
            'too long' => [str_repeat('a', 129)],
        ];
    }

    /**
     * @dataProvider invalidStringIdProvider
     */
    public function testRejectsInvalidStringModuleUniqueId(string $id): void
    {
        $zipFile = $this->makeZip(json_encode(['moduleUniqueID' => $id]));

        $res = GetMetadataFromModulePackageAction::main($zipFile);

        $this->assertFalse($res->success);
        $this->assertContains('ext_InvalidModuleUniqueID', $res->messages);
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function nonStringIdProvider(): array
    {
        return [
            'array' => [['x']],
            'integer' => [123],
        ];
    }

    /**
     * @dataProvider nonStringIdProvider
     */
    public function testRejectsNonStringModuleUniqueId(mixed $id): void
    {
        $zipFile = $this->makeZip(json_encode(['moduleUniqueID' => $id]));

        $res = GetMetadataFromModulePackageAction::main($zipFile);

        $this->assertFalse($res->success);
        $this->assertContains('ext_InvalidModuleUniqueID', $res->messages);
    }

    public function testMissingOrEmptyModuleUniqueIdKeepsMissingMessage(): void
    {
        foreach ([[], ['moduleUniqueID' => '']] as $settings) {
            $res = GetMetadataFromModulePackageAction::main($this->makeZip(json_encode($settings)));

            $this->assertFalse($res->success);
            $this->assertContains('ext_MissingModuleUniqueID', $res->messages);
        }
    }

    private function makeZip(string $moduleJson): string
    {
        $zipFile = $this->workDir . '/package-' . uniqid('', false) . '.zip';
        $zip = new ZipArchive();
        $zip->open($zipFile, ZipArchive::CREATE);
        $zip->addFromString('module.json', $moduleJson);
        $zip->close();
        return $zipFile;
    }
}
