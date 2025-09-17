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

namespace MikoPBX\PBXCoreREST\Lib\Network;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for deleting network interface
 *
 * @api {delete} /pbxcore/api/v3/network/:id Delete network interface
 * @apiVersion 3.0.0
 * @apiName DeleteNetworkInterface
 * @apiGroup Network
 *
 * @apiParam {String} id Interface ID
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Empty object on success
 */
class DeleteRecordAction
{
    /**
     * Delete network interface by ID
     *
     * @param string $id Interface ID
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        if (empty($id)) {
            $res->messages['error'][] = 'Interface ID is required';
            return $res;
        }

        try {
            $eth = LanInterfaces::findFirstById($id);

            if ($eth === null) {
                $res->messages['error'][] = "Interface with ID $id not found";
                return $res;
            }

            // Check if interface can be deleted
            if ($eth->internet === '1') {
                $res->messages['error'][] = 'Cannot delete internet interface';
                return $res;
            }

            if ($eth->delete() === false) {
                foreach ($eth->getMessages() as $message) {
                    $res->messages['error'][] = $message->getMessage();
                }
                return $res;
            }

            $res->success = true;
            $res->data = ['id' => $id];

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}