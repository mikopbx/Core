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

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

/**
 * Action for getting list of all extension records
 *
 * Extends AbstractGetListAction to leverage:
 * - Standard list retrieval patterns
 * - Search functionality
 * - Ordering support
 * - Pagination support
 * - Consistent error handling
 *
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of all extensions
     *
     * Supports:
     * - Search by number, callerid, type
     * - Ordering by number, callerid, type
     * - Pagination (limit, offset)
     *
     * @param array<string, mixed> $data Filter parameters (search, ordering, pagination)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        // Use standard list execution from AbstractGetListAction
        return self::executeStandardList(
            Extensions::class,               // Model class
            DataStructure::class,            // Data structure class
            $data,                           // Request params (search, order, pagination)
            [],                              // Base query options
            false,                           // Use full data (false = use createForList)
            ['number', 'callerid', 'type'],  // Allowed order fields
            ['number', 'callerid', 'type'],  // Searchable fields
            null,                            // Record filter callback
            'number ASC'                     // Default order
        );
    }
}
