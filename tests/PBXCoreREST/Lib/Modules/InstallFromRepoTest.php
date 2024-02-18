<?php

namespace MikoPBX\Tests\PBXCoreREST\Lib\Modules;

use MikoPBX\PBXCoreREST\Lib\Modules\InstallFromRepo;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class InstallFromRepoTest extends AbstractUnitTest
{

    public function testMain()
    {
        InstallFromRepo::main('ModuleDocker',1321);
        $this->assertTrue(true);
    }
}
