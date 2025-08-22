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

use MikoPBX\Core\System\PasswordValidator;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Action for batch password validation
 * 
 * Validates multiple passwords at once with different contexts.
 * Optimized for performance when checking multiple fields.
 * 
 * @api {post} /pbxcore/api/v2/passwords/batchValidate Batch validate
 * @apiVersion 2.0.0
 * @apiName BatchValidate
 * @apiGroup Passwords
 * 
 * @apiParam {Array} passwords Array of password objects
 * @apiParam {String} passwords.password Password to validate
 * @apiParam {String} [passwords.field] Field context
 * @apiParam {Boolean} [skipDictionary=false] Skip dictionary checks
 * 
 * @apiSuccess {Boolean} success Operation result
 * @apiSuccess {Object} data Validation results keyed by context
 * 
 * @apiError {String} error Invalid format or empty array
 */
class BatchValidateAction  extends Injectable
{
    /**
     * Batch validate multiple passwords
     *
     * @param array $data Request data with 'passwords' array and optional 'skipDictionary'
     * @return PBXApiResult Batch validation results
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __CLASS__;

        $passwords = $data['passwords'] ?? [];
        $skipDictionary = $data['skipDictionary'] ?? false;

        if (empty($passwords) || !is_array($passwords)) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('psw_PasswordsArrayRequired');
            return $res;
        }

        // Prepare passwords with contexts using shared mapper
        $passwordsWithContext = [];
        foreach ($passwords as $item) {
            if (is_array($item) && isset($item['password'])) {
                $context = FieldContextMapper::mapFieldToContext($item['field'] ?? '');
                $passwordsWithContext[$context] = $item['password'];
            }
        }

        if (empty($passwordsWithContext)) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('psw_InvalidPasswordsFormat');
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
}