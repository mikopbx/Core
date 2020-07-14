<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Tests\Modules\ModuleBackup\Lib;

use Modules\ModuleBackup\Lib\BackupConf;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class BackupConfTest extends AbstractUnitTest
{

    public function testModuleRestAPICallback()
    {
        $request = [];
        $request['action']='list';
        $module = new BackupConf();
        $result = $module->moduleRestAPICallback($request);
        $this->assertArrayHasKey('result', $result);
    }
}
