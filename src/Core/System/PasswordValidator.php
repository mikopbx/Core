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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Encryption\Security\Random;
use Phalcon\Di\Di;

/**
 * Unified Password Validator Service
 * 
 * Provides centralized password validation and generation functionality
 * for use across the entire application (REST API, Controllers, Workers)
 * 
 * @package MikoPBX\Core\System
 */
class PasswordValidator
{
    /**
     * Password length constraints
     */
    public const MIN_LENGTH = 8;
    public const MAX_LENGTH = 64;
    public const DEFAULT_LENGTH = 16;
    
    /**
     * Password strength thresholds
     */
    public const SCORE_VERY_WEAK = 20;
    public const SCORE_WEAK = 40;
    public const SCORE_FAIR = 60;
    public const SCORE_GOOD = 80;
    public const SCORE_STRONG = 100;
    
    /**
     * Validation context types
     */
    public const CONTEXT_WEB_ADMIN = 'WebAdminPassword';
    public const CONTEXT_SSH = 'SSHPassword';
    public const CONTEXT_SIP = 'SipSecret';
    public const CONTEXT_AMI = 'AmiSecret';
    public const CONTEXT_PROVIDER = 'ProviderSecret';
    
    /**
     * Cache for dictionary check results
     * @var array<string, bool>
     */
    private static array $dictionaryCache = [];
    
    /**
     * Maximum cache size before reset
     */
    private const MAX_CACHE_SIZE = 1000;
    
    /**
     * Validate password with comprehensive checks
     * 
     * @param string $password Password to validate
     * @param string|null $context Optional context (field name) for specific checks
     * @param array $options Validation options:
     *                       - skipDictionary: Skip dictionary check for performance
     *                       - skipDefault: Skip default password check
     *                       - minLength: Override minimum length
     * @return array Validation result with isValid, score, messages, suggestions
     */
    public static function validate(string $password, ?string $context = null, array $options = []): array
    {
        $result = [
            'isValid' => true,
            'score' => 0,
            'strength' => '',
            'isDefault' => false,
            'isSimple' => false,
            'isTooShort' => false,
            'isTooLong' => false,
            'messages' => [],
            'suggestions' => []
        ];
        
        // Check if password is empty
        if (empty($password)) {
            $result['isValid'] = false;
            $result['messages'][] = self::translate('gs_ValidateEmptyWebPassword');
            return $result;
        }
        
        // Check length constraints
        $minLength = $options['minLength'] ?? self::MIN_LENGTH;
        $length = strlen($password);
        
        if ($length < $minLength) {
            $result['isValid'] = false;
            $result['isTooShort'] = true;
            $result['messages'][] = self::translate('gs_PasswordTooShort', ['min' => $minLength]);
        } elseif ($length > self::MAX_LENGTH) {
            $result['isValid'] = false;
            $result['isTooLong'] = true;
            $result['messages'][] = sprintf('Password must not exceed %d characters', self::MAX_LENGTH); // Keep as is - rarely triggered
        }
        
        // Check for default passwords if context is provided
        if (!empty($context) && empty($options['skipDefault'])) {
            if (self::isDefaultPassword($password, $context)) {
                $result['isValid'] = false;
                $result['isDefault'] = true;
                $result['messages'][] = self::translate('gs_PasswordIsDefault');
                $result['suggestions'][] = self::translate('gs_DefaultPasswordWarning');
            }
        }
        
        // Check against dictionary if not skipped and password is long enough
        if (empty($options['skipDictionary']) && $result['isValid'] && $length >= $minLength) {
            if (self::isInDictionary($password)) {
                $result['isValid'] = false;
                $result['isSimple'] = true;
                $result['messages'][] = self::translate('gs_PasswordTooCommon');
                $result['suggestions'][] = self::translate('gs_PasswordAvoidCommon');
            }
        }
        
        // Calculate password score
        $result['score'] = self::calculateScore($password);
        $result['strength'] = self::getStrengthLabel($result['score']);
        
        // Add suggestions for improvement if score is low
        if ($result['score'] < self::SCORE_GOOD) {
            $result['suggestions'] = array_merge(
                $result['suggestions'],
                self::getSuggestions($password)
            );
        }
        
        // For SIP/AMI contexts, enforce stronger requirements
        if (in_array($context, [self::CONTEXT_SIP, self::CONTEXT_AMI, self::CONTEXT_PROVIDER])) {
            if ($result['score'] < self::SCORE_FAIR) {
                $result['isValid'] = false;
                $result['messages'][] = self::translate('psw_PasswordSecurityRequiresFair');
            }
        }
        
        return $result;
    }
    
    /**
     * Quick validation - only checks basic requirements without dictionary
     * 
     * @param string $password Password to validate
     * @param string|null $context Optional context
     * @return bool True if password meets basic requirements
     */
    public static function isValidQuick(string $password, ?string $context = null): bool
    {
        $result = self::validate($password, $context, ['skipDictionary' => true]);
        return $result['isValid'];
    }
    
    /**
     * Check if password is in dictionary
     * 
     * @param string $password Password to check
     * @return bool True if password is in dictionary
     */
    public static function isInDictionary(string $password): bool
    {
        // Check cache first
        if (isset(self::$dictionaryCache[$password])) {
            return self::$dictionaryCache[$password];
        }
        
        // Clear cache if it's too large
        if (count(self::$dictionaryCache) > self::MAX_CACHE_SIZE) {
            self::$dictionaryCache = [];
        }
        
        // Check using the dictionary file
        $result = self::isSimplePassword($password);
        
        // Cache the result
        self::$dictionaryCache[$password] = $result;
        
        return $result;
    }
    
    /**
     * Check if password exists in the common passwords dictionary
     * 
     * This method checks against the rockyou wordlist for common/compromised passwords.
     * For performance, results are cached in memory.
     * 
     * @param string $value Password to check
     * @return bool True if password is found in dictionary
     */
    public static function isSimplePassword(string $value): bool
    {
        $passwords = [];
        \MikoPBX\Core\System\Processes::mwExec('/bin/zcat /usr/share/wordlists/rockyou.txt.gz', $passwords);
        return in_array($value, $passwords, true);
    }
    
    /**
     * Check if password is a default password for the given context
     * 
     * @param string $password Password to check
     * @param string $context Context (field name)
     * @return bool True if password is a default
     */
    public static function isDefaultPassword(string $password, string $context): bool
    {
        // Get default values
        $defaults = PbxSettings::getDefaultArrayValues();
        $cloudInstanceId = PbxSettings::getValueByKey(PbxSettings::CLOUD_INSTANCE_ID);
        
        // Map context to PbxSettings key
        $settingKey = match($context) {
            self::CONTEXT_WEB_ADMIN, 'WebAdminPassword' => PbxSettings::WEB_ADMIN_PASSWORD,
            self::CONTEXT_SSH, 'SSHPassword' => PbxSettings::SSH_PASSWORD,
            default => null
        };
        
        if ($settingKey && isset($defaults[$settingKey])) {
            if ($password === $defaults[$settingKey] || $password === $cloudInstanceId) {
                return true;
            }
        }
        
        // Check common defaults for other contexts
        if (in_array($context, [self::CONTEXT_SIP, self::CONTEXT_AMI, self::CONTEXT_PROVIDER])) {
            // Common default passwords for SIP/AMI
            $commonDefaults = ['admin', 'password', '1234', '12345', 'secret'];
            if (in_array(strtolower($password), $commonDefaults)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Calculate password strength score (0-100)
     * 
     * @param string $password Password to score
     * @return int Score from 0 to 100
     */
    public static function calculateScore(string $password): int
    {
        $score = 0;
        $length = strlen($password);
        
        if ($length === 0) {
            return 0;
        }
        
        // Length scoring (up to 30 points)
        if ($length >= 16) {
            $score += 30;
        } elseif ($length >= 12) {
            $score += 20;
        } elseif ($length >= 8) {
            $score += 10;
        } else {
            $score += max(0, $length);
        }
        
        // Character diversity (up to 40 points)
        $hasLower = preg_match('/[a-z]/', $password) === 1;
        $hasUpper = preg_match('/[A-Z]/', $password) === 1;
        $hasDigit = preg_match('/\d/', $password) === 1;
        $hasSpecial = preg_match('/[^a-zA-Z0-9]/', $password) === 1;
        
        $diversity = 0;
        if ($hasLower) {
            $score += 10;
            $diversity++;
        }
        if ($hasUpper) {
            $score += 10;
            $diversity++;
        }
        if ($hasDigit) {
            $score += 10;
            $diversity++;
        }
        if ($hasSpecial) {
            $score += 10;
            $diversity++;
        }
        
        // Pattern complexity (up to 30 points)
        $uniqueChars = count(array_unique(str_split($password)));
        $uniqueRatio = $uniqueChars / $length;
        
        if ($uniqueRatio > 0.7) {
            $score += 20;
        } elseif ($uniqueRatio > 0.5) {
            $score += 15;
        } elseif ($uniqueRatio > 0.3) {
            $score += 10;
        } else {
            $score += 5;
        }
        
        // Bonus for character mix (up to 10 points)
        if ($diversity >= 3 && $length >= 12) {
            $score += 10;
        }
        
        // Penalties for bad patterns
        $penalties = 0;
        
        // Repeating characters (aaa, 111)
        if (preg_match('/(.)\1{2,}/', $password)) {
            $penalties += 10;
        }
        
        // Sequential patterns
        $patterns = [
            'qwerty', 'asdfgh', 'zxcvbn', // Keyboard rows
            '12345', '23456', '34567', '45678', '56789', // Numbers
            'abcde', 'bcdef', 'cdefg', 'defgh', // Letters
        ];
        
        $lowerPassword = strtolower($password);
        foreach ($patterns as $pattern) {
            if (str_contains($lowerPassword, $pattern) || str_contains($lowerPassword, strrev($pattern))) {
                $penalties += 10;
                break;
            }
        }
        
        // Dictionary words (quick check without full dictionary)
        if (preg_match('/^[a-z]+$/i', $password) && $length < 10) {
            $penalties += 15; // Likely a dictionary word
        }
        
        $score -= $penalties;
        
        return max(0, min(100, $score));
    }
    
    /**
     * Get strength label for score
     * 
     * @param int $score Password score
     * @return string Strength label
     */
    public static function getStrengthLabel(int $score): string
    {
        return match(true) {
            $score < self::SCORE_VERY_WEAK => self::translate('psw_PasswordStrengthWeak'),
            $score < self::SCORE_WEAK => self::translate('psw_PasswordStrengthWeak'),
            $score < self::SCORE_FAIR => self::translate('psw_PasswordStrengthFair'),
            $score < self::SCORE_GOOD => self::translate('psw_PasswordStrengthGood'),
            default => self::translate('psw_PasswordStrengthStrong')
        };
    }
    
    /**
     * Get suggestions for improving password
     * 
     * @param string $password Password to analyze
     * @return array List of suggestions
     */
    public static function getSuggestions(string $password): array
    {
        $suggestions = [];
        $length = strlen($password);
        
        if ($length < 12) {
            $suggestions[] = self::translate('psw_PasswordTooShort', ['min' => 12]);
        }
        
        if (!preg_match('/[a-z]/', $password)) {
            $suggestions[] = self::translate('psw_PasswordNoLowSimvol');
        }
        
        if (!preg_match('/[A-Z]/', $password)) {
            $suggestions[] = self::translate('psw_PasswordNoUpperSimvol');
        }
        
        if (!preg_match('/\d/', $password)) {
            $suggestions[] = self::translate('psw_PasswordNoNumbers');
        }
        
        if (!preg_match('/[^a-zA-Z0-9]/', $password)) {
            $suggestions[] = self::translate('psw_PasswordNoSpecialChars');
        }
        
        if (preg_match('/(.)\1{2,}/', $password)) {
            $suggestions[] = self::translate('psw_PasswordAvoidCommon');
        }
        
        if (preg_match('/(123|abc|qwe|asd|zxc)/i', $password)) {
            $suggestions[] = self::translate('psw_PasswordAvoidCommon');
        }
        
        // Check if it looks like a date
        if (preg_match('/\d{4}|\d{2}[\/\-\.]\d{2}/', $password)) {
            $suggestions[] = self::translate('psw_PasswordAvoidCommon');
        }
        
        return array_unique($suggestions);
    }
    
    /**
     * Generate a secure password
     * 
     * @param int $length Desired password length
     * @param bool $includeSpecial Include special characters
     * @return string Generated password
     */
    public static function generate(int $length = self::DEFAULT_LENGTH, bool $includeSpecial = true): string
    {
        // Validate length
        $length = max(self::MIN_LENGTH, min(self::MAX_LENGTH, $length));
        
        try {
            $random = new Random();
            
            if ($includeSpecial) {
                // Generate base64-safe password (includes -, _)
                $password = $random->base64Safe($length);
            } else {
                // Generate alphanumeric only
                $password = $random->base58($length);
            }
            
            // Ensure exact length
            if (strlen($password) > $length) {
                $password = substr($password, 0, $length);
            }
            
            while (strlen($password) < $length) {
                $password .= $includeSpecial ? $random->base64Safe(1) : $random->base58(1);
            }
            
            return substr($password, 0, $length);
            
        } catch (\Throwable $e) {
            // Fallback to simple generation
            return self::generateFallback($length, $includeSpecial);
        }
    }
    
    /**
     * Fallback password generator
     * 
     * @param int $length Password length
     * @param bool $includeSpecial Include special characters
     * @return string Generated password
     */
    private static function generateFallback(int $length, bool $includeSpecial): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        if ($includeSpecial) {
            $chars .= '!@#$%^&*-_=+';
        }
        
        $password = '';
        $maxIndex = strlen($chars) - 1;
        
        for ($i = 0; $i < $length; $i++) {
            $password .= $chars[random_int(0, $maxIndex)];
        }
        
        return $password;
    }
    
    /**
     * Clear the dictionary cache
     */
    public static function clearCache(): void
    {
        self::$dictionaryCache = [];
    }
    
    /**
     * Batch validate multiple passwords
     * 
     * @param array<string, string> $passwords Array of context => password pairs
     * @param array $options Validation options
     * @return array<string, array> Array of context => validation result
     */
    public static function validateBatch(array $passwords, array $options = []): array
    {
        $results = [];
        
        foreach ($passwords as $context => $password) {
            $results[$context] = self::validate($password, $context, $options);
        }
        
        return $results;
    }
    
    /**
     * Batch check multiple passwords against dictionary
     * 
     * Optimized batch operation for checking multiple passwords against
     * the common passwords dictionary. More efficient than individual checks.
     * 
     * @param array<int|string, string> $passwords Array of passwords to check
     * @return array<int|string, bool> Array of password index/key => isInDictionary result
     */
    public static function checkDictionaryBatch(array $passwords): array
    {
        $results = [];
        
        // Load dictionary once for all checks
        $dictionaryPath = Util::which('pwqcheck');
        $haveDictionary = !empty($dictionaryPath);
        
        foreach ($passwords as $key => $password) {
            if (empty($password)) {
                $results[$key] = false;
                continue;
            }
            
            // Check against dictionary if available
            if ($haveDictionary) {
                $results[$key] = self::isInDictionary($password);
            } else {
                // If no dictionary, consider as not in dictionary
                $results[$key] = false;
            }
        }
        
        return $results;
    }
    
    /**
     * Translate message key with optional parameters
     * 
     * @param string $key Translation key
     * @param array $params Optional parameters for replacement
     * @return string Translated message
     */
    private static function translate(string $key, array $params = []): string
    {
        try {
            $di = Di::getDefault();
            if ($di && $di->has(TranslationProvider::SERVICE_NAME)) {
                $translation = $di->get(TranslationProvider::SERVICE_NAME);
                return $translation->_($key, $params);
            }
        } catch (\Exception $e) {
            // If DI or translation service not available, continue with fallback
        }
        
        // Fallback to English messages (with both old and new keys for compatibility)
        $fallbackMessages = [
            // New psw_ keys
            'psw_ValidateEmptyPassword' => 'Password cannot be empty',
            'psw_PasswordTooShort' => 'Password must be at least %min% characters',
            'psw_PasswordIsDefault' => 'Using default password is not allowed',
            'psw_DefaultPasswordWarning' => 'Do not use default login and password',
            'psw_PasswordInDictionary' => 'Password found in common passwords dictionary',
            'psw_PasswordTooCommon' => 'This password is too common',
            'psw_PasswordNoNumbers' => 'Password must contain numbers',
            'psw_PasswordNoLowSimvol' => 'Password must contain lowercase letters',
            'psw_PasswordNoUpperSimvol' => 'Password must contain uppercase letters',
            'psw_PasswordNoSpecialChars' => 'Add special characters (!@#$%)',
            'psw_PasswordMixCharTypes' => 'Mix different character types',
            'psw_PasswordAvoidCommon' => 'Avoid common patterns and words',
            'psw_PasswordUsePassphrase' => 'Consider using a passphrase',
            'psw_PasswordSecurityRequiresFair' => 'Security passwords require at least fair strength',
            'psw_PasswordStrengthWeak' => 'Weak',
            'psw_PasswordStrengthFair' => 'Fair',
            'psw_PasswordStrengthGood' => 'Good',
            'psw_PasswordStrengthStrong' => 'Strong',
            'psw_PasswordStrengthVeryStrong' => 'Very Strong',
            
            // Old gs_ keys for backward compatibility
            'gs_ValidateEmptyWebPassword' => 'Password cannot be empty',
            'gs_PasswordTooShort' => 'Password must be at least %min% characters',
            'gs_PasswordIsDefault' => 'Using default password is not allowed',
            'gs_DefaultPasswordWarning' => 'Do not use default login and password',
            'gs_PasswordInDictionary' => 'Password found in common passwords dictionary',
            'gs_PasswordTooCommon' => 'This password is too common',
            'gs_PasswordNoNumbers' => 'Password must contain numbers',
            'gs_PasswordNoLowSimvol' => 'Password must contain lowercase letters',
            'gs_PasswordNoUpperSimvol' => 'Password must contain uppercase letters',
            'gs_PasswordNoSpecialChars' => 'Add special characters (!@#$%)',
            'gs_PasswordMixCharTypes' => 'Mix different character types',
            'gs_PasswordAvoidCommon' => 'Avoid common patterns and words',
            'gs_PasswordUsePassphrase' => 'Consider using a passphrase',
            'gs_PasswordSecurityRequiresFair' => 'Security passwords require at least fair strength',
            'gs_PasswordStrengthWeak' => 'Weak',
            'gs_PasswordStrengthFair' => 'Fair',
            'gs_PasswordStrengthGood' => 'Good',
            'gs_PasswordStrengthStrong' => 'Strong',
            'gs_PasswordStrengthVeryStrong' => 'Very Strong'
        ];
        
        $message = $fallbackMessages[$key] ?? $key;
        
        // Replace parameters if any
        foreach ($params as $param => $value) {
            $message = str_replace('%' . $param . '%', $value, $message);
        }
        
        return $message;
    }
}