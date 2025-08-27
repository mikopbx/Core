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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Get single Asterisk manager record action.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get Asterisk manager record by ID or create new structure.
     *
     * @param string|null $id Manager ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id): PBXApiResult
    {
        // Use standard get record pattern with callbacks for AMI-specific logic
        return self::executeStandardGetRecord(
            id: $id,
            modelClass: AsteriskManagerUsers::class,
            dataStructureClass: DataStructure::class,
            uniqueIdPrefix: 'AMI-',
            defaultValues: self::getDefaultValues(),
            notFoundMessage: "Manager with ID $id not found",
            needsExtension: false, // AMI managers don't need extensions
            newRecordCallback: function($model) {
                // Set AMI-specific defaults for new record
                $model->uniqid = strtoupper('AMI-' . md5(time() . uniqid()));
                return $model;
            }
        );
    }

    /**
     * Get default values for new AMI manager.
     *
     * @return array
     */
    private static function getDefaultValues(): array
    {
        return [
            'username' => '',
            'secret' => '',
            'description' => '',
            'networkfilterid' => 'none',
            'permit' => '127.0.0.1/255.255.255.255',
            'deny' => '0.0.0.0/0.0.0.0',
            'call_limit' => 0,
            // Initialize all permission fields with empty values
            'call' => '',
            'cdr' => '',
            'originate' => '',
            'reporting' => '',
            'agent' => '',
            'config' => '',
            'dialplan' => '',
            'dtmf' => '',
            'log' => '',
            'system' => '',
            'user' => '',
            'verbose' => '',
            'command' => '',
        ];
    }
}