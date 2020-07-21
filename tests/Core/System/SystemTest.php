<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Tests\Core\System;

use MikoPBX\Core\System\System;
use MikoPBX\PBXCoreREST\Lib\NetworkManagementProcessor;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class SystemTest extends AbstractUnitTest
{

    public function testGenerateAuthorizedKeys()
    {
    }

    public function testGetUpTime()
    {
    }

    public function testHostnameConfigure()
    {
    }

    public function testUpgradeOnline()
    {
    }

    public function testGetMemInfo()
    {
    }

    public function testSyslogDaemonStart()
    {
    }

    public function testGetInfo()
    {
    }

    public function testUpgradeFromImg()
    {
    }

    public function testGnatsLogRotate()
    {
    }

    public function testInvokeActions()
    {
    }

    public function testGetLogDir()
    {
    }

    public function testRebootSyncBg()
    {
    }

    public function testUpdateShellPassword()
    {
    }

    public function testLoadKernelModules()
    {
    }

    public function testModuleDownloadStatus()
    {
    }

    public function testNginxGenerateConf()
    {
    }

    public function testSshdConfigure()
    {
    }

    public function testNginxStart()
    {
    }

    public function testUpdateCustomFiles()
    {
    }

    public function testOnAfterPbxStarted()
    {
    }

    public function test__construct()
    {
    }

    public function testGetCpu()
    {
    }

    public function testSetupPhpLog()
    {
    }

    public function testNetworkReload()
    {
    }

    public function testShutdown()
    {
    }

    public function testCronConfigure()
    {
    }

    public function testVmwareToolsConfigure()
    {
    }

    public function testConvertConfig()
    {
    }

    public function testModuleStartDownload()
    {
    }

    public function testRebootSync()
    {
    }

    public function testStatusUpgrade()
    {
    }

    public function testGnatsStart()
    {
    }

    public function testGetSyslogFile()
    {
    }

    public function testRotatePhpLog()
    {
    }

    public function testGetPhpFile()
    {
    }

    public function testGetExternalIpInfo()
    {
        $result = NetworkManagementProcessor::getExternalIpInfo();
        $this->assertIsArray($result);
    }
}
