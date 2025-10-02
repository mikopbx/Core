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

namespace MikoPBX\PBXCoreREST\Lib\Modules;

use GuzzleHttp;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 *  Class GetModuleInfo
 *  Retrieves module information from repository and stores the information in local cache
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class GetModuleInfoAction  extends Injectable
{
    public const string WRONG_MODULE_INFO = 'Wrong module info';


    /**
     * Retrieves module information from repository and store the information in local cache
     *
     * @param string $moduleUniqueID
     * @return PBXApiResult
     */
    public static function main(string $moduleUniqueID): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $di = Di::getDefault();
        if ($di === null) {
            $res->success    = false;
            $res->messages[] = 'Dependency injector does not initialized';
            return $res;
        }
        $WebUiLanguage = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LANGUAGE);
        $cacheKey = "ModulesManagementProcessor:GetModuleInfo:$moduleUniqueID:$WebUiLanguage";
        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        if ($managedCache->has($cacheKey)){
            $body = $managedCache->get($cacheKey);
        } else {
            $PBXVersion = PbxSettings::getValueByKey(PbxSettings::PBX_VERSION);
            $PBXVersion = (string)str_ireplace('-dev', '', $PBXVersion);
            $body = '';
            $client = new GuzzleHttp\Client();

            $maxAttempts = 3;
            $attemptDelay = 2; // seconds
            $code = Response::INTERNAL_SERVER_ERROR;

            for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
                try {
                    $request = $client->request(
                        'POST',
                        'https://releases.mikopbx.com/releases/v1/mikopbx/getModuleInfo',
                        [
                            'headers' => [
                                'Content-Type' => 'application/json; charset=utf-8',
                            ],
                            'json' => [
                                'PBXVER' => $PBXVersion,
                                'LANGUAGE'=> $WebUiLanguage,
                                'GUID'=> $moduleUniqueID,
                            ],
                            'timeout' => 15,
                        ]
                    );
                    $code = $request->getStatusCode();
                    if ($code === Response::OK){
                        $body = $request->getBody()->getContents();
                        $managedCache->set($cacheKey, $body, 3600);
                        break; // Success - exit loop
                    }
                } catch (\Throwable $e) {
                    $code = Response::INTERNAL_SERVER_ERROR;
                    $errorMessage = "Attempt $attempt/$maxAttempts failed: " . $e->getMessage();
                    SystemMessages::sysLogMsg(static::class, $errorMessage);

                    if ($attempt < $maxAttempts) {
                        // Wait before next attempt
                        sleep($attemptDelay);
                    } else {
                        // Last attempt failed - add to response messages
                        $res->messages[] = $e->getMessage();
                    }
                }
            }

            if ($code !== Response::OK) {
                return $res;
            }
        }
        $result =  json_decode($body??'', true);
        if (array_key_exists('data', $result)) {
            $res->data = $result['data'];
            $res->success = true;
        } else {
            $res->success    = false;
            $res->messages[] = self::WRONG_MODULE_INFO;
        }

        return $res;
    }

}