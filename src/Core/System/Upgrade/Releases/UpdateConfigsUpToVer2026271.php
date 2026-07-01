<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Asterisk\Configs\Generators\CodecSync;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer2026271
 *
 * Normalises the codec table to the modern default set on fresh installs.
 *
 * On a fresh install the seed database ships PBXVersion=0.0.2, so the whole
 * upgrade chain runs from scratch — including the legacy codec scripts
 * (UpdateConfigsUpToVer20202754::deleteOrphanCodecs()/disableCodecs(),
 * UpdateConfigsUpToVer202202103, UpdateConfigsUpToVer202302161). Those impose
 * an obsolete codec list (they delete g729/g722/h265/vp8/vp9 and leave only
 * h264/alaw/ulaw/opus/ilbc enabled, plus JPEG/H.261 garbage). This release runs
 * last (highest version) and re-applies the canonical default set so a fresh
 * install ends up with opus, g722, alaw, ulaw, g729 (audio) and h265, h264,
 * vp9, vp8 (video) enabled. CodecSync::syncCodecsWithAsterisk() then refines it
 * against the running Asterisk build.
 *
 * The reset is gated to installs that actually went through the destructive
 * legacy chain (previous version < 2020.2.754, which includes fresh 0.0.2).
 * Upgrades from newer versions keep the administrator's own codec choices.
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer2026271 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2026.2.71';

    /**
     * Last version whose upgrade scripts destructively rewrote the codec table.
     */
    private const string LEGACY_CODEC_CHAIN_VERSION = '2020.2.754';

    /**
     * Main update method
     *
     * @return void
     */
    public function processUpdate(): void
    {
        // During the upgrade run PBX_VERSION still holds the pre-upgrade value;
        // it is bumped to the current firmware only after the whole chain finishes.
        $previousVersion = (string)str_ireplace(
            '-dev',
            '',
            PbxSettings::getValueByKey(PbxSettings::PBX_VERSION)
        );

        // Only reset codecs for installs that ran the destructive legacy chain
        // (fresh install starts at 0.0.2). Preserve codec choices on newer upgrades.
        if (version_compare($previousVersion, self::LEGACY_CODEC_CHAIN_VERSION, '<')) {
            CodecSync::applyDefaultCodecSet();
            echo "Applied default codec set after legacy upgrade chain\n";
        }
    }
}
