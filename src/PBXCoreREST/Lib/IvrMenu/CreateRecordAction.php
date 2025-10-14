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

namespace MikoPBX\PBXCoreREST\Lib\IvrMenu;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractCreateAction;

/**
 * CreateRecordAction
 * Creates a new IVR menu record.
 *
 * @package MikoPBX\PBXCoreREST\Lib\IvrMenu
 */
class CreateRecordAction extends AbstractCreateAction
{
    /**
     * {@inheritdoc}
     */
    protected static function getEntityName(): string
    {
        return 'IVR menu';
    }

    /**
     * {@inheritdoc}
     */
    protected static function getSaveActionClass(): string
    {
        return SaveRecordAction::class;
    }
}
