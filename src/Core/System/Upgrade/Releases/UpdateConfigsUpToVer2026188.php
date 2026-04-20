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

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use MikoPBX\Modules\PbxExtensionUtils;
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer2026188
 *
 * Backfills `module_type` column on `m_PbxExtensionModules` for records that
 * were installed before the column was introduced. Value is sourced from the
 * module's own `module.json` when present; defaults to `general`.
 *
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer2026188 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2026.1.88';

    /**
     * Main update method
     */
    public function processUpdate(): void
    {
        $this->backfillModuleType();
    }

    /**
     * Populate `module_type` for existing installed modules.
     *
     * Rules:
     *   - Read `module_type` from `{moduleDir}/module.json` when the file exists.
     *   - Fall back to `general` when the field is absent or unreadable.
     *   - Skip rows where the field is already set (idempotent).
     */
    private function backfillModuleType(): void
    {
        $modules = PbxExtensionModules::find();
        $updated = 0;

        foreach ($modules as $module) {
            if (!empty($module->module_type)) {
                continue;
            }

            $module->module_type = $this->detectModuleType((string)$module->uniqid);
            if ($module->save()) {
                $updated++;
            }
        }

        if ($updated > 0) {
            echo "Backfilled module_type for $updated module(s)\n";
        }
    }

    /**
     * Resolve module_type from on-disk module.json.
     */
    private function detectModuleType(string $moduleUniqueID): string
    {
        $moduleDir = PbxExtensionUtils::getModuleDir($moduleUniqueID);
        $moduleJson = "$moduleDir/module.json";

        if (!is_readable($moduleJson)) {
            return 'general';
        }

        $jsonString = file_get_contents($moduleJson);
        if ($jsonString === false) {
            return 'general';
        }

        $descriptor = json_decode($jsonString, true);
        if (!is_array($descriptor) || empty($descriptor['module_type'])) {
            return 'general';
        }

        return (string)$descriptor['module_type'];
    }
}
