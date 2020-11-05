<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2020
 *
 */

namespace MikoPBX\Tests\PBXCoreREST\Workers;

use MikoPBX\PBXCoreREST\Workers\WorkerDownloader;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class WorkerDownloaderTest extends AbstractUnitTest
{

    public function testStart()
    {
        $settingsFilePath = "/tmp/download_settings.json";
        $download_settings = [
            "res_file"=> "/storage/usbdisk1/mikopbx/tmp/www_cache/upload_cache/2020.2.770-dev/update.img",
            "url"=> "https://github.com/mikopbx/Core/releases/download/2020.2.770-dev/mikopbx-2020.2.770-dev-x86_64.img",
            "md5"=> "c4eb2277d29c281da386e441c45c8700",
            "size"=> "169204540"
        ];
        file_put_contents(
            $settingsFilePath,
            json_encode($download_settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
        $argv = ['start', $settingsFilePath];
        $worker = new WorkerDownloader();
        $worker->start($argv);
        $this->assertTrue(true);
    }
}
