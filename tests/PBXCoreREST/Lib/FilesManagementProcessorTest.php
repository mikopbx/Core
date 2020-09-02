<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2020
 *
 */

namespace MikoPBX\Tests\PBXCoreREST\Lib;

use MikoPBX\Core\System\System;
use MikoPBX\PBXCoreREST\Lib\FilesManagementProcessor;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class FilesManagementProcessorTest extends AbstractUnitTest
{

    public function testScanDirRecursively()
    {
        $logDir     = System::getLogDir();
        $entries = FilesManagementProcessor::scanDirRecursively($logDir);
        $this->assertTrue(true);
    }
}
