<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Middleware;

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Http\Request;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Traits\ResponseTrait;
use Phalcon\Mvc\Micro;
use Phalcon\Mvc\Micro\MiddlewareInterface;


/**
 * Class AuthenticationMiddleware
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
        $request = $api->getService('request');
        /** @var Response $response */
        $response = $api->getService('response');

        if (
            true !== $request->isLocalHostRequest()
            && true !== $request->isAuthorizedSessionRequest()
            && true !== $request->isDebugModeEnabled()
            && true !== $this->thisIsModuleNoAuthRequest($api)
        ) {
            Util::sysLogMsg('web_auth', "From: {$request->getClientAddress(true)} UserAgent:{$request->getUserAgent()} Cause: Wrong password");
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
        $additionalModules = $api->getService('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            /** @var \MikoPBX\Modules\Config\ConfigClass; $appClass */
            $additionalRoutes = $appClass->getPBXCoreRESTAdditionalRoutes();
            if(!is_array($additionalRoutes)){
                continue;
            }
            foreach ($additionalRoutes as $additionalRoute){
                $noAuth = $additionalRoute[5]??false;
                if ($noAuth===true
                    && stripos($pattern, $additionalRoute[2])!==0){
                    return true; // Allow request without authentication
                }
            }
        }
        return false;
    }

}