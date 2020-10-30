<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Tests\Core\System;

use MikoPBX\Core\System\Storage;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class StorageTest extends AbstractUnitTest
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

    public function testDetermineFormatFs()
    {
    }

    public function testGetMediaDir()
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

    public function testMkfs_disk()
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

    public function testSaveFstab()
    {
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
