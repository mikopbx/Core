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
     * Server-trusted routed path, set in index.php from the nginx-supplied _url.
     * Security decisions use this instead of getURI() (GHSA-343m-2899-5qh3).
     *
     * @var string|null
     */
    private ?string $routedPath = null;

    /**
     * Store the server-trusted routed path.
     *
     * @param string $path Absolute path beginning with /pbxcore
     */
    public function setRoutedPath(string $path): void
    {
        $this->routedPath = $path;
    }

    /**
     * Return the server-trusted routed path, or null if never set.
     * Security callers must fail closed on null, never fall back to getURI().
     *
     * @param bool $onlyPath When true, strip the query string if any is present.
     * @return string|null
     */
    public function getRoutedPath(bool $onlyPath = false): ?string
    {
        if ($this->routedPath === null) {
            return null;
        }
        if ($onlyPath) {
            return strtok($this->routedPath, '?');
        }
        return $this->routedPath;
    }

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
     * A debug request makes the controller wait up to 9999 s and is never
     * dropped as stale by the worker, so the header is honoured only from
     * localhost or an admin JWT session; anyone else is ignored (#1324).
     * Call it after AuthenticationMiddleware has stored the JWT payload.
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
        if (empty($this->getHeader('X-Debug-The-Request'))) {
            return false;
        }
        if ($this->isLocalHostRequest()) {
            return true;
        }
        return ($this->jwtPayload['role'] ?? null) === AclProvider::ROLE_ADMINS;
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
     * Get request data with query parameters taking precedence
     * Handles both JSON and form-encoded data, always includes query parameters
     *
     * Query parameters take precedence over body data to allow parameter override.
     * GET and HEAD are query-only; do not read or decode their bodies (#1161).
     *
     * @return array<string, mixed> The parsed request data with query parameters merged
     */
    public function getData(): array
    {
        $queryData = $this->getQuery();
        $method = $this->getMethod();
        if ($method === 'GET' || $method === 'HEAD') {
            return $queryData;
        }
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
     * Check if request carries an API token, in either accepted form:
     *   - `Authorization: Bearer <token>` (canonical MikoPBX form)
     *   - `X-Api-Key: <token>` (CrowdSec convention; used by stock
     *     cs-firewall-bouncer and the rest of the LAPI ecosystem
     *     polling `/pbxcore/api/v3/firewall-bouncer/...`)
     *
     * Both headers carry the SAME token type — a 64-char hex API key
     * stored hashed in the `ApiKeys` model. Path restrictions and the
     * usual permission checks apply identically regardless of which
     * header delivered the token, so widening the extraction surface
     * does not widen the privilege surface.
     */
    public function hasBearerToken(): bool
    {
        return $this->getBearerToken() !== null;
    }

    /**
     * Get the API token from the request, preferring `Authorization: Bearer`
     * and falling back to `X-Api-Key`. See {@see hasBearerToken()} for the
     * rationale behind accepting both headers.
     */
    public function getBearerToken(): ?string
    {
        $authHeader = $this->getHeader('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = trim(substr($authHeader, 7));
            if ($token !== '') {
                return $token;
            }
        }

        $apiKeyHeader = $this->getHeader('X-Api-Key');
        if (is_string($apiKeyHeader)) {
            $apiKeyHeader = trim($apiKeyHeader);
            if ($apiKeyHeader !== '') {
                return $apiKeyHeader;
            }
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
     * Checks additional modules routes access rules
     * @param Micro $api
     *
     * @return bool
     */
    public function thisIsModuleNoAuthRequest(Micro $api): bool
    {
        // GHSA-343m-2899-5qh3: match against the routed path, not raw getURI(). Fail closed.
        $pattern = $this->getRoutedPath(true);
        if ($pattern === null) {
            return false;
        }
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
