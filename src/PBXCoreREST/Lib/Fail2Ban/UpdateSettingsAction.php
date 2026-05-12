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

            // Update PBX_SECURITY_MODE setting if provided (rate-limit profile for nginx Lua filter).
            // DataStructure already enforces the enum on the way in; this is a belt-and-braces
            // guard for direct API callers that bypass the schema layer.
            if (isset($data[PbxSettings::PBX_SECURITY_MODE])) {
                $mode = (string)$data[PbxSettings::PBX_SECURITY_MODE];
                if (!in_array($mode, PbxSettings::PBX_SECURITY_MODES, true)) {
                    $mode = 'balanced';
                }
                PbxSettings::setValueByKey(PbxSettings::PBX_SECURITY_MODE, $mode);
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
     * Normalize a whitelist string: split by any common delimiter (comma,
     * newline, semicolon, tab), validate each entry as IPv4/IPv6 host or CIDR,
     * canonicalize IPv6 via inet_pton/inet_ntop (so "2001:db8::1" and
     * "2001:0db8:0000:0000:0000:0000:0000:0001" collapse to one entry),
     * drop redundant /32 and /128 host masks, and dedupe.
     *
     * @param string $whitelist Raw whitelist input from user.
     * @return string Normalized whitelist with space-separated valid entries.
     */
    private static function normalizeWhitelist(string $whitelist): string
    {
        $entries = preg_split('/[\s,;]+/', trim($whitelist), -1, PREG_SPLIT_NO_EMPTY);

        $seen = [];
        $valid = [];
        foreach ($entries as $entry) {
            $canonical = self::canonicalizeEntry(trim($entry));
            if ($canonical === null || isset($seen[$canonical])) {
                continue;
            }
            $seen[$canonical] = true;
            $valid[] = $canonical;
        }

        return implode(' ', $valid);
    }

    /**
     * Canonicalize a single whitelist entry.
     *
     * Returns null for anything that does not parse as a valid IPv4/IPv6
     * address or CIDR. IPv6 addresses are normalised via inet_pton/inet_ntop,
     * which collapses every textual form of the same address (case, leading
     * zeros, "::" compression) into a single canonical string. Redundant
     * host masks (/32 for IPv4, /128 for IPv6) are stripped so the stored
     * form matches what the UI shows after `normalizeEntry()` on the client.
     *
     * @param string $entry Raw entry, e.g. "2001:0db8::1" or "10.0.0.0/24".
     * @return string|null Canonical form, or null if invalid.
     */
    private static function canonicalizeEntry(string $entry): ?string
    {
        if ($entry === '') {
            return null;
        }

        $prefix = null;
        if (str_contains($entry, '/')) {
            [$address, $prefix] = explode('/', $entry, 2);
            if (!ctype_digit($prefix)) {
                return null;
            }
        } else {
            $address = $entry;
        }

        if (filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
            if ($prefix === null) {
                return $address;
            }
            $p = (int)$prefix;
            if ($p < 0 || $p > 32) {
                return null;
            }
            return $p === 32 ? $address : "$address/$p";
        }

        if (filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false) {
            $packed = @inet_pton($address);
            if ($packed === false) {
                return null;
            }
            $canonical = inet_ntop($packed);
            if ($canonical === false) {
                return null;
            }
            if ($prefix === null) {
                return $canonical;
            }
            $p = (int)$prefix;
            if ($p < 0 || $p > 128) {
                return null;
            }
            return $p === 128 ? $canonical : "$canonical/$p";
        }

        return null;
    }
}