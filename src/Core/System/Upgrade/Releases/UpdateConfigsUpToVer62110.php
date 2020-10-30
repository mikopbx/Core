<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2020
 *
 */

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\IvrMenu;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

/**
 * Upgrade from * to 6.2.110
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer62110 extends Injectable implements UpgradeSystemConfigInterface
{
  	public const PBX_VERSION = '6.2.110';

    public function processUpdate():void
    {
        /** @var \MikoPBX\Common\Models\Codecs $codec_g722 */
        $codec_g722 = Codecs::findFirst('name="g722"');
        if ($codec_g722 === null) {
            $codec_g722              = new Codecs();
            $codec_g722->name        = 'g722';
            $codec_g722->type        = 'audio';
            $codec_g722->description = 'G.722';
            $codec_g722->save();
        }

        /** @var \MikoPBX\Common\Models\IvrMenu $ivrs */
        /** @var \MikoPBX\Common\Models\IvrMenu $ivr */
        $ivrs = IvrMenu::find();
        foreach ($ivrs as $ivr) {
            if (empty($ivr->number_of_repeat)) {
                $ivr->number_of_repeat = 5;
                $ivr->save();
            }
            if (empty($ivr->timeout)) {
                $ivr->timeout = 7;
                $ivr->save();
            }
        }

        // Чистим мусор.
        /** @var \MikoPBX\Common\Models\PbxExtensionModules $modules */
        $modules = PbxExtensionModules::find();
        foreach ($modules as $module) {
            if ($module->version === '1.0' && empty($module->support_email) && 'МИКО' === $module->developer) {
                $module->delete();
            }
        }
    }
}