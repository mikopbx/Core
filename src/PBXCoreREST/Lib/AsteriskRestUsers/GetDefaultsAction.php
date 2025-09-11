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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers;

use MikoPBX\Common\Models\AsteriskRestUsers;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * GetDefaultsAction
 * Returns default values for a new ARI user.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers
 */
class GetDefaultsAction
{
    /**
     * Get default values for a new ARI user.
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Return default values for new ARI user
            $data = [
                'id' => '',
                'username' => '',
                'password' => AsteriskRestUsers::generateARIPassword(), // Generate secure password
                'description' => '',
                'applications' => [],
                'isSystem' => false
            ];
            
            $res->data = $data;
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}