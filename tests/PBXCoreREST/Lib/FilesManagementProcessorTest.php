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
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\FilesManagementProcessor;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class FilesManagementProcessorTest extends AbstractUnitTest
{

    public function testScanDirRecursively()
    {
        $logDir     = System::getLogDir();
        $filesList = [];
        $entries = FilesManagementProcessor::scanDirRecursively($logDir);
        $entries = Util::flattenArray($entries);
        foreach($entries as $entry) {
            $fileSize = filesize($entry);
            $now  = time();
            if ($fileSize===0
                ||$now-filemtime($entry)>604800 // Older than 7 days
            )
            {
                continue;
            }
            $relativePath = str_ireplace($logDir. '/', '', $entry);
            $fileSizeKB = ceil($fileSize/1024);
            $filesList[$relativePath] =
                [
                    'path'=> $relativePath,
                    'size'=> "{$fileSizeKB} kb",
                ];
        }

        ksort($filesList);
        $this->assertTrue(true);
    }
}
