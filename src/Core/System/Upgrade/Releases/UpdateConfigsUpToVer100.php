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

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

/**
 * First bootup
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer100 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '1.0.0';

    public function processUpdate():void
    {
        $now = time();
        // Обновление конфигов. Это первый запуск системы.
        /** @var \MikoPBX\Common\Models\Sip $peer */
        $peers = Sip::find('type="peer"');
        foreach ($peers as $peer) {
            $peer->secret = 'E'.md5(''.$now.'sip'.$peer->id);
            $peer->save();
        }
        /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $manager */
        $managers = AsteriskManagerUsers::find();
        foreach ($managers as $manager) {
            $manager->secret = 'M'.md5(''.$now.'manager'.$manager->id);
            $manager->save();
        }
        $generalConfig = new MikoPBXConfig();
        $newPasswordSsh = 'S'.md5(''.$now.'ssh'.$now);
        $generalConfig->setGeneralSettings('SSHPassword', $newPasswordSsh);
        $generalConfig->setGeneralSettings('SSHPasswordHashString', md5($newPasswordSsh));
        $generalConfig->setGeneralSettings('SSHDisablePasswordLogins', '1');
        $generalConfig->setGeneralSettings('SSHAuthorizedKeys', '');
        $generalConfig->setGeneralSettings('PBXAllowGuestCalls', '0');
    }
}