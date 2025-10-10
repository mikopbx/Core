<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * CreateRecordAction
 * Creates a new outbound route record.
 *
 * @package MikoPBX\PBXCoreREST\Lib\OutboundRoutes
 */
class CreateRecordAction extends AbstractSaveRecordAction
{
    /**
     * Create a new outbound route record.
     *
     * @param array<string, mixed> $data Outbound route data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // For create operation, allow custom ID if provided (for migrations/imports)
            // ID validation is handled by SaveRecordAction
            // If no ID provided, SaveRecordAction will use auto-increment

            // Remove legacy uniqid field if present (use 'id' instead in v3 API)
            unset($data['uniqid']);

            // Use existing SaveRecordAction logic for actual save
            $res = SaveRecordAction::main($data);

            // If successful, publish event for new outbound route creation
            if ($res->success && isset($res->data['id'])) {
                SystemMessages::sysLogMsg(__CLASS__, 'New outbound route created: ' . $res->data['id'], LOG_INFO);
            }

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}
