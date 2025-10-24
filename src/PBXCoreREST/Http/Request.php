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

use MikoPBX\Common\Providers\AclProvider;
use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
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
     * Bearer token information stored after successful validation (API Keys)
     * @var array<string, mixed>|null
     */
    private ?array $tokenInfo = null;

    /**
     * JWT payload stored after successful JWT validation
     * @var array<string, mixed>|null
     */
    private ?array $jwtPayload = null;
    
    /**
     * Check the header of a request to understand if it needs async response or not
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
        return $this->getHeader('X-Async-Response-Channel-Id') ?: '';
    }

    /**
     * Checks if the current request is a debug request.
     *
     * This method inspects the presence of the 'X-Debug-The-Request' header
     * to determine if the request is for debugging purposes.
     *
     * @examples
     * curl -X POST \
     *      -H 'Content-Type: application/json' \
     *      -H 'Cookie: XDEBUG_SESSION=PHPSTORM' \
     *      -H 'X-Debug-The-Request: 1' \
     *      -d '{"filename": "/storage/usbdisk1/mikopbx/tmp/mikopbx-2023.1.223-x86_64.img"}' \
     *      http://127.0.0.1/pbxcore/api/system/upgrade
     *
     * Or add a header at any semantic API request
     * ...
     *  beforeXHR(xhr) {
     *      xhr.setRequestHeader ('X-Debug-The-Request', 1);
     *      return xhr;
     * },
     * ...
     *
     * @return bool True if the request is a debug request, false otherwise.
     */
    public function isDebugRequest(): bool
    {
        return !empty($this->getHeader('X-Debug-The-Request'));
    }
    /**
     * Check if the request is coming from localhost.
     * Supports both IPv4 (127.0.0.1) and IPv6 (::1) localhost addresses.
     *
     * @return bool
     */
    public function isLocalHostRequest(): bool
    {
        $clientAddress = $this->getClientAddress();
        return in_array($clientAddress, ['127.0.0.1', '::1'], true);
    }

    /**
     * Requested execution timeout
     * @return int
     */
    public function getRequestTimeout(): int
    {
        return intval($this->getHeader('X-Processor-Timeout')) ?: 10;
    }

    /**
     * Requested execution priority
     * @return int
     */
    public function getRequestPriority(): int
    {
        return intval($this->getHeader('X-Processor-Priority')) ?: 10;
    }

    /**
     * Get request data regardless of content type or HTTP method
     * Handles both JSON and form-encoded data, always includes query parameters
     *
     * Query parameters take precedence over body data to allow parameter override
     *
     * @return array<string, mixed> The parsed request data with query parameters merged
     */
    public function getData(): array
    {
        $queryData = $this->getQuery();
        $bodyData = [];

        $contentType = $this->getContentType();

        // Handle JSON content type
        if (strpos($contentType, 'application/json') !== false) {
            $rawBody = $this->getRawBody();
            if (!empty($rawBody)) {
                $jsonData = json_decode($rawBody, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($jsonData)) {
                    $bodyData = $jsonData;
                }
            }
        } else {
            // Handle form data based on HTTP method
            $method = $this->getMethod();
            switch ($method) {
                case 'POST':
                    $bodyData = $this->getPost();
                    break;
                case 'PUT':
                    $bodyData = $this->getPut();
                    break;
                case 'PATCH':
                    $bodyData = $this->getPatch();
                    break;
                case 'DELETE':
                    // DELETE can have body data (though rarely used per HTTP spec)
                    $rawBody = $this->getRawBody();
                    if (!empty($rawBody)) {
                        parse_str($rawBody, $data);
                        $bodyData = $data ?: [];
                    } else {
                        $bodyData = [];
                    }
                    break;
                case 'GET':
                    // For GET, body data is empty
                    $bodyData = [];
                    break;
                default:
                    $bodyData = [];
            }
        }

        // Merge body data with query parameters, query parameters take precedence
        return array_merge($bodyData, $queryData);
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
     * Check if request has Bearer token in Authorization header
     * 
     * @return bool
     */
    public function hasBearerToken(): bool
    {
        $authHeader = $this->getHeader('Authorization');
        return $authHeader && str_starts_with($authHeader, 'Bearer ');
    }
    
    /**
     * Get Bearer token from Authorization header
     *
     * @return string|null
     */
    public function getBearerToken(): ?string
    {
        $authHeader = $this->getHeader('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            return substr($authHeader, 7); // Remove "Bearer " prefix
        }
        return null;
    }

    /**
     * Store Bearer token info for logging/context
     *
     * @param array<string, mixed> $info
     * @return void
     */
    public function setTokenInfo(array $info): void
    {
        $this->tokenInfo = $info;
    }
    
    /**
     * Get Bearer token info
     *
     * @return array<string, mixed>|null
     */
    public function getTokenInfo(): ?array
    {
        return $this->tokenInfo;
    }

    /**
     * Set JWT payload after successful JWT validation
     *
     * @param array<string, mixed> $payload
     * @return void
     */
    public function setJwtPayload(array $payload): void
    {
        $this->jwtPayload = $payload;
    }

    /**
     * Get JWT payload
     *
     * @return array<string, mixed>|null
     */
    public function getJwtPayload(): ?array
    {
        return $this->jwtPayload;
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
     * Role is extracted from JWT token payload (set by AuthenticationMiddleware during token validation)
     *
     * @param Micro $api
     * @return bool
     */
    public function isAllowedAction(Micro $api): bool
    {
        $pattern = $api->router->getMatches()[0] ?? '';
        $partsOfPattern = explode('/', $pattern);
        if (count($partsOfPattern) === 5) {
            // Get role from JWT payload (set by AuthenticationMiddleware)
            $role = $this->jwtPayload['role'] ?? AclProvider::ROLE_GUESTS;

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
        foreach ($additionalRoutes as $additionalRoutesFromModule) {
            foreach ($additionalRoutesFromModule as $additionalRoute) {
                $noAuth = $additionalRoute[5] ?? false;
                // Let's prepare a regular expression to check the URI
                $resultPattern = '/^' . str_replace('/', '\/', $additionalRoute[2]) . '/';
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
