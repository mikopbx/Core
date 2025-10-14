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

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractPatchAction;

/**
 * Partial update (modify) custom file action.
 *
 * Delegates to SaveRecordAction with intelligent merge.
 * Only updates fields that are explicitly provided.
 *
 * @package MikoPBX\PBXCoreREST\Lib\CustomFiles
 */
class PatchRecordAction extends AbstractPatchAction
{
    /**
     * Get human-readable entity name for error messages
     *
     * @return string Entity name in lowercase
     */
    protected static function getEntityName(): string
    {
        return 'custom file';
    }

    /**
     * Get Model class for this entity
     *
     * @return string Fully qualified Model class name
     */
    protected static function getModelClass(): string
    {
        return CustomFiles::class;
    }

    /**
     * Get DataStructure class for this entity
     *
     * @return string Fully qualified DataStructure class name
     */
    protected static function getDataStructureClass(): string
    {
        return DataStructure::class;
    }

    /**
     * Get SaveRecordAction class for this entity
     *
     * @return string Fully qualified SaveRecordAction class name
     */
    protected static function getSaveActionClass(): string
    {
        return SaveRecordAction::class;
    }
}