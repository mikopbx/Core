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

use MikoPBX\PBXCoreREST\Lib\Passwords\{
    ValidatePasswordAction,
    GeneratePasswordAction,
    CheckDictionaryAction,
    BatchValidateAction,
    BatchCheckDictionaryAction
};
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Di\Injectable;
use Phalcon\Di\Di;

/**
 * Available actions for password management
 */
enum PasswordAction: string
{
    case VALIDATE = 'validate';
    case GENERATE = 'generate';
    case CHECK_DICTIONARY = 'checkDictionary';
    case BATCH_VALIDATE = 'batchValidate';
    case BATCH_CHECK_DICTIONARY = 'batchCheckDictionary';
}

/**
 * Passwords REST API processor
 *
 * Provides REST API endpoints for password validation and generation.
 * Uses the unified PasswordService service through dedicated action classes.
 * 
 * Available actions:
 * - validate: Validate password strength with detailed feedback
 * - generate: Generate cryptographically secure passwords
 * - checkDictionary: Quick check against common passwords dictionary
 * - batchValidate: Validate multiple passwords with different contexts
 * - batchCheckDictionary: Batch check multiple passwords against dictionary
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class PasswordsManagementProcessor extends Injectable
{
    /**
     * Process password-related requests
     *
     * Routes requests to appropriate action handlers based on the action parameter.
     * All actions are implemented as separate classes for better maintainability.
     *
     * @param array $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'];

        // Try to match action with enum
        $action = PasswordAction::tryFrom($actionString);
        
        if ($action === null) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('api_UnknownAction') . ": {$actionString}";
            $res->function = $actionString;
            return $res;
        }

        try {
            $res = match ($action) {
                PasswordAction::VALIDATE => ValidatePasswordAction::main($data),
                PasswordAction::GENERATE => GeneratePasswordAction::main($data),
                PasswordAction::CHECK_DICTIONARY => CheckDictionaryAction::main($data),
                PasswordAction::BATCH_VALIDATE => BatchValidateAction::main($data),
                PasswordAction::BATCH_CHECK_DICTIONARY => BatchCheckDictionaryAction::main($data),
            };
        } catch (\Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        $res->function = $actionString;
        return $res;
    }
}