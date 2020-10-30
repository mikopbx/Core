<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModuleBackup\Lib;

use Modules\ModuleBackup\Lib\Backup;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class BackupTest extends AbstractUnitTest
{

    public function testDownload()
    {
        $backupId = 'backup_1594380302';
        $result = Backup::download(['id'=>$backupId]);
        $this->assertArrayHasKey('result', $result);
        $this->assertEquals('Success', $result['result']);
    }
}
