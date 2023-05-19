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

use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;
use Phalcon\Config as ConfigAlias;

class UpdateConfigsUpToVer20220140 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '2022.1.40';

	private ConfigAlias $config;
    private bool $isLiveCD;

	/**
     * Class constructor.
     */
    public function __construct()
    {
        $this->config = $this->getDI()->getShared('config');
        $this->isLiveCD      = file_exists('/offload/livecd');
    }

    /**
     * https://github.com/mikopbx/Core/issues/269
     */
    public function processUpdate():void
    {
        if ($this->isLiveCD) {
            return;
        }
        shell_exec(Util::which('rm')." -rf /storage/usbdisk*/mikopbx/astlogs/asterisk/events_log.db");
    }
}