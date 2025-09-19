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
 * Action for checking password against dictionary
 * 
 * Performs lightweight dictionary check to identify common/compromised passwords.
 * Useful for quick validation without full strength analysis.
 * 
 * @api {post} /pbxcore/api/v2/passwords/checkDictionary Check dictionary
 * @apiVersion 2.0.0
 * @apiName CheckDictionary
 * @apiGroup Passwords
 * 
 * @apiParam {String} password Password to check
 * 
 * @apiSuccess {Boolean} success Operation result
 * @apiSuccess {Object} data Dictionary check result
 * @apiSuccess {Boolean} data.isInDictionary Found in dictionary
 * @apiSuccess {String} data.message Result message
 */
class CheckDictionaryAction  extends Injectable
{
    /**
     * Check password against dictionary
     *
     * @param array $data Request data with 'password'
     * @return PBXApiResult Dictionary check result
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __CLASS__;

        $password = $data['password'] ?? '';

        if (empty($password)) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('psw_ValidateEmptyPassword');
            return $res;
        }

        $isInDictionary = PasswordService::checkDictionary($password);

        $di = Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);
        
        $res->data = [
            'isInDictionary' => $isInDictionary,
            'message' => $isInDictionary
                ? $translation->_('psw_PasswordInDictionary')
                : $translation->_('psw_PasswordAcceptable')
        ];
        $res->success = true;

        return $res;
    }
}