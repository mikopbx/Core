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

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer202672
 *
 * Makes the system extensions (hangup, busy, voicemail, did2user) selectable
 * as routing targets again.
 *
 * UpdateConfigsUpToVer20241212 created missing system extensions with
 * show_in_phonebook = 0, while the routing dropdowns (DropdownsAction) list
 * only extensions with show_in_phonebook = 1. On such installs "Busy",
 * "Hangup", "Voicemail" and "DID to User" disappeared from the incoming
 * routes, IVR, queue and call-forwarding selectors.
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer202672 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2026.7.2';

    /**
     * Main update method
     *
     * @return void
     */
    public function processUpdate(): void
    {
        $extensions = Extensions::find([
            'conditions' => 'type = :type: AND (show_in_phonebook IS NULL OR show_in_phonebook <> :show:)',
            'bind' => [
                'type' => Extensions::TYPE_SYSTEM,
                'show' => '1',
            ],
        ]);
        foreach ($extensions as $extension) {
            $extension->show_in_phonebook = '1';
            if ($extension->update()) {
                echo "Made system extension {$extension->number} selectable\n";
            } else {
                echo "Failed to update system extension {$extension->number}: "
                    . implode(', ', $extension->getMessages()) . "\n";
            }
        }
    }
}
