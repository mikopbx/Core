<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Middleware;

use MikoPBX\Common\Providers\LoggerAuthProvider;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\PBXCoreREST\Http\Request;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Providers\RequestProvider;
use MikoPBX\PBXCoreREST\Providers\ResponseProvider;
use MikoPBX\PBXCoreREST\Traits\ResponseTrait;
use Phalcon\Mvc\Micro;
use Phalcon\Mvc\Micro\MiddlewareInterface;


/**
 * Class AuthenticationMiddleware
 *
 */
class AuthenticationMiddleware implements MiddlewareInterface
{
    use ResponseTrait;

    /**
     * Call me
     *
     * @param Micro $api
     *
     * @return bool
     */
    public function call(Micro $api)
    {
        /** @var Request $request */
        $request = $api->getService(RequestProvider::SERVICE_NAME);
        /** @var Response $response */
        $response = $api->getService(ResponseProvider::SERVICE_NAME);

        if (
            true !== $request->isLocalHostRequest()
            && true !== $request->isAuthorizedSessionRequest()
            && true !== $request->isDebugModeEnabled()
            && true !== $this->thisIsModuleNoAuthRequest($api)
        ) {
            $loggerAuth = $api->getService(LoggerAuthProvider::SERVICE_NAME);
            $loggerAuth->warning("From: {$request->getClientAddress(true)} UserAgent:{$request->getUserAgent()} Cause: Wrong password");
            $this->halt(
                $api,
                $response::OK,
                'Invalid auth token'
            );
            return false;
        }
        return true;
    }


    /**
     * Check additional modules routes access rules
     * @param Micro $api
     *
     * @return bool
     */
    public function thisIsModuleNoAuthRequest(Micro $api): bool
    {
        $pattern  = $api->request->getURI(true);
        $configClassObj = new ConfigClass();
        $additionalRoutes = $configClassObj->hookModulesMethodWithArrayResult(ConfigClass::GET_PBXCORE_REST_ADDITIONAL_ROUTES);
        foreach ($additionalRoutes as $additionalRoutesFromModule){
            foreach ($additionalRoutesFromModule as $additionalRoute) {
                $noAuth = $additionalRoute[5] ?? false;
                if ($noAuth === true
                    && stripos($pattern, $additionalRoute[2]) === 0) {
                    return true; // Allow request without authentication
                }
            }
        }
        return false;
    }

}