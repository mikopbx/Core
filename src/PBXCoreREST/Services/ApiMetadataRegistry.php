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

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiParameterRef,
    ApiResponse,
    ApiDataSchema,
    HttpMapping,
    ResourceSecurity
};
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;
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
     * Registered data schemas from DataStructure classes
     *
     * @var array<string, array<string, mixed>>
     */
    private array $registeredSchemas = [];


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

                // WHY: Skip internal-only operations from OpenAPI spec
                // Internal operations are used by Nginx/Lua and should not be exposed in public API docs
                if ($operation->internal) {
                    continue;
                }

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

            // Scan for ApiDataSchema attributes
            $dataSchemaAttributes = $method->getAttributes(ApiDataSchema::class);
            foreach ($dataSchemaAttributes as $attribute) {
                /** @var ApiDataSchema $dataSchema */
                $dataSchema = $attribute->newInstance();

                // Register the schema if it's valid
                if ($dataSchema->isValidSchemaClass()) {
                    $schemaName = $dataSchema->getSchemaName();
                    $methodMetadata['dataSchema'] = [
                        'schemaClass' => $dataSchema->schemaClass,
                        'type' => $dataSchema->type,
                        'schemaName' => $schemaName,
                        'isArray' => $dataSchema->isArray
                    ];

                    // Register schema for later inclusion in OpenAPI spec
                    $this->registerSchemaFromClass($dataSchema->schemaClass, $schemaName, $dataSchema->type);
                }
            }

            // Scan for ApiParameterRef attributes (lightweight references to DataStructure definitions)
            $parameterRefAttributes = $method->getAttributes(ApiParameterRef::class);
            foreach ($parameterRefAttributes as $attribute) {
                /** @var ApiParameterRef $paramRef */
                $paramRef = $attribute->newInstance();

                // Resolve parameter definition from DataStructure
                $resolvedParam = $this->resolveParameterRef($paramRef, $methodMetadata['dataSchema'] ?? null);

                if ($resolvedParam !== null) {
                    $methodMetadata['parameters'][] = $resolvedParam;
                }
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
                'title' =>  $this->translateText('rest_MikoPBXRestAPIHeader'),
                'description' =>  $this->translateText('rest_MikoPBXRestAPIDescription'),
                'version' => '3.0.0',
                'contact' => [
                    'name' => $this->translateText('rest_MikoPBXSupportName'),
                    'url' => 'https://www.mikopbx.com',
                    'email' => 'support@mikopbx.com'
                ],
                'license' => [
                    'name' => 'GPL-3.0',
                    'url' => 'https://www.gnu.org/licenses/gpl-3.0.html'
                ]
            ],
            'servers' => $this->generateServers(),
            'paths' => [],
            'components' => [
                'schemas' => $this->generateSchemas(),
                'securitySchemes' => $this->generateSecuritySchemes()
            ],
            'security' => [
                ['bearerAuth' => []]
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
     * Includes both base PBXApiResult schema and any registered data schemas
     * from DataStructure classes that implement OpenApiSchemaProvider.
     *
     * @return array<string, mixed> Schemas
     */
    private function generateSchemas(): array
    {
        // Use the centralized PBXApiResult schema
        // All API responses follow the same structure regardless of success/error status
        $baseSchema = $this->getPBXApiResultSchema();

        $schemas = [
            'PBXApiResult' => $baseSchema
        ];

        // Add registered data schemas from DataStructure classes with translated descriptions
        foreach ($this->registeredSchemas as $schemaName => $schema) {
            $schemas[$schemaName] = $this->translateSchemaDescriptions($schema);
        }

        return $schemas;
    }

    /**
     * Recursively translate all 'description' fields in a schema
     *
     * Walks through the schema array and translates any 'description' fields
     * that look like translation keys.
     *
     * @param array<string, mixed> $schema Schema to translate
     * @return array<string, mixed> Schema with translated descriptions
     */
    private function translateSchemaDescriptions(array $schema): array
    {
        $result = [];

        foreach ($schema as $key => $value) {
            if ($key === 'description' && is_string($value)) {
                // Translate description if it looks like a translation key
                $result[$key] = $this->translateText($value);
            } elseif (is_array($value)) {
                // Recursively translate nested arrays
                $result[$key] = $this->translateSchemaDescriptions($value);
            } else {
                // Keep other values as-is
                $result[$key] = $value;
            }
        }

        return $result;
    }

    /**
     * Generate security schemes for OpenAPI
     *
     * @return array<string, mixed> Security schemes
     */
    private function generateSecuritySchemes(): array
    {
        return [
            'bearerAuth' => [
                'type' => 'http',
                'scheme' => 'bearer',
                'bearerFormat' => 'JWT',
                'description' => $this->translateText('rest_security_bearerAuth_description')
            ]
        ];
    }

    /**
     * Generate servers list dynamically based on system network settings
     * Provides both HTTP and HTTPS variants using configured network interfaces
     *
     * @return array<int, array<string, string>> Servers configuration
     */
    private function generateServers(): array
    {
        $servers = [];

        // Get port settings from database
        $httpsPort = \MikoPBX\Common\Models\PbxSettings::getValueByKey(
            \MikoPBX\Common\Models\PbxSettings::WEB_HTTPS_PORT
        );
        $httpPort = \MikoPBX\Common\Models\PbxSettings::getValueByKey(
            \MikoPBX\Common\Models\PbxSettings::WEB_PORT
        );
        $redirectToHttps = \MikoPBX\Common\Models\PbxSettings::getValueByKey(
            \MikoPBX\Common\Models\PbxSettings::REDIRECT_TO_HTTPS
        );

        // Get network addresses from database
        $addresses = $this->getNetworkAddresses();

        // Process local network addresses first
        if (!empty($addresses['local'])) {
            foreach ($addresses['local'] as $address) {
                // Add HTTPS server
                $httpsUrl = $httpsPort === '443'
                    ? "https://{$address}/"
                    : "https://{$address}:{$httpsPort}/";
                $servers[] = [
                    'url' => $httpsUrl,
                    'description' => 'HTTPS (Local network)'
                ];

                // Add HTTP server only if redirect is disabled
                if ($redirectToHttps !== '1' && !empty($httpPort)) {
                    $httpUrl = $httpPort === '80'
                        ? "http://{$address}/"
                        : "http://{$address}:{$httpPort}/";
                    $servers[] = [
                        'url' => $httpUrl,
                        'description' => 'HTTP (Local network)'
                    ];
                }
            }
        }

        // Process external network addresses
        if (!empty($addresses['external'])) {
            foreach ($addresses['external'] as $address) {
                // Add HTTPS server
                $httpsUrl = $httpsPort === '443'
                    ? "https://{$address}/"
                    : "https://{$address}:{$httpsPort}/";
                $servers[] = [
                    'url' => $httpsUrl,
                    'description' => 'HTTPS (External network)'
                ];

                // Add HTTP server only if redirect is disabled
                if ($redirectToHttps !== '1' && !empty($httpPort)) {
                    $httpUrl = $httpPort === '80'
                        ? "http://{$address}/"
                        : "http://{$address}:{$httpPort}/";
                    $servers[] = [
                        'url' => $httpUrl,
                        'description' => 'HTTP (External network)'
                    ];
                }
            }
        }

        return $servers;
    }

    /**
     * Get network addresses from LanInterfaces model
     * Similar to SystemMessages::getNetworkAddresses()
     *
     * @return array<string, array<int, string>> Array with 'local' and 'external' addresses
     */
    private function getNetworkAddresses(): array
    {
        $addresses = ['local' => [], 'external' => []];

        $interfaces = \MikoPBX\Common\Models\LanInterfaces::find("disabled='0'");
        if ($interfaces !== false && is_iterable($interfaces)) {
            foreach ($interfaces as $interface) {
                if (!empty($interface->ipaddr)) {
                    $addresses['local'][] = $interface->ipaddr;
                }
                if (!empty($interface->exthostname)) {
                    $addresses['external'][] = strtok($interface->exthostname, ':');
                }
                if (!empty($interface->extipaddr)) {
                    $addresses['external'][] = strtok($interface->extipaddr, ':');
                }
            }
        }

        return $addresses;
    }

    /**
     * Generate tags from metadata with automatic translation
     *
     * Converts English tag names to translated versions:
     * 'Call Queues' → 'rest_tag_CallQueues' → 'Очереди вызовов'
     *
     * @param array<string, mixed> $metadata
     * @return array<int, array<string, mixed>> Translated tags
     */
    private function generateTags(array $metadata): array
    {
        $tags = [];
        $tagNames = [];

        foreach ($metadata['resources'] ?? [] as $resource) {
            foreach ($resource['resource']['tags'] ?? [] as $englishTagName) {
                if (!in_array($englishTagName, $tagNames)) {
                    $tagNames[] = $englishTagName;

                    // Convert to translation key: 'Call Queues' → 'rest_tag_CallQueues'
                    $translationKey = $this->generateTagKey($englishTagName);

                    // Translate: 'rest_tag_CallQueues' → 'Очереди вызовов'
                    $translatedName = TranslationProvider::translate($translationKey);

                    $tags[] = [
                        'name' => $translatedName,
                        'description' => "Operations for {$translatedName}"
                    ];
                }
            }
        }

        return $tags;
    }

    /**
     * Generate translation key for tag name
     *
     * Converts English tag name to translation key:
     * 'Call Queues' → 'rest_tag_CallQueues'
     * 'API Keys' → 'rest_tag_APIKeys'
     *
     * @param string $englishName English tag name
     * @return string Translation key
     */
    private function generateTagKey(string $englishName): string
    {
        // Remove special characters and convert to PascalCase
        $cleaned = preg_replace('/[^a-zA-Z0-9\s]/', '', $englishName);
        $pascalCase = str_replace(' ', '', ucwords($cleaned ?? ''));

        return 'rest_tag_' . $pascalCase;
    }

    /**
     * Translate array of tag names
     *
     * Converts English tag names to translated versions:
     * ['Call Queues'] → ['Очереди вызовов']
     *
     * @param array<string> $englishTags Array of English tag names
     * @return array<string> Array of translated tag names
     */
    private function translateTagsArray(array $englishTags): array
    {
        $translatedTags = [];
        foreach ($englishTags as $englishTag) {
            $translationKey = $this->generateTagKey($englishTag);
            $translatedTags[] = TranslationProvider::translate($translationKey);
        }
        return $translatedTags;
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

        // Keep full paths as defined in ApiResource attributes
        // Do not modify basePath - it contains the complete path with version

        // Generate collection-level paths (without {id})
        $collectionPath = $basePath;
        $paths[$collectionPath] = [];

        // Generate resource-level paths (with {id})
        $resourcePath = $basePath . '/{id}';

        // ✨ FIX: Extract id parameter definition from resource-level operations
        // Path parameters should be defined at path level, not inside each operation
        // This matches the pattern from document (1).yaml: parameters defined once for the path
        $idParameterSchema = $this->extractIdParameterFromOperations($resource['operations'] ?? []);

        $paths[$resourcePath] = [
            'parameters' => [$idParameterSchema]
        ];

        // Extract resource name from tags for placeholder replacement
        // Translate the tag to get the localized resource name
        $tags = $resource['resource']['tags'] ?? [];
        $resourceTag = !empty($tags) ? $tags[0] : '';
        // Translate tag directly as it may contain spaces (e.g., "Call Queues")
        $resourceName = !empty($resourceTag) ? TranslationProvider::translate($resourceTag) : '';

        // Get list of custom methods to exclude from standard processing
        $customMethods = $httpMapping['custom'] ?? [];

        // Process each operation
        foreach ($resource['operations'] ?? [] as $operationName => $operation) {
            // Skip custom methods - they will be processed separately
            if (in_array($operationName, $customMethods)) {
                continue;
            }

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

                    // Merge class-level and method-level security
                    $methodSecurity = $operation['security'] ?? [];
                    $combinedSecurity = array_merge($resource['security'] ?? [], $methodSecurity);

                    $paths[$targetPath][$method] = [
                        'summary' => $this->translateText($operationData['summary'] ?? ''),
                        'description' => $this->translateText($operationData['description'] ?? ''),
                        'operationId' => $operationData['operationId'] ?? $operationName,
                        'tags' => $this->translateTagsArray($resource['resource']['tags'] ?? []),
                        'parameters' => $this->generateParametersForOperation($parameters, $requiresId),
                        'responses' => $this->generateResponsesForOperation($responses, $resourceName, $operation['dataSchema'] ?? null),
                        'security' => $this->generateSecurityForOperation($combinedSecurity)
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

                // Merge class-level and method-level security
                $methodSecurity = $operation['security'] ?? [];
                $combinedSecurity = array_merge($resource['security'] ?? [], $methodSecurity);

                // WHY: Determine actual HTTP method from mapping instead of hardcoding 'get'
                // Custom methods can be GET, POST, PUT, PATCH, or DELETE
                $httpMethod = 'get'; // default
                foreach ($httpMapping['mapping'] ?? [] as $method => $operations) {
                    $ops = is_string($operations) ? [$operations] : $operations;
                    if (in_array($customMethod, $ops)) {
                        $httpMethod = strtolower($method);
                        break;
                    }
                }

                // ✨ FIX: Add path-level parameters for resource-level custom methods
                // Resource-level custom methods like /resource/{id}:copy need id parameter
                $pathLevelParams = [];
                if ($isResourceLevel) {
                    $pathLevelParams = [$this->extractIdParameterFromOperations($resource['operations'] ?? [])];
                }

                $paths[$customPath] = [
                    'parameters' => $pathLevelParams,
                    $httpMethod => [
                        'summary' => $this->translateText($operationData['summary'] ?? ''),
                        'description' => $this->translateText($operationData['description'] ?? ''),
                        'operationId' => $operationData['operationId'] ?? $customMethod,
                        'tags' => $this->translateTagsArray($resource['resource']['tags'] ?? []),
                        'parameters' => $this->generateParametersForOperation($parameters, $isResourceLevel),
                        'responses' => $this->generateResponsesForOperation($responses, $resourceName, $operation['dataSchema'] ?? null),
                        'security' => $this->generateSecurityForOperation($combinedSecurity)
                    ]
                ];

                // WHY: Add request body for POST/PUT/PATCH custom methods
                // Body parameters are those with 'in' => 'query' (non-pagination params)
                if (in_array($httpMethod, ['post', 'put', 'patch'])) {
                    $bodyParameters = array_filter($parameters, function($param) {
                        return ($param['in'] ?? '') === 'query' && !in_array($param['name'], ['limit', 'offset', 'search', 'order', 'orderWay']);
                    });

                    if (!empty($bodyParameters)) {
                        $paths[$customPath][$httpMethod]['requestBody'] = $this->generateRequestBody($bodyParameters);
                    }
                }
            }
        }

        return $paths;
    }

    /**
     * Extract id parameter schema from resource-level operations
     *
     * Searches through operations to find an 'id' parameter with 'in' => 'path'
     * and extracts its schema (pattern, example, description).
     * If not found, returns default numeric id schema.
     *
     * @param array<string, mixed> $operations Operations metadata
     * @return array<string, mixed> OpenAPI parameter definition
     */
    private function extractIdParameterFromOperations(array $operations): array
    {
        // Default id parameter schema (numeric)
        $defaultSchema = [
            'name' => 'id',
            'in' => 'path',
            'required' => true,
            'description' => $this->translateText('rest_param_id_description'),
            'schema' => [
                'type' => 'string',
                'pattern' => '^[0-9]+$',
                'example' => '12'
            ]
        ];

        // Search for id parameter in resource-level operations (getRecord, update, patch, delete)
        $resourceLevelOps = ['getRecord', 'update', 'patch', 'delete', 'copy'];

        foreach ($operations as $operationName => $operation) {
            if (!in_array($operationName, $resourceLevelOps)) {
                continue;
            }

            $parameters = $operation['parameters'] ?? [];
            foreach ($parameters as $param) {
                if ($param['name'] === 'id') {
                    // Found id parameter - extract custom schema from it
                    // Even if 'in' is 'query', we'll use pattern/example for path parameter
                    $schema = [
                        'type' => $param['type'] ?? 'string'
                    ];

                    // Add optional schema properties only if they exist
                    if (!empty($param['pattern'])) {
                        $schema['pattern'] = $param['pattern'];
                    }
                    if (isset($param['example'])) {
                        $schema['example'] = $param['example'];
                    }

                    return [
                        'name' => 'id',
                        'in' => 'path',
                        'required' => true,
                        'description' => $this->translateText($param['description'] ?? 'rest_param_id_description'),
                        'schema' => $schema
                    ];
                }
            }
        }

        // No custom id parameter found - use default
        return $defaultSchema;
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
     *
     * ✨ FIX: Always exclude 'id' parameters from operation-level
     * Path parameters are now defined at path level (see generatePathsFromResource)
     * Only query, header, and cookie parameters should be at operation level
     *
     * @param array<int, mixed> $parameters Array of parameter definitions
     * @param bool $includeId Legacy parameter, now ignored (id always excluded from operations)
     * @return array<int, mixed> OpenAPI parameters for operation
     */
    private function generateParametersForOperation(array $parameters, bool $includeId = false): array
    {
        $openApiParams = [];

        foreach ($parameters as $param) {
            // ✨ FIX: Always skip ALL 'id' parameters regardless of 'in' value
            // Path parameters are defined at path level, not operation level
            // This prevents duplicate 'id' in both path and query parameters
            if ($param['name'] === 'id') {
                continue;
            }

            $openApiParam = [
                'name' => $param['name'],
                'in' => $param['in'],
                'description' => $this->translateText($param['description']),
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
     *
     * @param array<int, mixed> $responses Response metadata
     * @param string $resourceName Resource name for placeholder replacement
     * @param array<string, mixed>|null $dataSchema Data schema metadata from ApiDataSchema attribute
     * @return array<string, mixed> OpenAPI responses
     */
    private function generateResponsesForOperation(array $responses, string $resourceName = '', ?array $dataSchema = null): array
    {
        $openApiResponses = [];

        foreach ($responses as $response) {
            $statusCode = (string)$response['statusCode'];

            // Translate description with resource name placeholder
            $placeholders = !empty($resourceName) ? ['resourceName' => $resourceName] : [];
            $description = $this->translateText($response['description'], $placeholders);

            $openApiResponses[$statusCode] = [
                'description' => $description
            ];

            // Build schema based on available data schema
            $schema = $this->buildResponseSchema($dataSchema, $statusCode);

            // If we have an example, add it
            if (isset($response['example'])) {
                $exampleData = json_decode($response['example'], true);

                // If example is null or decoding failed, create a basic PBXApiResult structure
                if ($exampleData === null) {
                    $exampleData = [
                        'result' => true,
                        'data' => new \stdClass(),
                        'messages' => new \stdClass(),
                        'function' => '',
                        'processor' => '',
                        'pid' => 0
                    ];
                }

                $openApiResponses[$statusCode]['content'] = [
                    'application/json' => [
                        'schema' => $schema,
                        'example' => $exampleData
                    ]
                ];
            } else {
                // No example provided, use schema only
                $openApiResponses[$statusCode]['content'] = [
                    'application/json' => [
                        'schema' => $schema
                    ]
                ];
            }
        }

        return $openApiResponses;
    }

    /**
     * Build response schema combining PBXApiResult with typed data schema
     *
     * @param array<string, mixed>|null $dataSchema Data schema metadata
     * @param string $statusCode HTTP status code
     * @return array<string, mixed> OpenAPI schema definition
     */
    private function buildResponseSchema(?array $dataSchema, string $statusCode): array
    {
        $baseSchema = $this->getPBXApiResultSchema();

        // Only use typed schema for successful responses (2xx)
        if ($dataSchema === null || !str_starts_with($statusCode, '2')) {
            return $baseSchema;
        }

        // Build typed data property schema
        $dataPropertySchema = [
            '$ref' => "#/components/schemas/{$dataSchema['schemaName']}"
        ];

        // Wrap in array if needed
        if ($dataSchema['isArray'] === true) {
            $dataPropertySchema = [
                'type' => 'array',
                'items' => $dataPropertySchema
            ];
        }

        // Create inline schema with typed data property
        // Using inline schema instead of allOf for better OpenAPI UI compatibility
        // Some UI tools (like Stoplight Elements) show allOf as separate objects
        return [
            'type' => 'object',
            'description' => $baseSchema['description'],
            'properties' => [
                'result' => $baseSchema['properties']['result'],
                'data' => $dataPropertySchema, // Override with typed schema
                'messages' => $baseSchema['properties']['messages'],
                'function' => $baseSchema['properties']['function'],
                'processor' => $baseSchema['properties']['processor'],
                'pid' => $baseSchema['properties']['pid'],
                'reload' => $baseSchema['properties']['reload']
            ],
            'required' => $baseSchema['required']
        ];
    }

    /**
     * Get standard PBXApiResult schema for OpenAPI
     * This matches the structure returned by PBXApiResult::getResult()
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    private function getPBXApiResultSchema(): array
    {
        return [
            'type' => 'object',
            'description' => $this->translateText('rest_schema_PBXApiResult'),
            'properties' => [
                'result' => [
                    'type' => 'boolean',
                    'description' => $this->translateText('rest_schema_result')
                ],
                'data' => [
                    'type' => 'object',
                    'description' => $this->translateText('rest_schema_data'),
                    'additionalProperties' => true
                ],
                'messages' => [
                    'type' => 'object',
                    'description' => $this->translateText('rest_schema_messages'),
                    'properties' => [
                        'error' => [
                            'type' => 'array',
                            'description' => $this->translateText('rest_schema_messages_error'),
                            'items' => ['type' => 'string']
                        ],
                        'info' => [
                            'type' => 'array',
                            'description' => $this->translateText('rest_schema_messages_info'),
                            'items' => ['type' => 'string']
                        ],
                        'warning' => [
                            'type' => 'array',
                            'description' => $this->translateText('rest_schema_messages_warning'),
                            'items' => ['type' => 'string']
                        ]
                    ],
                    'additionalProperties' => true
                ],
                'function' => [
                    'type' => 'string',
                    'description' => $this->translateText('rest_schema_function')
                ],
                'processor' => [
                    'type' => 'string',
                    'description' => $this->translateText('rest_schema_processor')
                ],
                'pid' => [
                    'type' => 'integer',
                    'description' => $this->translateText('rest_schema_pid')
                ],
                'reload' => [
                    'type' => 'string',
                    'description' => $this->translateText('rest_schema_reload')
                ]
            ],
            'required' => ['result', 'data', 'messages', 'function', 'processor', 'pid']
        ];
    }

    /**
     * Generate security for OpenAPI operation
     */
    private function generateSecurityForOperation(array $security): array
    {
        // If the last security rule (method-level) is PUBLIC, it overrides all previous rules (class-level)
        // This allows methods to override class-level security requirements
        if (!empty($security)) {
            $lastRule = end($security);
            $lastRequirements = $lastRule['requirements'] ?? [];
            if (in_array('public', $lastRequirements)) {
                // Public endpoints don't require authentication
                return [];
            }
        }

        // First pass: check if any security rule allows public access
        foreach ($security as $securityRule) {
            $requirements = $securityRule['requirements'] ?? [];
            if (in_array('public', $requirements)) {
                // Public endpoints don't require authentication
                return [];
            }
        }

        // Second pass: build security requirements
        // Only bearerAuth is exposed in public REST API documentation
        // Session and localhost are internal authentication mechanisms not documented in OpenAPI
        $openApiSecurity = [];
        foreach ($security as $securityRule) {
            $requirements = $securityRule['requirements'] ?? [];

            // Convert SecurityType requirements to OpenAPI security schemes
            if (in_array('bearer_token', $requirements)) {
                $openApiSecurity[] = ['bearerAuth' => $securityRule['permissions'] ?? []];
            }
            // Note: session and localhost authentication are not documented in OpenAPI
            // as they are internal mechanisms not intended for public API consumers
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
                'description' => $this->translateText($param['description'])
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

    /**
     * Translate text using TranslationProvider
     *
     * If the text looks like a translation key (no spaces), it will be translated.
     * Otherwise, returns the text as-is.
     *
     * @param string $text Text or translation key to translate
     * @param array<string, mixed> $placeholders Optional placeholders for translation
     * @return string Translated text or original text if not a key
     */
    private function translateText(string $text, array $placeholders = []): string
    {
        if (empty($text)) {
            return $text;
        }

        // Check if this looks like a translation key (no spaces, no special chars except underscore and digits)
        // Translation keys typically follow pattern: rest_resource_Action or param_name or rest_response_200_default
        if (!str_contains($text, ' ') && preg_match('/^[a-z0-9_]+$/i', $text)) {
            return TranslationProvider::translate($text, $placeholders);
        }

        // Return as-is if it doesn't look like a translation key
        return $text;
    }

    /**
     * Resolve ApiParameterRef to full parameter definition
     *
     * Takes a lightweight ApiParameterRef and resolves it to a full parameter definition
     * by looking up the parameter in DataStructure::getParameterDefinitions() and merging
     * with any overrides specified in the ApiParameterRef.
     *
     * This implements the Single Source of Truth pattern where parameter definitions
     * are stored in DataStructure and referenced by lightweight attributes in controllers.
     *
     * @param ApiParameterRef $paramRef Parameter reference to resolve
     * @param array<string, mixed>|null $dataSchema DataSchema metadata from ApiDataSchema attribute
     * @return array<string, mixed>|null Resolved parameter definition, or null if not found
     */
    private function resolveParameterRef(ApiParameterRef $paramRef, ?array $dataSchema): ?array
    {
        // ✨ FIX: Prioritize dataStructure from ApiParameterRef over ApiDataSchema
        // ApiParameterRef can specify its own dataStructure (e.g., CommonDataStructure for 'id')
        // If not specified, fall back to controller's DataStructure from ApiDataSchema
        $schemaClass = $paramRef->dataStructure ?? ($dataSchema['schemaClass'] ?? null);

        if ($schemaClass === null) {
            return null;
        }

        // Verify class exists and has getParameterDefinitions method
        if (!class_exists($schemaClass) || !method_exists($schemaClass, 'getParameterDefinitions')) {
            return null;
        }

        // Get parameter definitions from DataStructure
        $definitions = $schemaClass::getParameterDefinitions();
        $requestParams = $definitions['request'] ?? [];

        // Find parameter definition by name
        if (!isset($requestParams[$paramRef->parameterName])) {
            return null;
        }

        $baseDefinition = $requestParams[$paramRef->parameterName];

        // Merge with overrides from ApiParameterRef
        $overrides = $paramRef->getOverrides();

        // Build full parameter definition
        $resolved = [
            'name' => $paramRef->parameterName,
            'type' => $baseDefinition['type'] ?? 'string',
            'description' => $overrides['description'] ?? $baseDefinition['description'] ?? '',
            'in' => isset($overrides['in']) ? $overrides['in']->value : 'query',
            'required' => $overrides['required'] ?? false,
            'default' => $overrides['default'] ?? $baseDefinition['default'] ?? null,
            'example' => $overrides['example'] ?? $baseDefinition['example'] ?? null,
            'enum' => $overrides['enum'] ?? $baseDefinition['enum'] ?? null,
            'format' => $baseDefinition['format'] ?? null,
            'minimum' => $overrides['minimum'] ?? $baseDefinition['minimum'] ?? null,
            'maximum' => $overrides['maximum'] ?? $baseDefinition['maximum'] ?? null,
            'minLength' => $baseDefinition['minLength'] ?? null,
            'maxLength' => $overrides['maxLength'] ?? $baseDefinition['maxLength'] ?? null,
            'pattern' => $overrides['pattern'] ?? $baseDefinition['pattern'] ?? null,
            'deprecated' => false,
            'validationRules' => [] // Will be populated if needed
        ];

        return $resolved;
    }

    /**
     * Register schema from DataStructure class
     *
     * Extracts OpenAPI schema from a class that implements OpenApiSchemaProvider
     * and stores it for later inclusion in the OpenAPI specification.
     *
     * @param class-string $schemaClass DataStructure class name
     * @param string $schemaName Schema name for OpenAPI components
     * @param string $type Schema type: 'list', 'detail', or 'custom'
     * @return void
     */
    private function registerSchemaFromClass(string $schemaClass, string $schemaName, string $type): void
    {
        // Skip if already registered
        if (isset($this->registeredSchemas[$schemaName])) {
            return;
        }

        // Verify class exists and implements interface
        if (!class_exists($schemaClass)) {
            return;
        }

        $interfaces = class_implements($schemaClass);
        if (!isset($interfaces[OpenApiSchemaProvider::class])) {
            return;
        }

        // Get schema based on type
        $schema = match ($type) {
            'list' => $schemaClass::getListItemSchema(),
            'detail' => $schemaClass::getDetailSchema(),
            default => $schemaClass::getDetailSchema()
        };

        // Register main schema
        $this->registeredSchemas[$schemaName] = $schema;

        // Register related schemas
        $relatedSchemas = $schemaClass::getRelatedSchemas();
        foreach ($relatedSchemas as $relatedName => $relatedSchema) {
            if (!isset($this->registeredSchemas[$relatedName])) {
                $this->registeredSchemas[$relatedName] = $relatedSchema;
            }
        }
    }
}