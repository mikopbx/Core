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

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer2026186
 *
 * Removes OpenVPN custom file record from database.
 * OpenVPN support has been moved from core to a separate module
 * that uses the ON_AFTER_NETWORK_CONFIGURED hook.
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer2026186 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2026.1.86';

    /**
     * Main update method
     *
     * @return void
     */
    public function processUpdate(): void
    {
        $this->removeOpenVpnCustomFile();
    }

    /**
     * Remove the OpenVPN custom file record from m_CustomFiles table.
     *
     * @return void
     */
    private function removeOpenVpnCustomFile(): void
    {
        $record = CustomFiles::findFirst([
            'conditions' => 'filepath = :path:',
            'bind' => ['path' => '/etc/openvpn.ovpn'],
        ]);

        if ($record !== null) {
            $record->delete();
            echo "Removed OpenVPN custom file record (moved to module)\n";
        }
    }
}
