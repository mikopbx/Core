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

namespace MikoPBX\PBXCoreREST\Services;

use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiResponse,
    ApiSecurity,
    HttpMapping,
    ResourceSecurity,
    ActionType
};
use Phalcon\Di\Injectable;
use ReflectionClass;
use ReflectionMethod;
use ReflectionException;

/**
 * Service for collecting and processing API metadata from PHP 8 Attributes
 *
 * This service scans REST controllers for API attributes and generates
 * OpenAPI specifications, ACL rules, validation schemas, and other metadata
 * for automatic API documentation and configuration.
 *
 * @package MikoPBX\PBXCoreREST\Services
 */
class ApiMetadataRegistry extends Injectable
{
    /**
     * Cached metadata to avoid repeated reflection operations
     *
     * @var array<string, mixed>
     */
    private array $metadataCache = [];


    /**
     * Scan a list of controller classes for API metadata
     *
     * @param array<string> $controllerClasses List of controller class names
     * @return array<string, mixed> Collected metadata from all controllers
     * @throws ReflectionException
     */
    public function scanControllers(array $controllerClasses): array
    {
        $metadata = [
            'resources' => [],
            'paths' => [],
            'schemas' => [],
            'security' => [],
            'acl' => []
        ];

        foreach ($controllerClasses as $controllerClass) {
            if (class_exists($controllerClass)) {
                $controllerMetadata = $this->scanController($controllerClass);
                $metadata = $this->mergeMetadata($metadata, $controllerMetadata);
            }
        }

        return $metadata;
    }

    /**
     * Scan a single controller class for API metadata
     *
     * @param class-string $controllerClass Controller class name
     * @return array<string, mixed> Controller metadata
     * @throws ReflectionException
     */
    public function scanController(string $controllerClass): array
    {
        // Check cache first
        if (isset($this->metadataCache[$controllerClass])) {
            return $this->metadataCache[$controllerClass];
        }

        $reflection = new ReflectionClass($controllerClass);
        $metadata = [
            'class' => $controllerClass,
            'resource' => null,
            'security' => [],
            'operations' => [],
            'acl' => []
        ];

        // Scan class-level attributes
        $metadata = $this->scanClassAttributes($reflection, $metadata);

        // Scan method-level attributes
        $metadata = $this->scanMethodAttributes($reflection, $metadata);

        // Cache the result
        $this->metadataCache[$controllerClass] = $metadata;

        return $metadata;
    }

    /**
     * Scan class-level attributes
     *
     * @param ReflectionClass<object> $reflection
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    private function scanClassAttributes(ReflectionClass $reflection, array $metadata): array
    {
        // Scan for ApiResource attribute
        $resourceAttributes = $reflection->getAttributes(ApiResource::class);
        if (!empty($resourceAttributes)) {
            $resource = $resourceAttributes[0]->newInstance();
            $metadata['resource'] = [
                'path' => $resource->path,
                'tags' => $resource->tags,
                'description' => $resource->description,
                'processor' => $resource->processor,
                'schemas' => $resource->schemas,
                'deprecated' => $resource->deprecated,
                'version' => $resource->version,
                'extensions' => $resource->extensions
            ];
        }

        // Scan for ApiSecurity attributes
        $securityAttributes = $reflection->getAttributes(ApiSecurity::class);
        foreach ($securityAttributes as $attribute) {
            $security = $attribute->newInstance();
            $metadata['security'][] = $security->getAclRules();
        }

        // Scan for ResourceSecurity attributes (new system)
        $resourceSecurityAttributes = $reflection->getAttributes(ResourceSecurity::class);
        foreach ($resourceSecurityAttributes as $attribute) {
            /** @var ResourceSecurity $resourceSecurity */
            $resourceSecurity = $attribute->newInstance();
            $metadata['security'][] = $resourceSecurity->getAclRules();

            // If no ApiResource was found, create a resource from ResourceSecurity
            if (empty($metadata['resource'])) {
                $metadata['resource'] = [
                    'path' => "/{$resourceSecurity->resource}",
                    'tags' => [ucfirst(str_replace('_', ' ', $resourceSecurity->resource))],
                    'description' => $resourceSecurity->description ?: "Operations for {$resourceSecurity->resource}",
                    'processor' => null,
                    'schemas' => [],
                    'deprecated' => false,
                    'version' => '3.0.0',
                    'extensions' => $resourceSecurity->extensions
                ];
            }
        }

        // Scan for HttpMapping attributes
        $httpMappingAttributes = $reflection->getAttributes(HttpMapping::class);
        if (!empty($httpMappingAttributes)) {
            $httpMapping = $httpMappingAttributes[0]->newInstance();
            $metadata['httpMapping'] = $httpMapping->getOpenApiMapping();
        }

        return $metadata;
    }

    /**
     * Scan method-level attributes
     *
     * @param ReflectionClass<object> $reflection
     * @param array<string, mixed> $metadata
     * @return array<string, mixed>
     */
    private function scanMethodAttributes(ReflectionClass $reflection, array $metadata): array
    {
        $methods = $reflection->getMethods(ReflectionMethod::IS_PUBLIC);

        foreach ($methods as $method) {
            $methodMetadata = [
                'name' => $method->getName(),
                'operations' => [],
                'parameters' => [],
                'responses' => [],
                'security' => [],
                'acl' => []
            ];

            // Scan for ApiOperation attributes
            $operationAttributes = $method->getAttributes(ApiOperation::class);
            foreach ($operationAttributes as $attribute) {
                $operation = $attribute->newInstance();
                $methodMetadata['operations'][] = [
                    'summary' => $operation->summary,
                    'description' => $operation->description,
                    'operationId' => $operation->operationId,
                    'tags' => $operation->tags,
                    'deprecated' => $operation->deprecated,
                    'extensions' => $operation->extensions,
                    'acl' => $operation->acl,
                    'requiresId' => $operation->requiresId
                ];
            }

            // Scan for ApiParameter attributes
            $parameterAttributes = $method->getAttributes(ApiParameter::class);
            foreach ($parameterAttributes as $attribute) {
                $parameter = $attribute->newInstance();
                $methodMetadata['parameters'][] = [
                    'name' => $parameter->name,
                    'type' => $parameter->type,
                    'description' => $parameter->description,
                    'in' => $parameter->in->value,
                    'required' => $parameter->required,
                    'default' => $parameter->default,
                    'example' => $parameter->example,
                    'enum' => $parameter->enum,
                    'format' => $parameter->format,
                    'minimum' => $parameter->minimum,
                    'maximum' => $parameter->maximum,
                    'minLength' => $parameter->minLength,
                    'maxLength' => $parameter->maxLength,
                    'pattern' => $parameter->pattern,
                    'deprecated' => $parameter->deprecated,
                    'validationRules' => $parameter->getValidationRules()
                ];
            }

            // Scan for ApiResponse attributes
            $responseAttributes = $method->getAttributes(ApiResponse::class);
            foreach ($responseAttributes as $attribute) {
                $response = $attribute->newInstance();
                $methodMetadata['responses'][] = [
                    'statusCode' => $response->statusCode,
                    'description' => $response->description,
                    'schema' => $response->schema,
                    'content' => $response->content,
                    'headers' => $response->headers,
                    'example' => $response->example,
                    'examples' => $response->examples,
                    'extensions' => $response->extensions
                ];
            }

            // Scan for ApiSecurity attributes
            $securityAttributes = $method->getAttributes(ApiSecurity::class);
            foreach ($securityAttributes as $attribute) {
                $security = $attribute->newInstance();
                $methodMetadata['security'][] = $security->getAclRules();
            }

            // Scan for ResourceSecurity attributes (new system)
            $resourceSecurityAttributes = $method->getAttributes(ResourceSecurity::class);
            foreach ($resourceSecurityAttributes as $attribute) {
                /** @var ResourceSecurity $resourceSecurity */
                $resourceSecurity = $attribute->newInstance();
                $methodMetadata['security'][] = $resourceSecurity->getAclRules();

                // Generate operation info from ResourceSecurity
                if (empty($methodMetadata['operations'])) {
                    $actionName = $resourceSecurity->action ? $resourceSecurity->action->value : 'operation';
                    $methodName = $method->getName();

                    $methodMetadata['operations'][] = [
                        'summary' => $this->generateSummaryFromMethod($methodName, $resourceSecurity),
                        'description' => $resourceSecurity->description ?: $this->generateDescriptionFromMethod($methodName, $resourceSecurity),
                        'operationId' => $methodName,
                        'tags' => [ucfirst(str_replace('_', ' ', $resourceSecurity->resource))],
                        'deprecated' => false,
                        'extensions' => $resourceSecurity->extensions,
                        'acl' => $resourceSecurity->getAclRules(),
                        'requiresId' => false
                    ];
                }
            }

            // Only add method metadata if it has API attributes
            if (!empty($methodMetadata['operations']) ||
                !empty($methodMetadata['parameters']) ||
                !empty($methodMetadata['responses']) ||
                !empty($methodMetadata['security'])) {
                $metadata['operations'][$method->getName()] = $methodMetadata;
            }
        }

        return $metadata;
    }

    /**
     * Generate OpenAPI 3.1 specification from scanned metadata
     *
     * @param array<string, mixed> $metadata Scanned metadata
     * @return array<string, mixed> OpenAPI specification
     */
    public function generateOpenAPISpec(array $metadata = []): array
    {
        if (empty($metadata)) {
            $metadata = $this->getAllMetadata();
        }

        $openapi = [
            'openapi' => '3.1.0',
            'info' => [
                'title' => 'MikoPBX REST API',
                'description' => 'Comprehensive REST API for MikoPBX management and configuration',
                'version' => '3.0.0',
                'contact' => [
                    'name' => 'MikoPBX Support',
                    'url' => 'https://mikopbx.com',
                    'email' => 'support@mikopbx.com'
                ],
                'license' => [
                    'name' => 'GPL-3.0',
                    'url' => 'https://www.gnu.org/licenses/gpl-3.0.html'
                ]
            ],
            'servers' => [
                [
                    'url' => '/pbxcore/api/v3',
                    'description' => 'MikoPBX API v3'
                ]
            ],
            'paths' => [],
            'components' => [
                'schemas' => $this->generateSchemas(),
                'securitySchemes' => $this->generateSecuritySchemes()
            ],
            'security' => [
                ['sessionAuth' => []]
            ],
            'tags' => $this->generateTags($metadata)
        ];

        // Generate paths from metadata
        foreach ($metadata['resources'] ?? [] as $resource) {
            $paths = $this->generatePathsFromResource($resource);
            $openapi['paths'] = array_merge($openapi['paths'], $paths);
        }

        return $openapi;
    }

    /**
     * Extract ACL rules from scanned metadata
     *
     * @param array<string, mixed> $metadata Scanned metadata
     * @return array<string, mixed> ACL rules
     */
    public function extractACLRules(array $metadata = []): array
    {
        if (empty($metadata)) {
            $metadata = $this->getAllMetadata();
        }

        $aclRules = [
            'resources' => [],
            'operations' => [],
            'permissions' => []
        ];

        foreach ($metadata['resources'] ?? [] as $resource) {
            // Extract resource-level ACL
            if (!empty($resource['security'])) {
                $aclRules['resources'][$resource['path']] = $resource['security'];
            }

            // Extract operation-level ACL
            foreach ($resource['operations'] ?? [] as $operation) {
                if (!empty($operation['security']) || !empty($operation['acl'])) {
                    $operationKey = $resource['path'] . ':' . $operation['name'];
                    $aclRules['operations'][$operationKey] = [
                        'security' => $operation['security'] ?? [],
                        'acl' => $operation['acl'] ?? [],
                        'requiresId' => $operation['requiresId'] ?? false
                    ];
                }
            }
        }

        return $aclRules;
    }

    /**
     * Get validation schemas from scanned metadata
     *
     * @param array<string, mixed> $metadata Scanned metadata
     * @return array<string, mixed> Validation schemas
     */
    public function getValidationSchemas(array $metadata = []): array
    {
        if (empty($metadata)) {
            $metadata = $this->getAllMetadata();
        }

        $schemas = [];

        foreach ($metadata['resources'] ?? [] as $resource) {
            $resourcePath = $resource['path'];

            foreach ($resource['operations'] ?? [] as $operation) {
                $operationKey = $resourcePath . ':' . $operation['name'];
                $schemas[$operationKey] = [
                    'parameters' => []
                ];

                foreach ($operation['parameters'] ?? [] as $parameter) {
                    $schemas[$operationKey]['parameters'][$parameter['name']] = [
                        'type' => $parameter['type'],
                        'required' => $parameter['required'],
                        'validation' => $parameter['validationRules'] ?? [],
                        'default' => $parameter['default'],
                        'enum' => $parameter['enum']
                    ];
                }
            }
        }

        return $schemas;
    }

    /**
     * Get all collected metadata
     *
     * @return array<string, mixed> All metadata
     */
    public function getAllMetadata(): array
    {
        return $this->metadataCache;
    }

    /**
     * Clear metadata cache
     */
    public function clearCache(): void
    {
        $this->metadataCache = [];
    }

    /**
     * Merge two metadata arrays
     *
     * @param array<string, mixed> $target Target metadata
     * @param array<string, mixed> $source Source metadata
     * @return array<string, mixed> Merged metadata
     */
    private function mergeMetadata(array $target, array $source): array
    {
        if (!empty($source['resource'])) {
            $target['resources'][] = $source;
        }

        return $target;
    }

    /**
     * Generate standard schemas for OpenAPI
     *
     * @return array<string, mixed> Schemas
     */
    private function generateSchemas(): array
    {
        return [
            'ErrorResponse' => [
                'type' => 'object',
                'properties' => [
                    'result' => ['type' => 'boolean', 'example' => false],
                    'messages' => [
                        'type' => 'object',
                        'properties' => [
                            'error' => [
                                'type' => 'array',
                                'items' => ['type' => 'string']
                            ]
                        ]
                    ],
                    'processor' => ['type' => 'string'],
                    'function' => ['type' => 'string'],
                    'pid' => ['type' => 'integer']
                ]
            ],
            'SuccessResponse' => [
                'type' => 'object',
                'properties' => [
                    'result' => ['type' => 'boolean', 'example' => true],
                    'data' => ['type' => 'object'],
                    'messages' => ['type' => 'object'],
                    'processor' => ['type' => 'string'],
                    'function' => ['type' => 'string'],
                    'pid' => ['type' => 'integer']
                ]
            ]
        ];
    }

    /**
     * Generate security schemes for OpenAPI
     *
     * @return array<string, mixed> Security schemes
     */
    private function generateSecuritySchemes(): array
    {
        return [
            'sessionAuth' => [
                'type' => 'apiKey',
                'in' => 'cookie',
                'name' => 'PHPSESSID',
                'description' => 'Session-based authentication using PHP session cookie'
            ],
            'apiKeyAuth' => [
                'type' => 'apiKey',
                'in' => 'header',
                'name' => 'X-API-Key',
                'description' => 'API key authentication'
            ]
        ];
    }

    /**
     * Generate tags from metadata
     *
     * @param array<string, mixed> $metadata
     * @return array<int, array<string, mixed>> Tags
     */
    private function generateTags(array $metadata): array
    {
        $tags = [];
        foreach ($metadata['resources'] ?? [] as $resource) {
            foreach ($resource['resource']['tags'] ?? [] as $tag) {
                if (!in_array($tag, array_column($tags, 'name'))) {
                    $tags[] = [
                        'name' => $tag,
                        'description' => "Operations for {$tag}"
                    ];
                }
            }
        }
        return $tags;
    }

    /**
     * Generate paths from resource metadata
     *
     * @param array<string, mixed> $resource Resource metadata
     * @return array<string, mixed> Paths
     */
    private function generatePathsFromResource(array $resource): array
    {
        $paths = [];
        $basePath = $resource['resource']['path'] ?? '';
        $httpMapping = $resource['httpMapping'] ?? [];

        if (empty($basePath) || empty($httpMapping)) {
            return [];
        }

        // Generate collection-level paths (without {id})
        $collectionPath = $basePath;
        $paths[$collectionPath] = [];

        // Generate resource-level paths (with {id})
        $resourcePath = $basePath . '/{id}';
        $paths[$resourcePath] = [];

        // Process each operation
        foreach ($resource['operations'] ?? [] as $operationName => $operation) {
            $operationData = $operation['operations'][0] ?? [];
            $parameters = $operation['parameters'] ?? [];
            $responses = $operation['responses'] ?? [];

            // Determine which HTTP methods this operation supports
            foreach ($httpMapping['mapping'] ?? [] as $httpMethod => $operations) {
                $ops = is_string($operations) ? [$operations] : $operations;

                if (in_array($operationName, $ops) || $this->isOperationInMethod($operationName, $ops)) {
                    $method = strtolower($httpMethod);

                    // Determine if this operation requires ID
                    $requiresId = in_array($operationName, $httpMapping['resourceLevel'] ?? []) ||
                                  $this->operationRequiresId($operationName);

                    $targetPath = $requiresId ? $resourcePath : $collectionPath;

                    $paths[$targetPath][$method] = [
                        'summary' => $operationData['summary'] ?? '',
                        'description' => $operationData['description'] ?? '',
                        'operationId' => $operationData['operationId'] ?? $operationName,
                        'tags' => $resource['resource']['tags'] ?? [],
                        'parameters' => $this->generateParametersForOperation($parameters, $requiresId),
                        'responses' => $this->generateResponsesForOperation($responses),
                        'security' => $this->generateSecurityForOperation($resource['security'] ?? [])
                    ];

                    // Add request body for POST/PUT/PATCH
                    if (in_array($method, ['post', 'put', 'patch'])) {
                        $bodyParameters = array_filter($parameters, function($param) {
                            return ($param['in'] ?? '') === 'query' && !in_array($param['name'], ['limit', 'offset', 'search', 'order', 'orderWay']);
                        });

                        if (!empty($bodyParameters)) {
                            $paths[$targetPath][$method]['requestBody'] = $this->generateRequestBody($bodyParameters);
                        }
                    }
                }
            }
        }

        // Handle custom methods
        foreach ($httpMapping['custom'] ?? [] as $customMethod) {
            if (isset($resource['operations'][$customMethod])) {
                $operation = $resource['operations'][$customMethod];
                $operationData = $operation['operations'][0] ?? [];
                $parameters = $operation['parameters'] ?? [];
                $responses = $operation['responses'] ?? [];

                // Custom methods use special syntax: /path:method or /path/{id}:method
                $isResourceLevel = in_array($customMethod, $httpMapping['resourceLevel'] ?? []);
                $customPath = $isResourceLevel ?
                    $basePath . '/{id}:' . $customMethod :
                    $basePath . ':' . $customMethod;

                $paths[$customPath] = [
                    'get' => [
                        'summary' => $operationData['summary'] ?? '',
                        'description' => $operationData['description'] ?? '',
                        'operationId' => $operationData['operationId'] ?? $customMethod,
                        'tags' => $resource['resource']['tags'] ?? [],
                        'parameters' => $this->generateParametersForOperation($parameters, $isResourceLevel),
                        'responses' => $this->generateResponsesForOperation($responses),
                        'security' => $this->generateSecurityForOperation($resource['security'] ?? [])
                    ]
                ];
            }
        }

        return $paths;
    }

    /**
     * Check if operation name matches any in the operations list
     */
    private function isOperationInMethod(string $operationName, array $operations): bool
    {
        // Handle method name mapping
        $methodMapping = [
            'getList' => ['getList'],
            'getRecord' => ['getRecord'],
            'create' => ['create'],
            'update' => ['update'],
            'patch' => ['patch'],
            'delete' => ['delete']
        ];

        foreach ($operations as $op) {
            if ($op === $operationName || in_array($operationName, $methodMapping[$op] ?? [])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if operation requires ID parameter
     */
    private function operationRequiresId(string $operation): bool
    {
        $resourceOperations = ['getRecord', 'update', 'patch', 'delete', 'copy'];
        return in_array($operation, $resourceOperations);
    }

    /**
     * Generate parameters for OpenAPI operation
     */
    private function generateParametersForOperation(array $parameters, bool $includeId = false): array
    {
        $openApiParams = [];

        foreach ($parameters as $param) {
            if ($param['name'] === 'id' && !$includeId) {
                continue;
            }

            $openApiParam = [
                'name' => $param['name'],
                'in' => $param['in'],
                'description' => $param['description'],
                'required' => $param['required'] ?? false,
                'schema' => [
                    'type' => $param['type']
                ]
            ];

            // Add constraints
            if (!empty($param['enum'])) {
                $openApiParam['schema']['enum'] = $param['enum'];
            }
            if ($param['minimum'] !== null) {
                $openApiParam['schema']['minimum'] = $param['minimum'];
            }
            if ($param['maximum'] !== null) {
                $openApiParam['schema']['maximum'] = $param['maximum'];
            }
            if (!empty($param['pattern'])) {
                $openApiParam['schema']['pattern'] = $param['pattern'];
            }
            if ($param['example'] !== null) {
                $openApiParam['example'] = $param['example'];
            }

            $openApiParams[] = $openApiParam;
        }

        return $openApiParams;
    }

    /**
     * Generate responses for OpenAPI operation
     */
    private function generateResponsesForOperation(array $responses): array
    {
        $openApiResponses = [];

        foreach ($responses as $response) {
            $statusCode = (string)$response['statusCode'];
            $openApiResponses[$statusCode] = [
                'description' => $response['description']
            ];

            if (!empty($response['example'])) {
                $openApiResponses[$statusCode]['content'] = [
                    'application/json' => [
                        'example' => json_decode($response['example'], true)
                    ]
                ];
            }
        }

        return $openApiResponses;
    }

    /**
     * Generate security for OpenAPI operation
     */
    private function generateSecurityForOperation(array $security): array
    {
        $openApiSecurity = [];

        foreach ($security as $securityRule) {
            if (in_array('session', $securityRule['requirements'] ?? [])) {
                $openApiSecurity[] = ['sessionAuth' => $securityRule['permissions'] ?? []];
            }
        }

        return $openApiSecurity;
    }

    /**
     * Generate request body for OpenAPI operation
     */
    private function generateRequestBody(array $parameters): array
    {
        $properties = [];
        $required = [];

        foreach ($parameters as $param) {
            $properties[$param['name']] = [
                'type' => $param['type'],
                'description' => $param['description']
            ];

            if (!empty($param['enum'])) {
                $properties[$param['name']]['enum'] = $param['enum'];
            }
            if ($param['example'] !== null) {
                $properties[$param['name']]['example'] = $param['example'];
            }

            if ($param['required'] ?? false) {
                $required[] = $param['name'];
            }
        }

        return [
            'required' => true,
            'content' => [
                'application/json' => [
                    'schema' => [
                        'type' => 'object',
                        'properties' => $properties,
                        'required' => $required
                    ]
                ]
            ]
        ];
    }

    /**
     * Generate summary from method name and ResourceSecurity
     */
    private function generateSummaryFromMethod(string $methodName, ResourceSecurity $resourceSecurity): string
    {
        $resource = ucfirst(str_replace('_', ' ', $resourceSecurity->resource));
        $action = $resourceSecurity->action ? $resourceSecurity->action->value : 'operation';

        // Convert common method patterns to readable summaries
        $patterns = [
            'getListAction' => "Get all {$resource}",
            'getRecordAction' => "Get {$resource} by ID",
            'updateAction' => "Update {$resource}",
            'patchAction' => "Partially update {$resource}",
            'createAction' => "Create new {$resource}",
            'deleteAction' => "Delete {$resource}",
            'resetAction' => "Reset {$resource} to defaults",
            'testConnectionAction' => "Test {$resource} connection",
            'sendTestEmailAction' => "Send test {$resource} email",
            'getOAuth2UrlAction' => "Get {$resource} OAuth2 authorization URL",
            'refreshTokenAction' => "Refresh {$resource} OAuth2 token",
        ];

        return $patterns[$methodName] ?? "{$action} {$resource}";
    }

    /**
     * Generate description from method name and ResourceSecurity
     */
    private function generateDescriptionFromMethod(string $methodName, ResourceSecurity $resourceSecurity): string
    {
        $resource = ucfirst(str_replace('_', ' ', $resourceSecurity->resource));
        $action = $resourceSecurity->action ? $resourceSecurity->action->value : 'operation';

        // Convert common method patterns to readable descriptions
        $patterns = [
            'getListAction' => "Retrieve all {$resource} with optional filtering and pagination",
            'getRecordAction' => "Retrieve a specific {$resource} by its unique identifier",
            'updateAction' => "Update all {$resource} properties (full replacement)",
            'patchAction' => "Update specific {$resource} properties (partial update)",
            'createAction' => "Create a new {$resource} with provided data",
            'deleteAction' => "Delete a {$resource} by its unique identifier",
            'resetAction' => "Reset {$resource} to their default configuration values",
            'testConnectionAction' => "Test the {$resource} connection with current configuration",
            'sendTestEmailAction' => "Send a test email using current {$resource} configuration",
            'getOAuth2UrlAction' => "Generate OAuth2 authorization URL for {$resource} provider authentication",
            'refreshTokenAction' => "Refresh expired OAuth2 access token for {$resource}",
        ];

        return $patterns[$methodName] ?? "Perform {$action} operation on {$resource}";
    }
}