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
use MikoPBX\Core\System\PasswordService;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Action for generating secure passwords
 * 
 * Generates cryptographically secure passwords with configurable length
 * and character sets. Includes automatic strength calculation.
 * 
 * @api {post} /pbxcore/api/v2/passwords/generate Generate password
 * @apiVersion 2.0.0
 * @apiName GeneratePassword
 * @apiGroup Passwords
 * 
 * @apiParam {Number} [length=16] Password length (8-64)
 * @apiParam {Boolean} [includeSpecial=true] Include special characters
 * 
 * @apiSuccess {Boolean} success Operation result
 * @apiSuccess {Object} data Generated password data
 * @apiSuccess {String} data.password The generated password
 * @apiSuccess {Number} data.length Password length
 * @apiSuccess {Number} data.score Strength score (0-100)
 * @apiSuccess {String} data.strength Strength label
 * @apiSuccess {Boolean} data.hasSpecialChars Contains special characters
 * 
 * @apiError {String} error Generation failed message
 */
class GeneratePasswordAction  extends Injectable
{
    /**
     * Generate a secure password
     *
     * @param array $data Request data with optional 'length' and 'includeSpecial'
     * @return PBXApiResult Generated password with metadata
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __CLASS__;

        $options = [
            'length' => isset($data['length']) ? (int)$data['length'] : PasswordService::DEFAULT_LENGTH,
            'includeSpecial' => $data['includeSpecial'] ?? true
        ];

        try {
            $password = PasswordService::generate($options);

            // Calculate strength of generated password
            $validationResult = PasswordService::validate($password);

            $res->data = [
                'password' => $password,
                'length' => strlen($password),
                'score' => $validationResult['score'],
                'strength' => $validationResult['strength'],
                'hasSpecialChars' => preg_match('/[^a-zA-Z0-9]/', $password) === 1
            ];
            $res->success = true;

        } catch (\Throwable $e) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('psw_PasswordGenerateFailed') . ': ' . $e->getMessage();
        }

        return $res;
    }
}