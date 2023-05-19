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