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

namespace MikoPBX\PBXCoreREST\Lib\Fail2Ban;

use MikoPBX\Common\Models\Fail2BanRules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Class UpdateSettingsAction
 * Updates Fail2Ban settings including rules and firewall configuration
 *
 * @package MikoPBX\PBXCoreREST\Lib\Fail2Ban
 */
class UpdateSettingsAction extends Injectable
{
    /**
     * Update Fail2Ban settings
     *
     * @param array $data The settings data to update
     * @return PBXApiResult An object containing the result of the API call
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $di = Di::getDefault();
        $db = $di->get(MainDatabaseProvider::SERVICE_NAME);
        
        $db->begin();

        try {
            // Find or create Fail2Ban rules record
            $record = Fail2BanRules::findFirst();
            if ($record === null) {
                $record = new Fail2BanRules();
            }

            // Update fields from request data
            $fields = ['maxretry', 'bantime', 'findtime', 'whitelist'];
            foreach ($fields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'whitelist') {
                        // Normalize whitelist: extract valid IPs/CIDRs from any delimiter format
                        $data[$field] = self::normalizeWhitelist($data[$field]);
                    }
                    $record->$field = $data[$field];
                }
            }

            // Save the record
            if (!$record->save()) {
                $errors = [];
                foreach ($record->getMessages() as $message) {
                    $errors[] = $message->getMessage();
                }
                $res->messages['error'] = $errors;
                $res->success = false;
                $db->rollback();
                return $res;
            }

            // Update PBX_FIREWALL_MAX_REQ setting if provided
            if (isset($data[PbxSettings::PBX_FIREWALL_MAX_REQ])) {
                PbxSettings::setValueByKey(
                    PbxSettings::PBX_FIREWALL_MAX_REQ,
                    $data[PbxSettings::PBX_FIREWALL_MAX_REQ]
                );
            }

            $db->commit();

            $res->success = true;
            $res->messages['info'][] = 'Settings saved successfully';

        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }

        return $res;
    }

    /**
     * Normalize whitelist string: split by any common delimiter (comma, newline, semicolon, tab),
     * validate each entry as IPv4/IPv6 address or CIDR notation, and rejoin with spaces.
     *
     * @param string $whitelist Raw whitelist input from user.
     * @return string Normalized whitelist with space-separated valid entries.
     */
    private static function normalizeWhitelist(string $whitelist): string
    {
        // Split by any combination of commas, semicolons, newlines, tabs, spaces
        $entries = preg_split('/[\s,;]+/', trim($whitelist), -1, PREG_SPLIT_NO_EMPTY);

        $valid = [];
        foreach ($entries as $entry) {
            $entry = trim($entry);
            if ($entry === '') {
                continue;
            }
            // Accept valid IPv4, IPv6, or CIDR notation
            if (filter_var($entry, FILTER_VALIDATE_IP) !== false
                || preg_match('#^(\d{1,3}\.){3}\d{1,3}/\d{1,2}$#', $entry)
                || preg_match('#^[0-9a-fA-F:]+/\d{1,3}$#', $entry)
            ) {
                $valid[] = $entry;
            }
        }

        return implode(' ', $valid);
    }
}