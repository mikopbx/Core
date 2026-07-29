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

namespace MikoPBX\PBXCoreREST\Lib\Modules\Journal;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Throwable;

/**
 * Class GetOperationsAction
 *
 * Returns module operations from the journal: all active ones plus recent
 * history. The UI calls it on page load to restore progress bars and button
 * locks after a reload, and as a polling fallback when nchan is silent.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules\Journal
 */
class GetOperationsAction
{
    /**
     * @param array $data Request data: optional 'moduleUniqueId', 'limit'
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        try {
            $repository = new ModuleOperationsRepository();
            $moduleUniqueId = (string)($data['moduleUniqueId'] ?? '');
            $limit = (int)($data['limit'] ?? 20);

            $active = [];
            foreach ($repository->getAllActive() as $row) {
                if ($moduleUniqueId !== '' && $row['moduleUniqueId'] !== $moduleUniqueId) {
                    continue;
                }
                $active[] = ModuleOperationsRepository::toApiArray($row);
            }
            // History holds terminal operations only: active ones are already
            // listed above and must not appear twice.
            $recent = [];
            foreach ($repository->getRecent($moduleUniqueId, $limit) as $row) {
                $apiRow = ModuleOperationsRepository::toApiArray($row);
                if ($apiRow['terminal']) {
                    $recent[] = $apiRow;
                }
            }

            $res->data = [
                'active' => $active,
                'recent' => $recent,
            ];
            $res->success = true;
        } catch (Throwable $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
        }
        return $res;
    }
}
