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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for Asterisk REST Interface (ARI) Users.
 * 
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create complete data array from AsteriskRestUsers model.
     * 
     * @param \MikoPBX\Common\Models\AsteriskRestUsers $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        $data = [
            'id' => (string)$model->id,
            'username' => $model->username ?? '',
            'password' => $model->password ?? '',
            'applications' => $model->getApplicationsArray(),
            'description' => $model->description ?? '',
        ];

        // Add password strength indicator
        $data['weakPassword'] = (int)($model->weakPassword ?? 0);

        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data);

        return $data;
    }

    /**
     * Create simplified data array for list view.
     * 
     * @param \MikoPBX\Common\Models\AsteriskRestUsers $model
     * @return array
     */
    public static function createForList($model): array
    {
        $data = [
            'id' => (string)$model->id,
            'username' => $model->username ?? '',
            'description' => $model->description ?? '',
        ];

        // Add applications summary
        $applications = $model->getApplicationsArray();
        $data['applicationsSummary'] = empty($applications) ? 'all' : implode(', ', $applications);
        $data['applicationsCount'] = count($applications);

        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data);

        return $data;
    }

    /**
     * Create data structure for dropdown/select options.
     * 
     * @param \MikoPBX\Common\Models\AsteriskRestUsers $model
     * @return array
     */
    public static function createForSelect($model): array
    {
        return [
            'id' => (string)$model->id,
            'username' => $model->username ?? '',
            'represent' => $model->username . (!empty($model->description) ? ' - ' . $model->description : ''),
        ];
    }

    /**
     * Create default structure for new ARI user.
     * 
     * @return array
     */
    public static function createDefault(): array
    {
        return [
            'id' => '',
            'username' => '',
            'password' => '',
            'applications' => [],
            'description' => '',
            'weakPassword' => 0,
        ];
    }
}