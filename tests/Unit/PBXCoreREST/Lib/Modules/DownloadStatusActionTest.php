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

use MikoPBX\PBXCoreREST\Lib\Files\FilesConstants;
use MikoPBX\PBXCoreREST\Lib\Modules\DownloadStatusAction;
use PHPUnit\Framework\TestCase;

/**
 * The uniqid of getDownloadStatus becomes a directory name under the upload dir,
 * so it must be rejected before any filesystem or process access.
 * Without DI the valid path falls back to /tmp and sleeps 0.5 s waiting for a
 * download process; a fast answer proves that work was skipped.
 */
final class DownloadStatusActionTest extends TestCase
{
    /**
     * @return array<string, array{string}>
     */
    public static function invalidIdProvider(): array
    {
        return [
            'path traversal' => ['../x'],
            'parent dir' => ['..'],
            'space' => ['Module X'],
            'trailing newline' => ["ModuleX\n"],
            'empty' => [''],
            'too long' => [str_repeat('a', 129)],
        ];
    }

    /**
     * @dataProvider invalidIdProvider
     */
    public function testRejectsInvalidUniqidWithoutFilesystemAccess(string $id): void
    {
        $start = hrtime(true);
        $res = DownloadStatusAction::main($id);
        $elapsed = (hrtime(true) - $start) / 1e9;

        $this->assertFalse($res->success);
        $this->assertSame(400, $res->httpCode);
        $this->assertLessThan(0.3, $elapsed);
    }

    public function testValidUniqidWithoutDownloadReportsNotFound(): void
    {
        $res = DownloadStatusAction::main('ModuleTemplate');

        $this->assertNotSame(400, $res->httpCode);
        $this->assertSame(FilesConstants::STATUS_NOT_FOUND, $res->data[FilesConstants::D_STATUS]);
    }
}
