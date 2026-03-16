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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\Firewall;

use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractChangePriorityAction;

/**
 * Action for changing priority of firewall network filter rules
 *
 * Extends AbstractChangePriorityAction to leverage:
 * - Bulk priority updates for drag-and-drop reordering
 * - Transaction-based updates with proper error handling
 * - Validation of priority data
 * - Consistent logging and error reporting
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class ChangePriorityAction extends AbstractChangePriorityAction
{
    /**
     * Change priority of multiple network filter rules
     *
     * @param array $data Request data containing priority map
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        return self::executeStandardPriorityChange(
            $data,
            NetworkFilters::class,
            'Network filter',
            'priority',
            'description'
        );
    }
}
