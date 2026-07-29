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
 * Class GetOperationStatusAction
 *
 * Returns the status of a single module's operation: the active one when it
 * exists, otherwise the most recent from history. The UI watchdog polls this
 * to reach a terminal state when nchan messages were lost.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules\Journal
 */
class GetOperationStatusAction
{
    // Value of data['state'] when a module has no journal records at all
    public const string STATE_NONE = 'none';

    /**
     * @param string $moduleUniqueId Module unique id
     * @param string $operationUid Optional specific operation uid
     */
    public static function main(string $moduleUniqueId, string $operationUid = ''): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        try {
            $repository = new ModuleOperationsRepository();

            $row = null;
            if ($operationUid !== '') {
                $row = $repository->getByUid($operationUid);
            }
            if ($row === null && $moduleUniqueId !== '') {
                $row = $repository->getActiveForModule($moduleUniqueId);
                if ($row === null) {
                    $recent = $repository->getRecent($moduleUniqueId, 1);
                    $row = $recent[0] ?? null;
                }
            }

            if ($row === null) {
                $res->data = ['state' => self::STATE_NONE, 'moduleUniqueId' => $moduleUniqueId];
            } else {
                $res->data = ModuleOperationsRepository::toApiArray($row);
            }
            $res->success = true;
        } catch (Throwable $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
        }
        return $res;
    }
}
