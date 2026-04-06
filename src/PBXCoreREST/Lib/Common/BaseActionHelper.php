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

use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\Common\Providers\MutexProvider;
use Phalcon\Di\Di;
use Phalcon\Filter\FilterFactory;

/**
 * Utility class for Actions with helpful methods
 * Does not extend Injectable and does not work with HTTP context
 */
class BaseActionHelper
{
    /**
     * Execute operation in transaction with smart nesting support
     *
     * This method provides safe transaction handling that works correctly with
     * disabled savepoints in SQLite. It detects if a transaction is already active
     * and only manages the outermost transaction.
     *
     * Behavior:
     * - If NO transaction is active: begin() → execute → commit()/rollback()
     * - If transaction IS active: just execute (let outer transaction manage commit/rollback)
     *
     * This prevents issues with SQLite savepoints while maintaining transaction safety:
     * - All operations are still protected by the outer transaction
     * - No "cannot open savepoint" errors
     * - Nested calls work correctly
     *
     * Example flow:
     * ```
     * executeInTransaction(function() {           // Starts transaction
     *     $model1->save();                        // Protected
     *     executeInTransaction(function() {       // Detects active transaction
     *         $model2->save();                    // Still protected by outer transaction
     *     });                                     // No commit here
     *     $model3->save();                        // Protected
     * });                                         // Commits all changes here
     * ```
     *
     * @param callable $callback Function to execute in transaction
     * @return mixed Result of callback execution
     * @throws \Exception Re-throws any exception after rollback (if we started the transaction)
     */
    public static function executeInTransaction(callable $callback)
    {
        $di = Di::getDefault();
        $mutex = $di->get(MutexProvider::SERVICE_NAME);

        return $mutex->synchronized('db-write', function () use ($callback, $di) {
            $db = $di->get(MainDatabaseProvider::SERVICE_NAME);

            // Check if we're already in a transaction
            $alreadyInTransaction = $db->isUnderTransaction();

            // Only begin if not already in transaction
            if (!$alreadyInTransaction) {
                $db->begin();
            }

            try {
                $result = $callback();

                // Only commit if we started the transaction
                if (!$alreadyInTransaction) {
                    $db->commit();
                }

                return $result;
            } catch (\Exception $e) {
                // Only rollback if we started the transaction
                if (!$alreadyInTransaction) {
                    $db->rollback();
                }
                throw $e;
            }
        }, timeout: 15, ttl: 30);
    }
    
    /**
     * Check value uniqueness in model
     * 
     * @param string $modelClass Model class
     * @param string $field Field to check
     * @param mixed $value Value to check
     * @param mixed $currentValue Current value (to exclude from check)
     * @return bool True if value is unique
     */
    public static function checkUniqueness(string $modelClass, string $field, $value, $currentValue = null): bool
    {
        if ($value === $currentValue) {
            return true; // Value hasn't changed
        }
        
        $existingRecord = $modelClass::findFirst([
            'conditions' => "{$field} = :value:",
            'bind' => ['value' => $value]
        ]);
        
        return !$existingRecord;
    }
    
    /**
     * Sanitize data using Filter
     *
     * Accepts rules in two formats:
     * 1. Array format (recommended): ['field' => ['string', 'regex:/pattern/', 'max:20']]
     * 2. String format (legacy): ['field' => 'string|regex:/pattern/|max:20']
     *
     * @param array $data Data to sanitize
     * @param array $rules Sanitization rules
     * @return array Sanitized data
     */
    public static function sanitizeData(array $data, array $rules): array
    {
        // Create filter through factory
        $factory = new FilterFactory();
        $filter = $factory->newInstance();

        $sanitized = [];

        foreach ($rules as $field => $rule) {
            if (!isset($data[$field])) {
                continue;
            }

            $value = $data[$field];

            // Convert string rules to array format for unified processing
            if (is_string($rule)) {
                // Legacy string format - kept for backward compatibility
                $ruleParts = explode('|', $rule);
            } else {
                // Modern array format (recommended)
                $ruleParts = $rule;
            }

            foreach ($ruleParts as $rulePart) {
                if (strpos($rulePart, ':') !== false) {
                    [$ruleType, $ruleValue] = explode(':', $rulePart, 2);
                } else {
                    $ruleType = $rulePart;
                    $ruleValue = null;
                }

                switch ($ruleType) {
                    case 'string':
                        // Only trim, don't use $filter->string() as it encodes HTML entities
                        // XSS sanitization will be done by 'sanitize' rule where needed
                        $value = $filter->trim($value);
                        break;
                    case 'int':
                        $value = (int)$value;
                        break;
                    case 'bool':
                        // Convert various representations to boolean
                        $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                        break;
                    case 'sanitize':
                        $value = TextFieldProcessor::sanitizeForStorage($value);
                        break;
                    case 'html_escape':
                        $value = htmlspecialchars($value, ENT_QUOTES);
                        break;
                    case 'email':
                        // Email sanitization: remove placeholder values and trim
                        // Common placeholder values that should be treated as empty
                        $placeholders = ['_@_._', '@', '_@_', '___@___.___'];

                        if (in_array($value, $placeholders, true)) {
                            // Replace placeholder with empty string
                            $value = '';
                        } else {
                            // Trim whitespace and sanitize email format
                            $value = filter_var(trim($value), FILTER_SANITIZE_EMAIL);
                        }
                        break;
                    case 'max':
                        if (is_string($value)) {
                            // Use mb_substr for proper UTF-8 multibyte character handling
                            // This ensures correct truncation for cyrillic, chinese, emoji, etc.
                            $value = mb_substr($value, 0, (int)$ruleValue, 'UTF-8');
                        }
                        break;
                    case 'regex':
                        if ($ruleValue) {
                            // Wrap preg_match in error handler to catch regex errors with field context
                            $previousErrorHandler = set_error_handler(function($errno, $errstr) use ($field, $ruleValue) {
                                throw new \Exception("Regex error in field '{$field}' with pattern '{$ruleValue}': {$errstr}");
                            });

                            try {
                                if (!preg_match($ruleValue, $value)) {
                                    $value = preg_replace('/[^0-9]/', '', $value); // Fallback for numbers
                                }
                            } finally {
                                // Restore previous error handler
                                restore_error_handler();
                            }
                        }
                        break;
                    case 'empty_to_null':
                        $value = empty($value) ? null : $value;
                        break;
                }
            }

            $sanitized[$field] = $value;
        }

        return $sanitized;
    }
    
    /**
     * Validate data by rules
     * 
     * @param array $data Data to validate
     * @param array $rules Validation rules
     * @return array Array of errors (empty if all is OK)
     */
    public static function validateData(array $data, array $rules): array
    {
        $errors = [];
        
        foreach ($rules as $field => $fieldRules) {
            $value = $data[$field] ?? null;
            
            foreach ($fieldRules as $rule) {
                $ruleType = $rule['type'] ?? '';
                $message = $rule['message'] ?? "Validation error for field {$field}";
                
                switch ($ruleType) {
                    case 'required':
                        if (empty($value)) {
                            $errors[$field] = $message;
                        }
                        break;
                    case 'regex':
                        $pattern = $rule['pattern'] ?? '';
                        if (!empty($value) && $pattern) {
                            // Wrap preg_match in error handler to catch regex errors with field context
                            set_error_handler(function($errno, $errstr) use ($field, $pattern) {
                                throw new \Exception("Regex validation error in field '{$field}' with pattern '{$pattern}': {$errstr}");
                            });

                            try {
                                if (!preg_match($pattern, $value)) {
                                    $errors[$field] = $message;
                                }
                            } finally {
                                // Restore previous error handler
                                restore_error_handler();
                            }
                        }
                        break;
                    case 'min_length':
                        $minLength = $rule['value'] ?? 0;
                        if (!empty($value) && strlen($value) < $minLength) {
                            $errors[$field] = $message;
                        }
                        break;
                    case 'max_length':
                        $maxLength = $rule['value'] ?? 0;
                        if (!empty($value) && strlen($value) > $maxLength) {
                            $errors[$field] = $message;
                        }
                        break;
                }
            }
        }
        
        return $errors;
    }
}