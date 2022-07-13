<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use MikoPBX\Core\System\Util;
use Phalcon\Config as ConfigAlias;
use Phalcon\Di\Injectable;
use SQLite3;
use Throwable;

class UpdateConfigsUpToVer202221 extends Injectable implements UpgradeSystemConfigInterface
{
    public const PBX_VERSION = '2022.2.1';
    private bool $isLiveCD;

    /**
     * Class constructor.
     */
    public function __construct()
    {
        $this->isLiveCD      = file_exists('/offload/livecd');
    }

    /**
     * Updates system configuration according to new rules
     */
    public function processUpdate(): void
    {
        if ($this->isLiveCD) {
            return;
        }
        $this->updateCodecs();
    }

    /**
     * Update codecs.
     */
    private function updateCodecs():void
    {
        $availCodecs = [
            'g729'  => 'G.729',
        ];
        $this->addNewCodecs($availCodecs);
    }

    /**
     * Adds new codecs from $availCodecs array if it doesn't exist
     *
     * @param array $availCodecs
     */
    private function addNewCodecs(array $availCodecs): void
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
            $codecData->type        = 'audio';
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