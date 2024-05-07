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

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

class UpdateConfigsUpToVer20240194 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2024.1.94';

    private bool $isLiveCD;

	/**
     * Class constructor.
     */
    public function __construct()
    {
        $this->isLiveCD      = file_exists('/offload/livecd');
    }

	/**
     * Main function
     */
    public function processUpdate():void
    {
  		if ($this->isLiveCD) {
            return;
        }

          $this->updateExternalSIPPort();
    }

    /**
     * Setup en EXTERNAL_SIP_PORT value
     * @return void
     */
    private function updateExternalSIPPort(): void
    {
        $res = LanInterfaces::find('disabled=0')->toArray();
        foreach ($res as $item) {
            if ($item['topology']===LanInterfaces::TOPOLOGY_PRIVATE && $item['internet']==='1'){
                $parts   = explode(':', trim($item['exthostname']));
                $extPort = PbxSettings::getDefaultArrayValues()[PbxSettingsConstants::EXTERNAL_SIP_PORT];
                if (!empty($parts[1])){
                    $extPort=$parts[1];
                } else {
                    $parts   = explode(':', trim($item['extipaddr']));
                    if (!empty($parts[1])){
                        $extPort=$parts[1];
                    }
                }
                PbxSettings::setValue(PbxSettingsConstants::EXTERNAL_SIP_PORT, $extPort);
            }
        }
    }
}