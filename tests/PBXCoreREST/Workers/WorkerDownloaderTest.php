<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
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
        $argv = ['', 'start', $settingsFilePath];
        $worker = new WorkerDownloader();
        $worker->start($argv);
        $this->assertTrue(true);
    }
}
