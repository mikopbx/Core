<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Common\Models\Users;
use Phalcon\Di\Injectable;

/**
 * Class UsersManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class UsersManagementProcessor extends Injectable
{
    /**
     * Processes Users management requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $action = $request['action'];
        $data = $request['data'];
        switch ($action) {
            case 'available':
                if (!empty($data['email'])) {
                    $record = Users::findFirstByEmail($data['email']);
                    if ($record) {
                        $res->data['userId'] = $record->id;
                        $res->data['represent'] = $record->getRepresent();
                        $res->data['available'] = false;
                    } else {
                        $res->data['available'] = true;
                    }
                    $res->success = true;
                } else {
                    $res->messages['error'][] = 'Empty email value in POST/GET data';
                }
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;

        return $res;
    }


}