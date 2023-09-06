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

class UpdateConfigsUpToVer202302161 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2023.2.161';

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
        $availCodecs = [
            'JPEG'      => 'jpeg',
            'H.261'     => 'h261',
            'VP8'       => 'vp8',
            'VP9'       => 'vp9',
        ];
        $this->addNewCodecs($availCodecs, false);
    }


    /**
     * Adds new codecs from $availCodecs array if it doesn't exist
     * @param array $availCodecs
     * @param bool  $isAudio
     * @return void
     */
    private function addNewCodecs(array $availCodecs, bool $isAudio = true): void
    {
        foreach ($availCodecs as $availCodec => $desc) {
            $codecData = Codecs::findFirst('name="' . $availCodec . '"');
            if ($codecData === null) {
                $codecData = new Codecs();
            } elseif ($codecData->description === $desc) {
                unset($codecData);
                continue;
            }
            $codecData->name = $availCodec;
            $codecData->type        = $isAudio?'audio':'video';
            $codecData->disabled    = '1';
            $codecData->description = $desc;
            if ( ! $codecData->save()) {
                Util::sysLogMsg(
                    __CLASS__,
                    'Can not update codec info ' . $codecData->name . ' from \MikoPBX\Common\Models\Codecs',
                    LOG_ERR
                );
            }
        }
    }

}