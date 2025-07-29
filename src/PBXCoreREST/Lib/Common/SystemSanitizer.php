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

/**
 * System sanitizer class for handling special extension and routing values
 * 
 * This class provides sanitization rules that handle both regular numeric extensions
 * and system enumeration values for IVR menu actions.
 */
class SystemSanitizer
{
    /**
     * Action constants for IVR menu routing
     */
    public const string ACTION_EXTENSION = 'extension';
    public const string ACTION_HANGUP    = 'hangup';
    public const string ACTION_BUSY      = 'busy';
    public const string ACTION_DID       = 'did2user';
    public const string ACTION_VOICEMAIL = 'voicemail';
    public const string ACTION_PLAYBACK  = 'playback';

    /**
     * System enumeration values that are allowed for extension fields
     */
    public const array SYSTEM_EXTENSION_VALUES = [
        self::ACTION_VOICEMAIL,
        self::ACTION_HANGUP,
        self::ACTION_BUSY,
        self::ACTION_DID,
        self::ACTION_PLAYBACK,
    ];

    /**
     * System enumeration values that are allowed for routing fields
     */
    public const array SYSTEM_ROUTING_VALUES = [
        self::ACTION_VOICEMAIL,
        self::ACTION_HANGUP,
        self::ACTION_BUSY,
        self::ACTION_DID,
        self::ACTION_PLAYBACK,
    ];

    /**
     * Get sanitization rule for extension fields that allows numeric extensions and system values
     * 
     * @param int $maxLength Maximum length for numeric extensions (default: 20 for phone numbers)
     * @param bool $allowEmpty Whether to allow empty values (default: true)
     * @return string Sanitization rule
     */
    public static function getExtensionSanitizationRule(int $maxLength = 20, bool $allowEmpty = true): string
    {
        $emptyRule = $allowEmpty ? '|empty_to_null' : '';
        
        // Create regex pattern that allows:
        // 1. Numeric extensions/phone numbers (1-20 digits)
        // 2. System enumeration values
        $systemValues = implode('|', self::SYSTEM_EXTENSION_VALUES);
        $pattern = "/^([0-9]{1,{$maxLength}}|{$systemValues})$/";
        
        return "string|regex:{$pattern}|max:{$maxLength}{$emptyRule}";
    }

    /**
     * Get sanitization rule for routing fields that allows numeric extensions and routing system values
     * 
     * @param int $maxLength Maximum length for numeric extensions (default: 20 for phone numbers)
     * @param bool $allowEmpty Whether to allow empty values (default: true)
     * @return string Sanitization rule
     */
    public static function getRoutingSanitizationRule(int $maxLength = 20, bool $allowEmpty = true): string
    {
        $emptyRule = $allowEmpty ? '|empty_to_null' : '';
        
        // Create regex pattern that allows:
        // 1. Numeric extensions/phone numbers (1-20 digits)  
        // 2. System routing values
        $systemValues = implode('|', self::SYSTEM_ROUTING_VALUES);
        $pattern = "/^([0-9]{1,{$maxLength}}|{$systemValues})$/";
        
        return "string|regex:{$pattern}|max:{$maxLength}{$emptyRule}";
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
        // Check if it's a system value
        if (in_array($value, self::SYSTEM_EXTENSION_VALUES, true)) {
            return true;
        }
        
        // Check if it's a numeric extension/phone number
        return preg_match("/^[0-9]{1,{$maxLength}}$/", $value) === 1;
    }

    /**
     * Check if a value is a valid routing destination (numeric or system routing value)
     * 
     * @param string $value Value to check
     * @param int $maxLength Maximum length for numeric extensions (default: 20 for phone numbers)
     * @return bool True if valid routing destination
     */
    public static function isValidRoutingDestination(string $value, int $maxLength = 20): bool
    {
        // Check if it's a system routing value
        if (in_array($value, self::SYSTEM_ROUTING_VALUES, true)) {
            return true;
        }
        
        // Check if it's a numeric extension/phone number
        return preg_match("/^[0-9]{1,{$maxLength}}$/", $value) === 1;
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
        
        // If it's a system value, return as-is
        if (in_array($value, self::SYSTEM_EXTENSION_VALUES, true)) {
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
        $value = trim($value);
        
        // If it's a system routing value, return as-is
        if (in_array($value, self::SYSTEM_ROUTING_VALUES, true)) {
            return $value;
        }
        
        // For numeric values, remove non-numeric characters and limit length
        $numericValue = preg_replace('/[^0-9]/', '', $value);
        return substr($numericValue, 0, $maxLength);
    }
}