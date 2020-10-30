<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\Sip;
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
        // Обновление конфигов. Это первый запуск системы.
        /** @var \MikoPBX\Common\Models\Sip $peers */
        /** @var \MikoPBX\Common\Models\Sip $peer */
        $peers = Sip::find('type="peer"');
        foreach ($peers as $peer) {
            $peer->secret = md5('' . time() . 'sip' . $peer->id);
            $peer->save();
        }

        /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $managers */
        /** @var \MikoPBX\Common\Models\AsteriskManagerUsers $manager */
        $managers = AsteriskManagerUsers::find();
        foreach ($managers as $manager) {
            $manager->secret = md5('' . time() . 'manager' . $manager->id);
            $manager->save();
        }
    }
}