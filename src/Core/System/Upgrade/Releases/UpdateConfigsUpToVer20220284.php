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

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

class UpdateConfigsUpToVer20220284 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2022.2.84';

	/**
     * Class constructor.
     */
    public function __construct()
    {
    }

    /**
     * https://github.com/mikopbx/Core/issues/155
     */
    public function processUpdate():void
    {
        $extensions = [
            IncomingRoutingTable::ACTION_HANGUP,
            IncomingRoutingTable::ACTION_BUSY,
            IncomingRoutingTable::ACTION_DID
        ];
        foreach ($extensions as $extension){
            $data                = Extensions::findFirst('number="' . $extension . '"');
            if ($data===null) {
                $data                    = new Extensions();
                $data->number            = $extension;
            }
            $data->type              = Extensions::TYPE_SYSTEM;
            $data->callerid          = 'System Extension';
            $data->public_access     = 0;
            $data->show_in_phonebook = 1;
            $data->save();
        }
    }
}