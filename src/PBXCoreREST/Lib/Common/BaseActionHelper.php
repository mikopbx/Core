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
use Phalcon\Di\Di;
use Phalcon\Filter\FilterFactory;

/**
 * Utility class for Actions with helpful methods
 * Does not extend Injectable and does not work with HTTP context
 */
class BaseActionHelper
{
    /**
     * Decode HTML entities recursively (handles double/triple encoding)
     * @param string $str
     * @return string
     */
    public static function decodeHtmlEntities(string $str): string
    {
        // Handle multiple levels of encoding like &amp;quot; -> &quot; -> "
        $decoded = $str;
        $attempts = 0;
        while ($attempts < 3 && $decoded !== ($newDecoded = htmlspecialchars_decode($decoded, ENT_QUOTES))) {
            $decoded = $newDecoded;
            $attempts++;
        }
        return $decoded;
    }

    /**
     * Execute operation in transaction
     * 
     * @param callable $callback Function to execute in transaction
     * @return mixed Result of callback execution
     * @throws \Exception
     */
    public static function executeInTransaction(callable $callback)
    {
        $di = Di::getDefault();
        $db = $di->get(MainDatabaseProvider::SERVICE_NAME);
        
        $db->begin();
        
        try {
            $result = $callback();
            $db->commit();
            return $result;
        } catch (\Exception $e) {
            $db->rollback();
            throw $e;
        }
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
            $ruleParts = explode('|', $rule);
            
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
                        // HTML encoding will be done later by html_escape rule where needed
                        $value = $filter->trim($value);
                        break;
                    case 'int':
                        // Use absint for positive integers
                        $value = $filter->absint($value);
                        break;
                    case 'bool':
                        // Convert various representations to boolean
                        $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                        break;
                    case 'html_escape':
                        $value = htmlspecialchars($value, ENT_QUOTES);
                        break;
                    case 'max':
                        if (is_string($value)) {
                            $value = substr($value, 0, (int)$ruleValue);
                        }
                        break;
                    case 'regex':
                        if ($ruleValue && !preg_match($ruleValue, $value)) {
                            $value = preg_replace('/[^0-9]/', '', $value); // Fallback for numbers
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
                        if (!empty($value) && $pattern && !preg_match($pattern, $value)) {
                            $errors[$field] = $message;
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