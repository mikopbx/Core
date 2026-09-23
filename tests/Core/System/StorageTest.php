<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\Core\System;

use MikoPBX\Core\System\Storage;

class StorageTest extends \MikoPBX\Tests\Unit\AbstractUnitTest
{
    protected Storage $storage;

    /**
     * Storage constructor
     */
    public function test__construct(): void
    {
        $this->storage = new Storage();
        $this->assertTrue(true);
    }

    public function testGetFsType()
    {
    }

    public function testMountDisk()
    {
    }

    public function testStatusMkfs()
    {
    }

    public function testIsStorageDisk()
    {
    }

    /**
     * #1131: the configured device became the system disk after the disks swapped names.
     */
    public function testPickSystemDiskFallback(): void
    {
        // Legacy row: a separate storage disk found elsewhere wins over system partition 4.
        $this->assertSame('/dev/sda1', Storage::pickSystemDiskFallback('/dev/sda1', '/dev/sdb4', true));
        // Legacy single-disk install: storage lives on system partition 4.
        $this->assertSame('/dev/sdb4', Storage::pickSystemDiskFallback('', '/dev/sdb4', true));
        // A real UUID that was not found must not be replaced by any name-based guess.
        $this->assertSame('', Storage::pickSystemDiskFallback('', '/dev/sdb4', false));
        $this->assertSame('', Storage::pickSystemDiskFallback('/dev/sda1', '/dev/sdb4', false));
    }

    public function testDetermineFormatFs()
    {
    }


    public function testSaveDiskSettings()
    {
    }

    public function testDiskIsMounted()
    {
    }

    public function testIsStorageDiskMounted()
    {
    }

    public function testGetMonitorDir()
    {
    }

    public function testMountSftpDisk()
    {
    }

    public function testGetUuid()
    {
    }

    public function testGetDiskSettings()
    {
    }

    public function testGetAllHdd()
    {
        $this->storage = new Storage();
        $this->storage->getAllHdd();
        $this->assertTrue(true);
    }

    public function testMkfsDisk()
    {
    }

    public function testMountFtp()
    {
    }

    public function testFormatDiskLocal()
    {
    }

    public function testConfigure()
    {
        $this->storage = new Storage();
        $this->storage->configure();
        $this->assertTrue(true);
    }

    public function testUmountDisk()
    {
    }

    public function testGetFreeSpace()
    {
    }



    public function testCheckFreeSpace()
    {
    }

    public function testApplyFolderRights()
    {
        $this->storage = new Storage();
        $this->invokeMethod($this->storage, 'applyFolderRights');
        $this->assertTrue(true);
    }


    /**
     * @throws \ReflectionException
     */
    public function testCreateWorkDirs(): void
    {
        $this->storage = new Storage();
        $this->invokeMethod($this->storage, 'createWorkDirs');
        $this->assertTrue(true);
    }
}
