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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

/**
 * Get list of Asterisk managers action.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of all Asterisk managers.
     *
     * @param array $data Request parameters (search, ordering, pagination)
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        return self::executeStandardList(
            modelClass: AsteriskManagerUsers::class,
            dataStructureClass: DataStructure::class,
            requestParams: $data,
            baseQueryOptions: [],
            useFullData: false,
            allowedOrderFields: ['username', 'id'],
            searchableFields: ['username', 'description'],
            defaultOrder: 'username ASC'
        );
    }
}