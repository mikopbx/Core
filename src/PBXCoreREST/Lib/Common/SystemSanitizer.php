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

namespace MikoPBX\PBXCoreREST\Lib\Common;

use MikoPBX\Common\Models\Extensions;

/**
 * System sanitizer class for handling special extension and routing values
 * 
 * This class provides sanitization rules that handle both regular numeric extensions
 * and system extensions dynamically loaded from the database.
 */
class SystemSanitizer
{
    /**
     * Get sanitization rule for extension fields that allows numeric extensions and system values
     *
     * Returns rules in array format to avoid issues with pipe characters in regex patterns.
     *
     * @param int $maxLength Maximum length for numeric extensions (default: 20 for phone numbers)
     * @param bool $allowEmpty Whether to allow empty values (default: true)
     * @return array Sanitization rule as array
     */
    public static function getExtensionSanitizationRule(int $maxLength = 20, bool $allowEmpty = true): array
    {
        $rules = ['string'];

        // Get system extensions from database
        $systemExtensions = Extensions::getSystemExtensions();

        if (!empty($systemExtensions)) {
            // Filter out empty values and escape for regex with delimiter
            $systemExtensions = array_filter($systemExtensions, fn($ext) => !empty($ext));

            if (!empty($systemExtensions)) {
                // Create regex pattern that allows:
                // 1. Numeric extensions/phone numbers (1-20 digits)
                // 2. System extension values from database
                // IMPORTANT: Pass '/' as second parameter to preg_quote to escape the delimiter
                $systemValues = implode('|', array_map(fn($ext) => preg_quote($ext, '/'), $systemExtensions));
                $pattern = "/^([0-9]{1,{$maxLength}}|{$systemValues})$/";
            } else {
                // All system extensions were empty, allow only numeric
                $pattern = "/^[0-9]{1,{$maxLength}}$/";
            }
        } else {
            // If no system extensions found, allow only numeric
            $pattern = "/^[0-9]{1,{$maxLength}}$/";
        }

        $rules[] = "regex:{$pattern}";
        $rules[] = "max:{$maxLength}";

        if ($allowEmpty) {
            $rules[] = 'empty_to_null';
        }

        return $rules;
    }

    /**
     * Get sanitization rule for routing fields that allows numeric extensions and system extensions
     *
     * @param int $maxLength Maximum length for numeric extensions (default: 20 for phone numbers)
     * @param bool $allowEmpty Whether to allow empty values (default: true)
     * @return array Sanitization rule as array
     */
    public static function getRoutingSanitizationRule(int $maxLength = 20, bool $allowEmpty = true): array
    {
        // For routing, we use the same rules as extensions since system extensions can be routing destinations
        return self::getExtensionSanitizationRule($maxLength, $allowEmpty);
    }

    /**
     * Check if a value is a valid extension (numeric or system value)
     * 
     * @param string $value Value to check
     * @param int $maxLength Maximum length for numeric extensions (default: 20 for phone numbers)
     * @return bool True if valid extension
     */
    public static function isValidExtension(string $value, int $maxLength = 20): bool
    {
        // Check if it's a system extension from database
        $systemExtensions = Extensions::getSystemExtensions();
        // Filter out empty values
        $systemExtensions = array_filter($systemExtensions, fn($ext) => !empty($ext));
        if (in_array($value, $systemExtensions, true)) {
            return true;
        }

        // Check if it's a numeric extension/phone number
        return preg_match("/^[0-9]{1,{$maxLength}}$/", $value) === 1;
    }

    /**
     * Check if a value is a valid routing destination (numeric or system extension)
     * 
     * @param string $value Value to check
     * @param int $maxLength Maximum length for numeric extensions (default: 20 for phone numbers)
     * @return bool True if valid routing destination
     */
    public static function isValidRoutingDestination(string $value, int $maxLength = 20): bool
    {
        // For routing destinations, use the same validation as extensions
        return self::isValidExtension($value, $maxLength);
    }

    /**
     * Sanitize extension value by removing invalid characters while preserving system values
     * 
     * @param string $value Value to sanitize
     * @param int $maxLength Maximum length for numeric extensions (default: 20 for phone numbers)
     * @return string Sanitized value
     */
    public static function sanitizeExtension(string $value, int $maxLength = 20): string
    {
        $value = trim($value);

        // If it's a system extension, return as-is
        $systemExtensions = Extensions::getSystemExtensions();
        // Filter out empty values
        $systemExtensions = array_filter($systemExtensions, fn($ext) => !empty($ext));
        if (in_array($value, $systemExtensions, true)) {
            return $value;
        }

        // For numeric values, remove non-numeric characters and limit length
        $numericValue = preg_replace('/[^0-9]/', '', $value);
        return substr($numericValue, 0, $maxLength);
    }

    /**
     * Sanitize routing destination value by removing invalid characters while preserving system values
     * 
     * @param string $value Value to sanitize
     * @param int $maxLength Maximum length for numeric extensions (default: 20 for phone numbers)
     * @return string Sanitized value
     */
    public static function sanitizeRoutingDestination(string $value, int $maxLength = 20): string
    {
        // For routing destinations, use the same sanitization as extensions
        return self::sanitizeExtension($value, $maxLength);
    }
}