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
use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 *  Class GetAvailableModules
 *  Request new modules form repository and store the information in local cache
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules
 */
class GetAvailableModulesAction  extends Injectable
{
    /**
     * Retrieves available modules on MIKO repository.
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
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
        $cacheKey = "ModulesManagementProcessor:GetAvailableModules:$WebUiLanguage";
        $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
        if ($managedCache->has($cacheKey)) {
            $res->data = $managedCache->get($cacheKey);
            $res->success = true;
            return $res;
        }
        return $di->get(MutexProvider::SERVICE_NAME)
            ->synchronized('getAvailableModules',
                 function () use ($managedCache, $cacheKey, $WebUiLanguage) {
                    return self::getAvailableModulesOnline($managedCache, $cacheKey, $WebUiLanguage);
                 },
                 10,
                 30
                );
    }

    /**
     * Retrieves available modules on MIKO repository.
     *
     * @return PBXApiResult
     */
    private static function getAvailableModulesOnline($managedCache, $cacheKey, $WebUiLanguage): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $PBXVersion = PbxSettings::getValueByKey(PbxSettings::PBX_VERSION);
        $PBXVersion = (string)str_ireplace('-dev', '', $PBXVersion);
        $body = '';
        $client = new GuzzleHttp\Client();
        try {
            $request = $client->request(
                'POST',
                'https://releases.mikopbx.com/releases/v1/mikopbx/getAvailableModules',
                [
                    'headers' => [
                        'Content-Type' => 'application/json; charset=utf-8',
                    ],
                    'json' => [
                        'PBXVER' => $PBXVersion,
                        'LANGUAGE' => $WebUiLanguage,
                    ],
                    'timeout' => 15,
                ]
            );
            $code = $request->getStatusCode();
            if ($code === Response::OK) {
                $body = $request->getBody()->getContents();
                $res->data = json_decode($body ?? '', true) ?? [];
                if (is_array($res->data)) {
                    $managedCache->set($cacheKey, $body, 3600);
                }
            }
        } catch (\Throwable $e) {
            $code = Response::INTERNAL_SERVER_ERROR;
            SystemMessages::sysLogMsg(static::class, $e->getMessage());
            $res->messages[] = $e->getMessage();
        }

        if ($code !== Response::OK) {
            return $res;
        }
        return $res;
    }
}
