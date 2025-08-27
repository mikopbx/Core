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

namespace MikoPBX\PBXCoreREST\Lib\Passwords;

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Action for validating password strength
 * 
 * Validates password against security requirements and returns detailed feedback
 * including score, strength level, and improvement suggestions.
 * 
 * @api {post} /pbxcore/api/v2/passwords/validate Validate password
 * @apiVersion 2.0.0
 * @apiName ValidatePassword
 * @apiGroup Passwords
 * 
 * @apiParam {String} password Password to validate
 * @apiParam {String} [field] Field context for validation (WebAdminPassword, SSHPassword, provider_secret)
 * @apiParam {Boolean} [skipDictionary=false] Skip dictionary check for performance
 * 
 * @apiSuccess {Boolean} success Operation result
 * @apiSuccess {Object} data Validation result
 * @apiSuccess {Boolean} data.isValid Overall validation status
 * @apiSuccess {Number} data.score Password strength score (0-100)
 * @apiSuccess {String} data.strength Strength label (very_weak, weak, fair, good, strong)
 * @apiSuccess {Boolean} data.isDefault Is default password
 * @apiSuccess {Boolean} data.isSimple Is too simple
 * @apiSuccess {Boolean} data.isTooShort Is below minimum length
 * @apiSuccess {Boolean} data.isTooLong Exceeds maximum length
 * @apiSuccess {Array} data.messages Validation messages
 * @apiSuccess {Array} data.suggestions Improvement suggestions
 */
class ValidatePasswordAction extends Injectable
{
    /**
     * Validate password strength
     *
     * @param array $data Request data with 'password', optional 'field' and 'skipDictionary'
     * @return PBXApiResult Validation result with score and feedback
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __CLASS__;

        $password = $data['password'] ?? '';
        $field = $data['field'] ?? '';
        $skipDictionary = $data['skipDictionary'] ?? false;

        if (empty($password)) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('psw_ValidateEmptyPassword');
            return $res;
        }

        // Map field to context using shared mapper
        $context = FieldContextMapper::mapFieldToContext($field);

        // Validate using unified validator
        $validationResult = \MikoPBX\PBXCoreREST\Services\PasswordService::validate(
            $password,
            $context,
            ['skipDictionary' => $skipDictionary]
        );

        $res->data = $validationResult;
        $res->success = true;

        return $res;
    }
}