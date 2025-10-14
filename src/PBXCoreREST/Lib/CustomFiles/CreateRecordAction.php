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

namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractCreateAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Create new custom file action.
 *
 * Delegates to SaveRecordAction for actual creation.
 * Ensures operation is CREATE by not providing ID.
 *
 * @package MikoPBX\PBXCoreREST\Lib\CustomFiles
 */
class CreateRecordAction extends AbstractCreateAction
{
    /**
     * Create new custom file.
     *
     * @param array $data Custom file data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        // Ensure this is a CREATE operation by removing ID
        // SaveRecordAction will detect CREATE operation when ID is empty
        unset($data['id']);

        // Delegate to SaveRecordAction for unified logic
        return SaveRecordAction::main($data);
    }
}