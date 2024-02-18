<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Http;

use MikoPBX\AdminCabinet\Controllers\SessionController;
use MikoPBX\Common\Providers\AclProvider;
use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\SessionProvider;
use MikoPBX\Modules\Config\RestAPIConfigInterface;
use Phalcon\Acl\Enum as AclEnum;
use Phalcon\Http\Request as PhRequest;
use Phalcon\Mvc\Micro;

/**
 * Class Request
 * @package MikoPBX\PBXCoreREST\Http
 */
class Request extends PhRequest
{
    /**
     * Check the header of request to understand if it needs async response or not
     * @return bool
     */
    public function isAsyncRequest(): bool
    {
        return !empty($this->getHeader('X-Async-Response-Channel-Id'));
    }

    /**
     * Channel to push request
     * @return string
     */
    public function getAsyncRequestChannelId(): string
    {
        return $this->getHeader('X-Async-Response-Channel-Id')??'';
    }

    /**
     * Check if the request is coming from localhost.
     *
     * @return bool
     */
    public function isLocalHostRequest(): bool
    {
        return ($_SERVER['REMOTE_ADDR'] === '127.0.0.1');
    }

    /**
     * Check if debug mode is enabled.
     *
     * @return bool
     */
    public function isDebugModeEnabled(): bool
    {
        return ($this->getDI()->getShared(ConfigProvider::SERVICE_NAME)->path('adminApplication.debugMode'));
    }

    /**
     * Check if the request has an authorized session.
     *
     * @return bool
     */
    public function isAuthorizedSessionRequest(): bool
    {
        return $this->getDI()->getShared(SessionProvider::SERVICE_NAME)->has(SessionController::SESSION_ID);
    }

    /**
     * Checks current request by ACL lists
     *
     * For example, we request /pbxcore/api/sip/getPeersStatuses
     * We explode the paths on 5-th parts and combine two variables
     *  controller = /pbxcore/api/sip
     *  action = getPeersStatuses
     *
     * The next we request the ACL table and check if it allows or not
     *
     * @param $api
     * @return bool
     */
    public function isAllowedAction($api): bool
    {
        $pattern = $api->router->getMatches()[0]??'';
        $partsOfPattern = explode('/', $pattern);
        if (count($partsOfPattern)===5){
            $role = $api->getSharedService(SessionProvider::SERVICE_NAME)->get(SessionController::SESSION_ID)[SessionController::ROLE] ?? AclProvider::ROLE_GUESTS;
            $acl =  $api->getSharedService(AclProvider::SERVICE_NAME);
            $controller = "/$partsOfPattern[1]/$partsOfPattern[2]/$partsOfPattern[3]";
            $action = "/$partsOfPattern[4]";
            $allowed = $acl->isAllowed($role, $controller, $action);
            if ($allowed != AclEnum::ALLOW) {
                return false;
            }
        }
        return true;
    }

    /**
     * Checks additional modules routes access rules
     * @param Micro $api
     *
     * @return bool
     */
    public function thisIsModuleNoAuthRequest(Micro $api): bool
    {
        $pattern  = $api->request->getURI(true);
        $additionalRoutes = PBXConfModulesProvider::hookModulesMethod(RestAPIConfigInterface::GET_PBXCORE_REST_ADDITIONAL_ROUTES);
        foreach ($additionalRoutes as $additionalRoutesFromModule){
            foreach ($additionalRoutesFromModule as $additionalRoute) {
                $noAuth = $additionalRoute[5] ?? false;
                // Let's prepare a regular expression to check the URI
                $resultPattern = '/^'.str_replace('/', '\/', $additionalRoute[2]).'/';
                $resultPattern = preg_replace('/\{[^\/]+\}/', '[^\/]+', $resultPattern);
                // Let's check the URI
                if ($noAuth === true && preg_match($resultPattern, $pattern)) {
                    // Allow request without authentication
                    return true;
                }
            }
        }
        return false;
    }
}