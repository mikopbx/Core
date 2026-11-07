<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\Util;
use PHPUnit\Framework\TestCase;

/**
 * Issue #1390 (B-048): rRmDir() iterated scandir() output before checking it for false.
 */
final class UtilRRmDirTest extends TestCase
{
    public function testRemovesNestedDirectory(): void
    {
        $root = sys_get_temp_dir() . '/mikopbx-rrmdir-' . getmypid();
        mkdir($root . '/nested/deeper', 0777, true);
        file_put_contents($root . '/file.txt', 'x');
        file_put_contents($root . '/nested/deeper/file.txt', 'y');

        Util::rRmDir($root);

        self::assertDirectoryDoesNotExist($root);
    }

    public function testIgnoresMissingDirectory(): void
    {
        $missing = sys_get_temp_dir() . '/mikopbx-rrmdir-missing-' . getmypid();

        Util::rRmDir($missing);

        self::assertDirectoryDoesNotExist($missing);
    }
}
