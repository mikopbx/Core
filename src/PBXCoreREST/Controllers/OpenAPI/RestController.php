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

namespace MikoPBX\PBXCoreREST\Controllers\OpenAPI;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Services\ApiMetadataRegistry;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiResponse,
    ResourceSecurity,
    ActionType,
    SecurityType
};
use Phalcon\Http\Response;

/**
 * OpenAPI specification and documentation controller
 *
 * Provides endpoints for retrieving OpenAPI specification and serving
 * API documentation interfaces like Swagger UI.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\OpenAPI
 */
#[ApiResource(
    path: '/pbxcore/api/v3/openapi',
    tags: ['OpenAPI'],
    description: 'OpenAPI specification and documentation endpoints'
)]
#[ResourceSecurity('openapi', requirements: [SecurityType::PUBLIC])]
class RestController extends BaseController
{
    /**
     * List of API controller classes to scan for metadata
     */
    private const API_CONTROLLERS = [
        \MikoPBX\PBXCoreREST\Controllers\ApiKeys\RestController::class,
        \MikoPBX\PBXCoreREST\Controllers\AsteriskManagers\RestController::class,
        \MikoPBX\PBXCoreREST\Controllers\CallQueues\RestController::class,
        \MikoPBX\PBXCoreREST\Controllers\MailSettings\RestController::class,
        \MikoPBX\PBXCoreREST\Controllers\MailSettings\OAuth2CallbackController::class,
        // Add more controllers as they are migrated to attributes
    ];

    /**
     * Get OpenAPI specification in JSON format
     */
    #[ApiOperation(
        summary: 'Get OpenAPI specification',
        description: 'Returns the complete OpenAPI 3.1 specification for MikoPBX REST API in JSON format'
    )]
    #[ApiParameter('format', 'string', 'Output format', enum: ['json', 'yaml'], default: 'json')]
    #[ApiResponse(200, 'OpenAPI specification retrieved successfully')]
    #[ApiResponse(500, 'Failed to generate specification', 'ErrorResponse')]
    public function getSpecificationAction(): Response
    {
        try {
            $format = $this->request->getQuery('format', 'string', 'json');

            // Get metadata registry from DI container
            $registry = $this->getDI()->getShared('apiMetadataRegistry');
            if (!$registry instanceof ApiMetadataRegistry) {
                $registry = new ApiMetadataRegistry();
            }

            // Scan controllers for metadata
            $metadata = $registry->scanControllers(self::API_CONTROLLERS);

            // Generate OpenAPI specification
            $openapi = $registry->generateOpenAPISpec($metadata);

            // Set appropriate content type and return response
            if ($format === 'yaml') {
                $this->response->setContentType('application/x-yaml');
                $content = yaml_emit($openapi);
            } else {
                $this->response->setContentType('application/json');
                $content = json_encode($openapi, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            }

            $this->response->setContent($content);

            // Add cache headers for performance
            $this->response->setHeader('Cache-Control', 'public, max-age=3600');
            $this->response->setHeader('ETag', md5($content));

            return $this->response;

        } catch (\Exception $e) {
            $this->response->setStatusCode(500, 'Internal Server Error');
            $this->response->setJsonContent([
                'error' => 'Failed to generate OpenAPI specification',
                'message' => $e->getMessage()
            ]);
            return $this->response;
        }
    }

    /**
     * Serve Swagger UI for API documentation
     */
    #[ApiOperation(
        summary: 'Swagger UI documentation interface',
        description: 'Serves the Swagger UI interface for interactive API documentation and testing'
    )]
    #[ApiResponse(200, 'Swagger UI HTML page')]
    public function docsAction(): Response
    {
        $specUrl = '/pbxcore/api/v3/openapi/specification';

        $swaggerHtml = $this->generateSwaggerUI($specUrl);

        $this->response->setContentType('text/html');
        $this->response->setContent($swaggerHtml);

        return $this->response;
    }

    /**
     * Get ACL rules extracted from API metadata
     */
    #[ApiOperation(
        summary: 'Get API ACL rules',
        description: 'Returns ACL rules extracted from API attributes for integration with MikoPBX ACL system'
    )]
    #[ResourceSecurity('openapi', ActionType::READ, [SecurityType::PUBLIC])]
    #[ApiResponse(200, 'ACL rules retrieved successfully')]
    #[ApiResponse(403, 'Admin access required', 'ErrorResponse')]
    public function getAclRulesAction(): Response
    {
        // Debug: Log that we got here
        error_log("DEBUG: getAclRulesAction called");

        try {
            // Get metadata registry
            $registry = $this->getDI()->getShared('apiMetadataRegistry');
            if (!$registry instanceof ApiMetadataRegistry) {
                $registry = new ApiMetadataRegistry();
            }

            error_log("DEBUG: Registry created, scanning controllers");

            // Scan controllers and extract ACL rules
            $metadata = $registry->scanControllers(self::API_CONTROLLERS);
            $aclRules = $registry->extractACLRules($metadata);

            error_log("DEBUG: ACL rules extracted: " . json_encode($aclRules));

            $this->response->setJsonContent([
                'result' => true,
                'data' => $aclRules,
                'timestamp' => time()
            ]);

            return $this->response;

        } catch (\Exception $e) {
            error_log("DEBUG: Exception in getAclRulesAction: " . $e->getMessage());
            $this->response->setStatusCode(500, 'Internal Server Error');
            $this->response->setJsonContent([
                'result' => false,
                'error' => 'Failed to extract ACL rules',
                'message' => $e->getMessage()
            ]);
            return $this->response;
        }
    }

    /**
     * Get validation schemas for API endpoints
     */
    #[ApiOperation(
        summary: 'Get API validation schemas',
        description: 'Returns validation schemas extracted from API attributes for request validation'
    )]
    #[ResourceSecurity('openapi', ActionType::READ, [SecurityType::SESSION])]
    #[ApiResponse(200, 'Validation schemas retrieved successfully')]
    #[ApiResponse(403, 'Admin access required', 'ErrorResponse')]
    public function getValidationSchemasAction(): Response
    {
        try {
            // Get metadata registry
            $registry = $this->getDI()->getShared('apiMetadataRegistry');
            if (!$registry instanceof ApiMetadataRegistry) {
                $registry = new ApiMetadataRegistry();
            }

            // Scan controllers and extract validation schemas
            $metadata = $registry->scanControllers(self::API_CONTROLLERS);
            $schemas = $registry->getValidationSchemas($metadata);

            $this->response->setJsonContent([
                'result' => true,
                'data' => $schemas,
                'timestamp' => time()
            ]);

            return $this->response;

        } catch (\Exception $e) {
            $this->response->setStatusCode(500, 'Internal Server Error');
            $this->response->setJsonContent([
                'result' => false,
                'error' => 'Failed to extract validation schemas',
                'message' => $e->getMessage()
            ]);
            return $this->response;
        }
    }

    /**
     * Clear metadata cache
     */
    #[ApiOperation(
        summary: 'Clear API metadata cache',
        description: 'Clears the cached API metadata to force re-scanning of controllers'
    )]
    #[ResourceSecurity('openapi', ActionType::WRITE, [SecurityType::SESSION])]
    #[ApiResponse(200, 'Cache cleared successfully')]
    #[ApiResponse(403, 'Admin access required', 'ErrorResponse')]
    public function clearCacheAction(): Response
    {
        try {
            // Get metadata registry
            $registry = $this->getDI()->getShared('apiMetadataRegistry');
            if (!$registry instanceof ApiMetadataRegistry) {
                $registry = new ApiMetadataRegistry();
            }

            $registry->clearCache();

            $this->response->setJsonContent([
                'result' => true,
                'message' => 'API metadata cache cleared successfully'
            ]);

            return $this->response;

        } catch (\Exception $e) {
            $this->response->setStatusCode(500, 'Internal Server Error');
            $this->response->setJsonContent([
                'result' => false,
                'error' => 'Failed to clear cache',
                'message' => $e->getMessage()
            ]);
            return $this->response;
        }
    }

    /**
     * Generate Swagger UI HTML
     *
     * @param string $specUrl URL to the OpenAPI specification
     * @return string HTML content for Swagger UI
     */
    private function generateSwaggerUI(string $specUrl): string
    {
        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>MikoPBX API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.9.0/favicon-32x32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5.9.0/favicon-16x16.png" sizes="16x16" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
        .swagger-ui .topbar {
            background-color: #2c3e50;
        }
        .swagger-ui .topbar .download-url-wrapper {
            display: none;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>

    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '{$specUrl}',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                tryItOutEnabled: true,
                requestInterceptor: function(request) {
                    // Add session handling if needed
                    return request;
                },
                responseInterceptor: function(response) {
                    return response;
                }
            });
        };
    </script>
</body>
</html>
HTML;
    }
}