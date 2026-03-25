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

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer2026187
 *
 * Replaces removed AGI script cdr_connector.php with Gosub(dial_answer)
 * in all DialplanApplications. The cdr_connector.php AGI was removed from
 * the Asterisk AGI directory; the equivalent CDR tracking is now handled
 * via the dial_answer Lua context.
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer2026187 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2026.1.87';

    /**
     * Main update method
     *
     * @return void
     */
    public function processUpdate(): void
    {
        $this->replaceCdrConnectorAgi();
    }

    /**
     * Replace AGI(cdr_connector.php,...dial_answer) with Gosub(dial_answer,${EXTEN},1)
     * in all DialplanApplications records.
     *
     * @return void
     */
    private function replaceCdrConnectorAgi(): void
    {
        $apps = DialplanApplications::find();
        $count = 0;

        foreach ($apps as $app) {
            $logic = base64_decode($app->applicationlogic);
            if ($logic === false || !str_contains($logic, 'cdr_connector')) {
                continue;
            }

            // Replace AGI(cdr_connector.php,...dial_answer) with Gosub
            $newLogic = preg_replace(
                '/AGI\(cdr_connector\.php,[^)]*dial_answer\)/',
                'Gosub(dial_answer,${EXTEN},1)',
                $logic
            );

            if ($newLogic !== $logic) {
                $app->applicationlogic = base64_encode($newLogic);
                $app->save();
                $count++;
            }
        }

        if ($count > 0) {
            echo "Replaced cdr_connector.php AGI in $count dialplan application(s)\n";
        }
    }
}
