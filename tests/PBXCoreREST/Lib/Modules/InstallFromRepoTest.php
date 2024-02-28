<?php

namespace MikoPBX\Tests\PBXCoreREST\Lib\Modules;

use MikoPBX\PBXCoreREST\Lib\Modules\InstallFromRepo;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class InstallFromRepoTest extends AbstractUnitTest
{

    public function testMain()
    {
        $asyncChannelId = 'install-modules';
        $moduleUniqueID = 'ModulePT1CCore';
        $releaseId = intval('1206')??0;
        $installer = new InstallFromRepo($asyncChannelId, $moduleUniqueID, $releaseId);
        $installer->start();
        $this->assertTrue(true);
    }
}
