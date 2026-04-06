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
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Di\Di;
use Phalcon\Encryption\Security\Random;

/**
 * Unified Password Service
 *
 * Provides centralized password validation and generation functionality
 * for use across the entire application (REST API, Controllers, Workers)
 *
 * @package MikoPBX\Core\System
 */
class PasswordService
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
    public const CONTEXT_IAX = 'IaxSecret';
    public const CONTEXT_AMI = 'AmiSecret';
    public const CONTEXT_ARI = 'AriSecret';
    public const CONTEXT_API = 'ApiSecret';
    public const CONTEXT_PROVIDER = 'ProviderSecret';
    public const CONTEXT_SMTP = 'SmtpPassword';
    
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
     * Redis cache key for dictionary
     */
    private const REDIS_DICTIONARY_KEY = 'password_service:dictionary';
    
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
            $result['messages'][] = self::translate('psw_ValidateEmptyWebPassword');
            return $result;
        }
        
        // Check length constraints
        $minLength = $options['minLength'] ?? self::MIN_LENGTH;
        $length = strlen($password);
        
        if ($length < $minLength) {
            $result['isValid'] = false;
            $result['isTooShort'] = true;
            $result['messages'][] = self::translate('psw_PasswordTooShort', ['min' => $minLength]);
        } elseif ($length > self::MAX_LENGTH) {
            $result['isValid'] = false;
            $result['isTooLong'] = true;
            $result['messages'][] = self::translate('psw_PasswordTooLong', ['max' => self::MAX_LENGTH]);
        }
        
        // Check for default passwords if context is provided
        if (!empty($context) && empty($options['skipDefault'])) {
            if (self::isDefaultPassword($password, $context)) {
                $result['isValid'] = false;
                $result['isDefault'] = true;
                $result['messages'][] = self::translate('psw_PasswordIsDefault');
                $result['suggestions'][] = self::translate('psw_DefaultPasswordWarning');
            }
        }
        
        // Check against dictionary if not skipped and password is long enough
        if (empty($options['skipDictionary']) && $result['isValid'] && $length >= $minLength) {
            if (self::checkDictionary($password)) {
                $result['isValid'] = false;
                $result['isSimple'] = true;
                $result['messages'][] = self::translate('psw_PasswordTooCommon');
                $result['suggestions'][] = self::translate('psw_PasswordAvoidCommon');
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
    public static function checkDictionary(string $password): bool
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
     * Uses Redis for caching with fallback to file loading.
     * 
     * @param string $value Password to check
     * @return bool True if password is found in dictionary
     */
    public static function isSimplePassword(string $value): bool
    {
        if (empty($value)) {
            return false;
        }
        
        $redis = self::getRedisClient();
        
        if (!$redis) {
            // Fallback to direct file check if Redis not available
            $dictionary = self::loadDictionaryFromFile();
            return in_array($value, $dictionary, true);
        }
        
        // First check if dictionary is cached
        $exists = $redis->hexists(self::REDIS_DICTIONARY_KEY, $value);
        
        if ($exists !== false) {
            // Dictionary is cached, return direct result
            return (bool)$exists;
        }
        
        // Dictionary not cached, load and cache it, then check
        $dictionary = self::getDictionary();
        return in_array($value, $dictionary, true);
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
        if (in_array($context, [
            self::CONTEXT_SIP,
            self::CONTEXT_IAX,
            self::CONTEXT_AMI,
            self::CONTEXT_ARI,
            self::CONTEXT_API,
            self::CONTEXT_PROVIDER
        ])) {
            // Common default passwords for telephony/API services
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
            default => self::translate('psw_PasswordStrengthStrong'),
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
     * @param array $options Options array with:
     *                       - length: Desired password length (default: 16)
     *                       - includeSpecial: Include special characters (default: true)
     * @return string Generated password
     */
    public static function generate(array $options = []): string
    {
        // Extract options with defaults
        $length = isset($options['length']) ? (int)$options['length'] : self::DEFAULT_LENGTH;
        $includeSpecial = $options['includeSpecial'] ?? true;

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
     * Clear the dictionary cache (both memory and Redis)
     */
    public static function clearCache(): void
    {
        self::$dictionaryCache = [];
        
        $redis = self::getRedisClient();
        if ($redis) {
            $redis->del(self::REDIS_DICTIONARY_KEY);
        }
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
     * the common passwords dictionary. Uses Redis for caching dictionary data.
     * 
     * @param array<int|string, string> $passwords Array of passwords to check
     * @return array<int|string, bool> Array of password index/key => isInDictionary result
     */
    public static function batchCheckDictionary(array $passwords): array
    {
        $results = [];
        
        // Get dictionary from Redis cache or load it
        $dictionary = self::getDictionary();
        
        foreach ($passwords as $key => $password) {
            if (empty($password)) {
                $results[$key] = false;
                continue;
            }
            
            // Check against dictionary
            $results[$key] = in_array($password, $dictionary, true);
        }
        
        return $results;
    }
    
    /**
     * Get dictionary from Redis cache or load from file
     * 
     * @return array Dictionary array
     */
    private static function getDictionary(): array
    {
        $redis = self::getRedisClient();
        
        if (!$redis) {
            return self::loadDictionaryFromFile();
        }
        
        // Try to get dictionary from Redis
        $cachedDictionary = $redis->hgetall(self::REDIS_DICTIONARY_KEY);
        
        if (!empty($cachedDictionary)) {
            // Return array keys (passwords are stored as Redis hash keys)
            return array_keys($cachedDictionary);
        }
        
        // Dictionary not cached, load from file and cache it
        $dictionary = self::loadDictionaryFromFile();
        self::cacheDictionaryInRedis($redis, $dictionary);
        
        return $dictionary;
    }
    
    /**
     * Get Redis client or null if not available
     * 
     * @return mixed Redis client or null
     */
    private static function getRedisClient()
    {
        $di = Di::getDefault();
        if (!$di || !$di->has(RedisClientProvider::SERVICE_NAME)) {
            return null;
        }
        
        return $di->getShared(RedisClientProvider::SERVICE_NAME);
    }
    
    /**
     * Load dictionary from file
     * 
     * @return array Dictionary array
     */
    private static function loadDictionaryFromFile(): array
    {
        $dictionary = [];
        Processes::mwExec('/bin/zcat /usr/share/wordlists/rockyou.txt.gz', $dictionary);
        return $dictionary;
    }
    
    /**
     * Cache dictionary in Redis
     * 
     * @param mixed $redis Redis client
     * @param array $dictionary Dictionary array
     */
    private static function cacheDictionaryInRedis($redis, array $dictionary): void
    {
        if (empty($dictionary)) {
            return;
        }
        
        $pipe = $redis->multi();
        foreach ($dictionary as $password) {
            $pipe->hset(self::REDIS_DICTIONARY_KEY, $password, '1');
        }
        // Set expiration for 24 hours
        $pipe->expire(self::REDIS_DICTIONARY_KEY, 86400);
        $pipe->exec();
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
        $di = Di::getDefault();
        if ($di && $di->has(TranslationProvider::SERVICE_NAME)) {
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            return $translation->_($key, $params);
        }
        return $key;
    }

    /**
     * Generate SHA-512 crypt hash for system password storage
     *
     * Creates a hash compatible with /etc/shadow and chpasswd -e command.
     * Format: $6$rounds=5000$salt$hash (SHA-512 crypt)
     *
     * @param string $password Plain text password to hash
     * @param int $rounds Number of hashing rounds (default 5000, range 1000-999999999)
     * @return string SHA-512 crypt format hash ($6$...)
     */
    public static function generateSha512Hash(string $password, int $rounds = 5000): string
    {
        // Validate rounds range per crypt(3) specification
        $rounds = max(1000, min(999999999, $rounds));

        // Generate cryptographically secure random salt (16 characters)
        $salt = bin2hex(random_bytes(8));

        // Create SHA-512 hash using crypt() with $6$ prefix.
        // When rounds=5000 (the default per crypt(3) spec), omit the rounds=
        // parameter to produce the compact format ($6$salt$hash).
        // Dropbear SSH reads /etc/shadow and calls crypt() to verify passwords,
        // but some builds fail to parse the explicit rounds= prefix, causing
        // password authentication to be rejected despite a correct password.
        if ($rounds === 5000) {
            $hash = crypt($password, sprintf('$6$%s$', $salt));
        } else {
            $hash = crypt($password, sprintf('$6$rounds=%d$%s$', $rounds, $salt));
        }

        return $hash;
    }

    /**
     * Check if a value is already a SHA-512 crypt hash
     *
     * Detects hashes in format: $6$rounds=N$salt$hash or $6$salt$hash
     *
     * @param string $value Value to check
     * @return bool True if value is a SHA-512 hash
     */
    public static function isSha512Hash(string $value): bool
    {
        // SHA-512 crypt hashes start with $6$ and have specific structure
        // Format: $6$rounds=N$salt$hash or $6$salt$hash
        return (bool)preg_match('/^\$6\$(?:rounds=\d+\$)?[a-zA-Z0-9.\/]+\$[a-zA-Z0-9.\/]{86}$/', $value);
    }

    /**
     * Verify a plain text password against a SHA-512 crypt hash
     *
     * @param string $password Plain text password to verify
     * @param string $hash SHA-512 crypt hash to verify against
     * @return bool True if password matches hash
     */
    public static function verifySha512Hash(string $password, string $hash): bool
    {
        if (!self::isSha512Hash($hash)) {
            return false;
        }

        // crypt() with the full hash as salt will reproduce the hash if password matches
        return hash_equals($hash, crypt($password, $hash));
    }
}