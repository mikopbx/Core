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

namespace MikoPBX\Common\Library;

/**
 * Class PasswordGenerator
 * 
 * Unified password generation utility for SIP, IAX and other protocols
 * 
 * @package MikoPBX\Common\Library
 */
class PasswordGenerator
{
    // Character sets for different password types
    public const CHARSET_ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    public const CHARSET_HEX = 'abcdef0123456789';
    public const CHARSET_SECURE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    
    // Default password lengths
    public const DEFAULT_SIP_LENGTH = 16;
    public const DEFAULT_IAX_LENGTH = 32;
    public const DEFAULT_SECURE_LENGTH = 24;

    /**
     * Generate a secure password using cryptographically secure methods
     *
     * @param int $length Password length
     * @param bool $base64Safe Use base64-safe characters
     * @return string Generated password
     */
    public static function generateSecure(int $length = self::DEFAULT_SECURE_LENGTH, bool $base64Safe = true): string
    {
        $charset = $base64Safe ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_' : self::CHARSET_ALPHANUMERIC;
        return self::generateSimple($length, $charset);
    }

    /**
     * Generate password using simple character set (legacy compatibility)
     *
     * @param int $length Password length
     * @param string $charset Character set to use
     * @return string Generated password
     */
    public static function generateSimple(int $length, string $charset = self::CHARSET_ALPHANUMERIC): string
    {
        $password = '';
        $charsetLength = strlen($charset);
        
        for ($i = 0; $i < $length; $i++) {
            try {
                $password .= $charset[random_int(0, $charsetLength - 1)];
            } catch (\Exception $e) {
                // Fallback to microtime-based generation
                $password .= $charset[mt_rand(0, $charsetLength - 1)];
            }
        }
        
        return $password;
    }

    /**
     * Generate SIP password (base64-safe, shorter)
     *
     * @param int $length Password length
     * @return string Generated password
     */
    public static function generateSipPassword(int $length = self::DEFAULT_SIP_LENGTH): string
    {
        return self::generateSecure($length, true);
    }

    /**
     * Generate IAX password (hex characters, longer for compatibility)
     *
     * @param int $length Password length
     * @return string Generated password
     */
    public static function generateIaxPassword(int $length = self::DEFAULT_IAX_LENGTH): string
    {
        // IAX traditionally uses hex characters for better compatibility
        return self::generateSimple($length, self::CHARSET_HEX);
    }

    /**
     * Generate extension password (alphanumeric, medium length)
     *
     * @param int $length Password length
     * @return string Generated password
     */
    public static function generateExtensionPassword(int $length = self::DEFAULT_SECURE_LENGTH): string
    {
        return self::generateSecure($length, false);
    }

    /**
     * Generate password with custom requirements
     *
     * @param int $length Password length
     * @param bool $includeSpecial Include special characters
     * @param bool $hexOnly Use only hex characters
     * @return string Generated password
     */
    public static function generateCustom(int $length, bool $includeSpecial = false, bool $hexOnly = false): string
    {
        if ($hexOnly) {
            return self::generateSimple($length, self::CHARSET_HEX);
        }
        
        if ($includeSpecial) {
            return self::generateSimple($length, self::CHARSET_SECURE);
        }
        
        return self::generateSecure($length, false);
    }

    /**
     * Generate password based on protocol type
     *
     * @param string $protocol Protocol type (SIP, IAX, etc.)
     * @param int|null $length Custom length (null for default)
     * @return string Generated password
     */
    public static function generateForProtocol(string $protocol, ?int $length = null): string
    {
        switch (strtoupper($protocol)) {
            case 'SIP':
                return self::generateSipPassword($length ?? self::DEFAULT_SIP_LENGTH);
            
            case 'IAX':
                return self::generateIaxPassword($length ?? self::DEFAULT_IAX_LENGTH);
            
            case 'EXTENSION':
                return self::generateExtensionPassword($length ?? self::DEFAULT_SECURE_LENGTH);
            
            default:
                return self::generateSecure($length ?? self::DEFAULT_SECURE_LENGTH);
        }
    }

    /**
     * Validate password strength
     *
     * @param string $password Password to validate
     * @return array Validation result with score and recommendations
     */
    public static function validateStrength(string $password): array
    {
        $score = 0;
        $issues = [];
        
        $length = strlen($password);
        
        // Length check
        if ($length >= 16) {
            $score += 25;
        } elseif ($length >= 12) {
            $score += 15;
        } elseif ($length >= 8) {
            $score += 10;
        } else {
            $issues[] = 'Password too short (minimum 8 characters)';
        }
        
        // Character variety
        if (preg_match('/[a-z]/', $password)) $score += 15;
        if (preg_match('/[A-Z]/', $password)) $score += 15;
        if (preg_match('/[0-9]/', $password)) $score += 15;
        if (preg_match('/[^a-zA-Z0-9]/', $password)) $score += 30;
        
        // Determine strength
        if ($score >= 80) {
            $strength = 'Strong';
        } elseif ($score >= 60) {
            $strength = 'Good';
        } elseif ($score >= 40) {
            $strength = 'Fair';
        } else {
            $strength = 'Weak';
            $issues[] = 'Consider using a longer password with mixed characters';
        }
        
        return [
            'score' => $score,
            'strength' => $strength,
            'issues' => $issues
        ];
    }
}