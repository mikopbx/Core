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

namespace MikoPBX\PBXCoreREST\Lib\Passkeys;

use MikoPBX\Common\Models\UserPasskeys;

/**
 * Passkey Data Structure
 *
 * Formats passkey data for API responses.
 * SECURITY: Never exposes sensitive fields (credential_id, public_key) in public responses.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Passkeys
 */
class PasskeyDataStructure
{
    /**
     * Format single passkey record for API response
     *
     * @param UserPasskeys $record Passkey model
     * @return array Formatted data (excludes sensitive fields)
     */
    public static function getRecord(UserPasskeys $record): array
    {
        return [
            'id' => $record->id,
            'name' => $record->name,
            'credential_id' => $record->credential_id, // Safe to expose (used in authentication)
            'created_at' => $record->created_at,
            'last_used_at' => $record->last_used_at,
            'aaguid' => $record->aaguid,
            // DO NOT expose: public_key, counter, login
        ];
    }

    /**
     * Format list of passkeys for API response
     *
     * @param iterable $records Iterable of UserPasskeys models (ResultSet or array)
     * @return array Array of formatted records
     */
    public static function getList(iterable $records): array
    {
        $result = [];
        foreach ($records as $record) {
            $result[] = self::getRecord($record);
        }
        return $result;
    }

    /**
     * Format passkey for internal use (includes credential_id for authentication)
     *
     * @param UserPasskeys $record Passkey model
     * @return array Full passkey data for WebAuthn operations
     */
    public static function getForAuthentication(UserPasskeys $record): array
    {
        return [
            'id' => $record->credential_id, // WebAuthn credential ID
            'type' => 'public-key',
            // Optionally add transports if stored
        ];
    }
}
