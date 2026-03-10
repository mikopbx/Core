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

namespace MikoPBX\PBXCoreREST\Controllers\Auth;

use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\AuthManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Auth\DataStructure;
use MikoPBX\PBXCoreREST\Lib\Auth\JWTHelper;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameterRef,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for authentication and token management (v3 API)
 *
 * Implements JWT-based authentication with refresh tokens following modern security practices.
 * Provides Bearer token authentication for REST API clients and SPA applications.
 *
 * Architecture:
 * - Access Token (JWT): Short-lived (15 min), stored in memory, sent in Authorization header
 * - Refresh Token: Long-lived (30 days), stored in httpOnly cookie, used to get new access tokens
 * - Remember Me Token: Extended refresh token (30 days) with device tracking
 *
 * Security Features:
 * - httpOnly cookies prevent XSS attacks
 * - Secure flag ensures HTTPS-only transmission
 * - SameSite=Strict prevents CSRF attacks
 * - Token rotation on refresh
 * - Device tracking (IP, User-Agent)
 * - Automatic cleanup of expired tokens
 *
 * IMPORTANT: This controller handles auth requests directly in web context (NOT via backend worker queue).
 * Cookies can only be accessed/set in web context, not in CLI workers.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Auth
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749 - OAuth 2.0 Framework
 * @see https://datatracker.ietf.org/doc/html/rfc7519 - JSON Web Token (JWT)
 * @see https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
 */
#[ApiResource(
    path: '/pbxcore/api/v3/auth',    
    tags: ['Authentication'],
    description: 'rest_Auth_ApiDescription',
    processor: AuthManagementProcessor::class
)]
#[HttpMapping(
    mapping: [
        'GET' => ['validateToken'],
        'POST' => ['login', 'refresh', 'logout']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: [],
    customMethods: ['login', 'refresh', 'logout', 'validateToken']
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests (not used - methods handle directly)
     * @var string
     */
    protected string $processorClass = AuthManagementProcessor::class;

    /**
     * Override to handle cookie operations after worker response
     *
     * Auth endpoints need special handling because cookies can only be set in web context.
     * Worker returns cookie data in response, controller sets them.
     *
     * @param string $processor
     * @param string $actionName
     * @param mixed $payload
     * @param string $moduleName
     * @param int $maxTimeout
     * @param int $priority
     * @return void
     */
    public function sendRequestToBackendWorker(
        string $processor,
        string $actionName,
        mixed $payload = null,
        string $moduleName = '',
        int $maxTimeout = 30,
        int $priority = 0
    ): void {
        // Call parent to send request and get response
        parent::sendRequestToBackendWorker($processor, $actionName, $payload, $moduleName, $maxTimeout, $priority);

        // After parent sets response content, check if we need to handle cookies
        // Parent already set the response content, we just need to add cookies
        $responseContent = $this->response->getContent();

        // PHPStan: According to Phalcon\Http\Response::getContent() PHPDoc, content is always string
        // But runtime type check is safer for robustness
        if (!is_string($responseContent) || $responseContent === '') {
            return;
        }

        $responseData = json_decode($responseContent, true);
        if (!is_array($responseData)) {
            return;
        }

        // Handle cookie operations based on action
        if (!isset($responseData['data']['_cookieData']) || !is_array($responseData['data']['_cookieData'])) {
            return;
        }

        $cookieData = $responseData['data']['_cookieData'];

        // Determine if connection is secure (HTTPS)
        // For HTTP (localhost, LAN): secure=false allows cookies to work
        // For HTTPS: secure=true prevents cookie theft over insecure connections
        $isSecure = $this->request->isSecure();

        // Set refresh token cookie
        if (isset($cookieData['set_refreshToken']) && is_array($cookieData['set_refreshToken'])) {
            $tokenValue = $cookieData['set_refreshToken']['value'] ?? '';
            $tokenExpiry = isset($cookieData['set_refreshToken']['expiry'])
                ? (int)$cookieData['set_refreshToken']['expiry']
                : 0;

            $this->cookies->set(
                'refreshToken',                              // name
                $tokenValue,                                 // value
                $tokenExpiry,                                // expire
                '/',                                         // path
                $isSecure,                                   // secure (true for HTTPS, false for HTTP)
                '',                                          // domain (current domain, empty string for PHP 8.3 compatibility)
                true,                                        // httpOnly (no JS access)
                ['samesite' => 'Strict']                     // options (CSRF protection, cookie only sent in same-site context)
            );  // Cookie will be encrypted by CryptProvider (token is already hashed)
        }

        // Clear refresh token cookie
        if (isset($cookieData['clear_refreshToken']) && $cookieData['clear_refreshToken'] === true) {
            $this->cookies->set(
                'refreshToken',                              // name
                '',                                          // value (empty)
                time() - 3600,                               // expire (in the past)
                '/',                                         // path
                $isSecure,                                   // secure (match protocol)
                '',                                          // domain (current domain, empty string for PHP 8.4 compatibility)
                true,                                        // httpOnly
                ['samesite' => 'Strict']                     // options
            );  // Clear cookie
        }

        // CRITICAL: Send cookies to browser
        // Without this call, cookies won't be included in HTTP response headers
        $this->cookies->send();

        // Remove _cookieData from response (internal use only)
        unset($responseData['data']['_cookieData']);
        $encodedResponse = json_encode($responseData);
        if ($encodedResponse !== false) {
            $this->response->setContent($encodedResponse);
        }
    }


    /**
     * Override to handle methods that execute directly in controller
     *
     * Some auth methods execute directly without backend worker:
     * - validateToken: Internal validation (localhost only, no worker needed)
     *
     * Other methods need cookie injection before sending to worker:
     * - refresh/logout: Need refreshToken from httpOnly cookie
     *
     * @param string|null $idOrMethod Method name for collection-level custom methods
     * @param string|null $customMethod Not used for Auth (collection-level only)
     * @return void
     */
    public function handleCustomRequest(?string $idOrMethod = null, ?string $customMethod = null): void
    {
        $methodName = $idOrMethod; // For Auth, this is always the method name

        // validateToken executes directly in controller (no worker needed)
        if ($methodName === 'validateToken') {
            $this->validateToken();
            return;
        }

        // For refresh and logout, inject refreshToken from cookie and client info into request data
        if (in_array($methodName, ['refresh', 'logout'], true)) {
            // Validate processor class is set
            if (empty($this->processorClass)) {
                $this->sendErrorResponse('Processor class not configured', 500);
                return;
            }

            // Get request data using proper Request methods
            $requestData = self::sanitizeData($this->request->getData(), $this->filter);

            // Try to read and decrypt refresh token from cookie
            $refreshToken = null;

            if ($this->cookies->has('refreshToken')) {
                try {
                    // This will decrypt the cookie automatically using CryptProvider
                    $refreshToken = $this->cookies->get('refreshToken')->getValue();
                } catch (\Throwable $e) {
                    // Decryption failed - maybe cookie is corrupted or crypt key changed
                    // Try reading raw value from $_COOKIE as fallback
                    $refreshToken = $_COOKIE['refreshToken'] ?? null;
                }
            } elseif (isset($_COOKIE['refreshToken'])) {
                // Cookie exists in $_COOKIE but Phalcon doesn't see it
                // Use raw encrypted value
                $refreshToken = $_COOKIE['refreshToken'];
            }

            // Add refresh token to request data if available
            if ($refreshToken !== null) {
                $requestData['refreshToken'] = $refreshToken;
            }

            // Add client info for security tracking
            $requestData['clientIp'] = $this->request->getClientAddress(true);
            $requestData['userAgent'] = $this->request->getUserAgent();

            // Send directly to backend worker (bypass parent's handleCustomRequest)
            $this->sendRequestToBackendWorker(
                $this->processorClass,
                $methodName,
                $requestData
            );
            return;
        }

        // For other methods, use parent implementation
        parent::handleCustomRequest($idOrMethod, $customMethod);
    }

    /**
     * Authenticate user and return access token + refresh token
     *
     * Supports two authentication methods:
     * 1. Password authentication (login + password)
     * 2. Passkey authentication (sessionToken from WebAuthn)
     *
     * Returns:
     * - accessToken: JWT token (15 min), send in Authorization: Bearer header
     * - refreshToken: httpOnly cookie (30 days), automatically sent by browser
     * - expiresIn: seconds until accessToken expires
     * - tokenType: "Bearer"
     *
     * @route POST /pbxcore/api/v3/auth:login
     */
    #[ResourceSecurity('auth_login', requirements: [SecurityType::PUBLIC])]
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'loginResponse'
    )]
    #[ApiOperation(
        summary: 'rest_auth_Login',
        description: 'rest_auth_LoginDesc',
        operationId: 'authLogin'
    )]
    #[ApiParameterRef('login')]
    #[ApiParameterRef('password')]
    #[ApiParameterRef('sessionToken')]
    #[ApiParameterRef('rememberMe')]
    #[ApiResponse(200, 'rest_response_200_auth_login')]
    #[ApiResponse(401, 'rest_response_401_invalid_credentials', 'PBXApiResult')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(429, 'rest_response_429_too_many_requests', 'PBXApiResult')]
    public function login(): void
    {
        // Get request data
        $data = self::sanitizeData($this->request->getPost(), $this->filter);

        // Add client information to request data
        $data['clientIp'] = $this->request->getClientAddress(true);
        $data['userAgent'] = $this->request->getUserAgent();

        // Send to backend worker
        $this->sendRequestToBackendWorker(
            AuthManagementProcessor::class,
            'login',
            $data
        );
    }

    /**
     * Refresh access token using refresh token cookie
     *
     * Uses the httpOnly refresh token cookie to generate a new access token.
     * This endpoint is called automatically by TokenManager after page reload
     * or when the access token is about to expire (silent refresh).
     *
     * Returns:
     * - accessToken: New JWT token (15 min)
     * - refreshToken: New httpOnly cookie (30 days) - token rotation
     * - expiresIn: seconds until accessToken expires
     * - tokenType: "Bearer"
     *
     * @route POST /pbxcore/api/v3/auth:refresh
     */
    #[ResourceSecurity('auth_refresh', requirements: [SecurityType::PUBLIC])]
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'loginResponse'
    )]
    #[ApiOperation(
        summary: 'rest_auth_Refresh',
        description: 'rest_auth_RefreshDesc',
        operationId: 'authRefresh'
    )]
    #[ApiResponse(200, 'rest_response_200_auth_refresh')]
    #[ApiResponse(401, 'rest_response_401_invalid_refresh_token', 'PBXApiResult')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    public function refresh(): void
    {
        // Note: refreshToken cookie is injected by handleCustomRequest()
        // No additional data needed - handled by parent's handleCustomRequest
    }

    /**
     * Logout - invalidate refresh token and clear cookie
     *
     * Invalidates the current refresh token in database and clears the httpOnly cookie.
     * The client should also clear the access token from memory.
     *
     * @route POST /pbxcore/api/v3/auth:logout
     */
    #[ResourceSecurity('auth_logout', requirements: [SecurityType::BEARER_TOKEN])]
    #[ApiOperation(
        summary: 'rest_auth_Logout',
        description: 'rest_auth_LogoutDesc',
        operationId: 'authLogout'
    )]
    #[ApiResponse(200, 'rest_response_200_auth_logout')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    public function logout(): void
    {
        // Note: refreshToken cookie is injected by handleCustomRequest()
        // Authorization Bearer token is handled by AuthenticationMiddleware
        // No additional data needed
    }

    /**
     * Internal endpoint for JWT token validation by Nginx/Lua
     *
     * SECURITY: This endpoint is only accessible from localhost (127.0.0.1)
     * Used by Nginx Lua scripts (unified-security.lua, access-nchan.lua) via ngx.location.capture()
     *
     * Called by Lua: ngx.location.capture("/pbxcore/api/v3/auth:validate-token?token=xxx")
     * via custom nginx location with internal directive and REMOTE_ADDR override
     *
     * @route GET /pbxcore/api/v3/auth:validate-token
     * @internal This method is called internally by Nginx only
     */
    #[ResourceSecurity('auth_validate_token', requirements: [SecurityType::PUBLIC])]
    #[ApiOperation(
        summary: 'Validate JWT token (internal)',
        description: 'Internal endpoint for JWT token validation by Nginx/Lua. Only accessible from localhost.',
        operationId: 'authValidateToken',
        internal: true
    )]
    #[ApiParameterRef('token', required: true)]
    #[ApiResponse(200, 'Token is valid')]
    #[ApiResponse(403, 'Token is invalid or endpoint accessed from non-localhost')]
    public function validateToken(): void
    {
        SystemMessages::sysLogMsg(__METHOD__, "validateToken called - REMOTE_ADDR: " . $this->request->getClientAddress(), LOG_DEBUG);

        // SECURITY: Only allow localhost requests
        // nginx location sets REMOTE_ADDR=127.0.0.1 for internal calls
        if (!$this->request->isLocalHostRequest()) {
            SystemMessages::sysLogMsg(__METHOD__, "validateToken rejected - not localhost", LOG_WARNING);
            $this->response->setStatusCode(403, 'Forbidden');
            $this->response->setJsonContent([
                'error' => 'This endpoint is only accessible from localhost'
            ]);
            return;
        }

        // Get token from query string
        $token = $this->request->getQuery('token', 'string', '');

        if (empty($token)) {
            SystemMessages::sysLogMsg(__METHOD__, "validateToken rejected - no token", LOG_WARNING);
            $this->response->setStatusCode(403, 'Forbidden');
            $this->response->setJsonContent([
                'error' => 'Token parameter is required'
            ]);
            return;
        }

        // Validate JWT token
        $payload = JWTHelper::validate($token);

        if ($payload === null) {
            SystemMessages::sysLogMsg(__METHOD__, "validateToken rejected - invalid JWT", LOG_WARNING);
            $this->response->setStatusCode(403, 'Forbidden');
            $this->response->setJsonContent([
                'error' => 'Invalid or expired token'
            ]);
            return;
        }

        // Token is valid - return 200 OK with minimal response
        SystemMessages::sysLogMsg(__METHOD__, "validateToken success - userId: " . ($payload['userId'] ?? 'unknown'), LOG_DEBUG);
        $this->response->setStatusCode(200, 'OK');
        $this->response->setJsonContent([
            'jsonapi' => ['version' => '1.0'],
            'meta' => [
                'timestamp' => date('c'),
                'hash' => hash('sha256', $token)
            ]
        ]);
    }

}
