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

use MikoPBX\Common\Models\StorageSettings;
use MikoPBX\Core\System\Upgrade\UpgradeSystemConfigInterface;
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer2026189
 *
 * Backfills the new s3_provider_preset and s3_use_path_style columns on
 * m_StorageSettings for installs that previously relied on the substring
 * heuristic in S3Client (endpoint contained "minio" or ":9000" → path-style).
 *
 * Rules:
 *   - Skip rows where s3_provider_preset is already set (idempotent).
 *   - If endpoint matches the old MinIO heuristic → preset=minio, path_style=1.
 *   - Otherwise → preset=custom, path_style=0 (preserves AWS/Wasabi behavior).
 */
class UpdateConfigsUpToVer2026189 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2026.1.89';

    public function processUpdate(): void
    {
        $this->backfillProviderPreset();
    }

    private function backfillProviderPreset(): void
    {
        $rows = StorageSettings::find();
        $updated = 0;

        foreach ($rows as $row) {
            if (!empty($row->s3_provider_preset) && $row->s3_provider_preset !== StorageSettings::PRESET_CUSTOM) {
                continue;
            }

            $endpoint = (string)($row->s3_endpoint ?? '');
            if ($endpoint !== '' && (str_contains($endpoint, 'minio') || str_contains($endpoint, ':9000'))) {
                $row->s3_provider_preset = StorageSettings::PRESET_MINIO;
                $row->s3_use_path_style = 1;
            } else {
                $row->s3_provider_preset = StorageSettings::PRESET_CUSTOM;
                $row->s3_use_path_style = 0;
            }

            if ($row->save()) {
                $updated++;
            }
        }

        if ($updated > 0) {
            echo "Backfilled s3_provider_preset on $updated StorageSettings row(s)\n";
        }
    }
}
