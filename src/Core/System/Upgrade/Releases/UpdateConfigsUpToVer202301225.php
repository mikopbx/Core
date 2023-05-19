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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\FirewallRules;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

class UpdateConfigsUpToVer202301225 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2023.1.225';

	/**
     * Class constructor.
     */
    public function __construct()
    {
    }

    /**
     * https://github.com/mikopbx/Core/issues/269
     */
    public function processUpdate():void
    {
        $pathCp = Util::which('cp');
        $pathRm = Util::which('rm');
        $converter = Util::which('wav2mp3.sh');

        $cmd = [
            "$pathRm /storage/usbdisk1/mikopbx/media/custom/miko_hello.* /storage/usbdisk1/mikopbx/media/custom/out_work_times.*" ,
            "$pathCp /offload/asterisk/sounds/other/* /storage/usbdisk1/mikopbx/media/custom/",
            "$converter /storage/usbdisk1/mikopbx/media/custom/out_work_times",
            "$converter /storage/usbdisk1/mikopbx/media/custom/miko_hello",
            "$pathCp /offload/asterisk/sounds/other/* /storage/usbdisk1/mikopbx/media/custom/",
        ];
        Processes::mwExecCommands($cmd);
    }

}