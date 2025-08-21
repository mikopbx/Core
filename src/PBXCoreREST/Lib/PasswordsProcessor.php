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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Core\System\PasswordValidator;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Di\Injectable;
use Phalcon\Di\Di;

/**
 * Passwords REST API processor
 * 
 * Provides REST API endpoints for password validation and generation
 * Uses the unified PasswordValidator service
 */
class PasswordsProcessor extends Injectable
{
    /**
     * Process password-related requests
     *
     * @param array $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $action = $request['action'];
        $data = $request['data'];
        
        try {
            $res = match ($action) {
                'validate' => self::validatePassword($data),
                'generate' => self::generatePassword($data),
                'checkDictionary' => self::checkDictionary($data),
                'batchValidate' => self::batchValidate($data),
                default => self::unknownAction($action)
            };
        } catch (\Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        $res->function = $action;
        return $res;
    }
    
    /**
     * Validate password strength
     *
     * @param array $data Request data with 'password' and optional 'field', 'skipDictionary'
     * @return PBXApiResult Validation result
     */
    private static function validatePassword(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        
        $password = $data['password'] ?? '';
        $field = $data['field'] ?? '';
        $skipDictionary = $data['skipDictionary'] ?? false;
        
        if (empty($password)) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('gs_ValidateEmptyWebPassword');
            return $res;
        }
        
        // Map field to context
        $context = self::mapFieldToContext($field);
        
        // Validate using unified validator
        $validationResult = PasswordValidator::validate(
            $password, 
            $context,
            ['skipDictionary' => $skipDictionary]
        );
        
        $res->data = $validationResult;
        $res->success = true;
        
        return $res;
    }
    
    /**
     * Check password against dictionary only
     *
     * @param array $data Request data with 'password'
     * @return PBXApiResult Dictionary check result
     */
    private static function checkDictionary(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        
        $password = $data['password'] ?? '';
        
        if (empty($password)) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('gs_ValidateEmptyWebPassword');
            return $res;
        }
        
        $isInDictionary = PasswordValidator::isInDictionary($password);
        
        $res->data = [
            'isInDictionary' => $isInDictionary,
            'message' => $isInDictionary 
                ? self::translate('gs_PasswordInDictionary') 
                : self::translate('gs_PasswordAcceptable')
        ];
        $res->success = true;
        
        return $res;
    }
    
    /**
     * Generate a secure password
     *
     * @param array $data Request data with optional 'length' and 'includeSpecial'
     * @return PBXApiResult Generated password
     */
    private static function generatePassword(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        
        $length = isset($data['length']) ? (int)$data['length'] : PasswordValidator::DEFAULT_LENGTH;
        $includeSpecial = $data['includeSpecial'] ?? true;
        
        try {
            $password = PasswordValidator::generate($length, $includeSpecial);
            
            // Calculate strength of generated password
            $score = PasswordValidator::calculateScore($password);
            
            $res->data = [
                'password' => $password,
                'length' => strlen($password),
                'score' => $score,
                'strength' => PasswordValidator::getStrengthLabel($score),
                'hasSpecialChars' => preg_match('/[^a-zA-Z0-9]/', $password) === 1
            ];
            $res->success = true;
            
        } catch (\Throwable $e) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('gs_PasswordGenerateFailed') . ': ' . $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Batch validate multiple passwords
     *
     * @param array $data Request data with 'passwords' array
     * @return PBXApiResult Batch validation results
     */
    private static function batchValidate(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        
        $passwords = $data['passwords'] ?? [];
        $skipDictionary = $data['skipDictionary'] ?? false;
        
        if (empty($passwords) || !is_array($passwords)) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('gs_PasswordsArrayRequired');
            return $res;
        }
        
        // Prepare passwords with contexts
        $passwordsWithContext = [];
        foreach ($passwords as $item) {
            if (is_array($item) && isset($item['password'])) {
                $context = self::mapFieldToContext($item['field'] ?? '');
                $passwordsWithContext[$context] = $item['password'];
            }
        }
        
        if (empty($passwordsWithContext)) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('gs_InvalidPasswordsFormat');
            return $res;
        }
        
        // Batch validate
        $results = PasswordValidator::validateBatch(
            $passwordsWithContext,
            ['skipDictionary' => $skipDictionary]
        );
        
        $res->data = $results;
        $res->success = true;
        
        return $res;
    }
    
    /**
     * Map field name to validation context
     *
     * @param string $field Field name
     * @return string|null Validation context
     */
    private static function mapFieldToContext(string $field): ?string
    {
        if (empty($field)) {
            return null;
        }
        
        // Handle various field name formats
        return match($field) {
            'WebAdminPassword', 'WEB_ADMIN_PASSWORD' => PasswordValidator::CONTEXT_WEB_ADMIN,
            'SSHPassword', 'SSH_PASSWORD' => PasswordValidator::CONTEXT_SSH,
            'secret', 'sip_secret' => PasswordValidator::CONTEXT_SIP,
            'ami_secret' => PasswordValidator::CONTEXT_AMI,
            'provider_secret' => PasswordValidator::CONTEXT_PROVIDER,
            default => $field
        };
    }
    
    /**
     * Handle unknown action
     *
     * @param string $action Unknown action name
     * @return PBXApiResult Error response
     */
    private static function unknownAction(string $action): PBXApiResult
    {
        $res = new PBXApiResult();
        $di = Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);
        $res->messages['error'][] = $translation->_('api_UnknownAction') . ": {$action}";
        return $res;
    }
    
    /**
     * Helper to get translated message
     * 
     * @param string $key Translation key
     * @param array $params Optional parameters
     * @return string Translated message
     */
    private static function translate(string $key, array $params = []): string
    {
        try {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            return $translation->_($key, $params);
        } catch (\Exception $e) {
            // Fallback to key if translation fails
            return $key;
        }
    }
}