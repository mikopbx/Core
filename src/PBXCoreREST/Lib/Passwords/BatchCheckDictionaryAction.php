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
 * Action for batch checking passwords against dictionary
 * 
 * Performs efficient batch dictionary checks for multiple passwords.
 * Optimized for checking many passwords at once, reducing overhead.
 * 
 * @api {post} /pbxcore/api/v2/passwords/batchCheckDictionary Batch check dictionary
 * @apiVersion 2.0.0
 * @apiName BatchCheckDictionary
 * @apiGroup Passwords
 * 
 * @apiParam {Array} passwords Array of passwords to check
 * @apiParam {Boolean} [returnDetails=false] Include detailed messages for each password
 * 
 * @apiSuccess {Boolean} success Operation result
 * @apiSuccess {Object} data Dictionary check results
 * @apiSuccess {Object} data.results Check results keyed by index
 * @apiSuccess {Number} data.weakCount Number of weak passwords found
 * @apiSuccess {Array} data.weakIndexes Indexes of weak passwords
 * 
 * @apiError {String} error Invalid format or empty array
 */
class BatchCheckDictionaryAction extends Injectable
{
    /**
     * Batch check passwords against dictionary
     *
     * @param array $data Request data with 'passwords' array
     * @return PBXApiResult Batch dictionary check results
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __CLASS__;

        $passwords = $data['passwords'] ?? [];
        $returnDetails = $data['returnDetails'] ?? false;

        if (empty($passwords) || !is_array($passwords)) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('psw_PasswordsArrayRequired');
            return $res;
        }

        // Prepare passwords array preserving original indexes
        $passwordsToCheck = [];
        foreach ($passwords as $index => $password) {
            if (is_string($password) && !empty($password)) {
                $passwordsToCheck[$index] = $password;
            }
        }

        if (empty($passwordsToCheck)) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            $res->messages['error'][] = $translation->_('psw_NoValidPasswordsProvided');
            return $res;
        }

        // Batch check using optimized method
        $checkResults = \MikoPBX\PBXCoreREST\Services\PasswordService::checkDictionaryBatch($passwordsToCheck);
        
        // Prepare response data
        $weakIndexes = [];
        $weakCount = 0;
        
        foreach ($checkResults as $index => $isWeak) {
            if ($isWeak) {
                $weakIndexes[] = $index;
                $weakCount++;
            }
        }
        
        $responseData = [
            'results' => $checkResults,
            'weakCount' => $weakCount,
            'weakIndexes' => $weakIndexes
        ];
        
        // Add detailed messages if requested
        if ($returnDetails) {
            $di = Di::getDefault();
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            
            $details = [];
            foreach ($checkResults as $index => $isWeak) {
                $details[$index] = [
                    'isInDictionary' => $isWeak,
                    'message' => $isWeak
                        ? $translation->_('psw_PasswordInDictionary')
                        : $translation->_('psw_PasswordAcceptable')
                ];
            }
            $responseData['details'] = $details;
        }
        
        $res->data = $responseData;
        $res->success = true;

        return $res;
    }
}