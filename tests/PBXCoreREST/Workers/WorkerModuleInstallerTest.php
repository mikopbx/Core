<?php

namespace MikoPBX\Tests\PBXCoreREST\Workers;

use MikoPBX\Modules\PbxExtensionUtils;
use MikoPBX\PBXCoreREST\Lib\Files\FilesConstants;
use MikoPBX\PBXCoreREST\Workers\WorkerModuleInstaller;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class WorkerModuleInstallerTest extends AbstractUnitTest
{

    public function testStart()
    {
        $filePath = '/storage/usbdisk1/mikopbx/tmp/www_cache/upload_cache/ModuleCTIClient.1.443.zip';
        $moduleUniqueId = 'ModuleCTIClient';
        $settingsFilePath = "/tmp/install_settings.json";
        $currentModuleDir = PbxExtensionUtils::getModuleDir($moduleUniqueId);
        $install_settings = [
            FilesConstants::FILE_PATH => $filePath,
            'currentModuleDir' => $currentModuleDir,
            'uniqid' => $moduleUniqueId,
        ];


        file_put_contents(
            $settingsFilePath,
            json_encode($install_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
        $argv = ['', 'start', $settingsFilePath];
        $worker = new WorkerModuleInstaller();
        $worker->start($argv);
        $this->assertTrue(true);
    }
}
