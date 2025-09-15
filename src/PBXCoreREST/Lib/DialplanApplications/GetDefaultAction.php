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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Get default values for new dialplan application
 *
 * @package MikoPBX\PBXCoreREST\Lib\DialplanApplications
 */
class GetDefaultAction
{
    /**
     * Get default values for creating a new dialplan application
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get next available extension using centralized method
            $extension = Extensions::getNextFreeApplicationNumber();
            
            // Build response data structure for new record
            // Following REST API v3 pattern: empty id for new records
            $res->data = [
                'id' => '', // Empty for new records
                'name' => '',
                'extension' => $extension,
                'hint' => '',
                'description' => '',
                'type' => 'php',
                'applicationlogic' => '',
            ];
            
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}