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
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
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
     * Pagination parameters excluded from request body
     * WHY: These are query parameters for filtering/pagination, not resource properties
     *
     * @var array<int, string>
     */
    private const PAGINATION_PARAMS = ['limit', 'offset', 'search', 'order', 'orderWay'];

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
            $methodName = $method->getName();

            $methodMetadata = [
                'name' => $methodName,
                'operations' => [],
                'parameters' => [],
                'responses' => [],
                'security' => [],
                'acl' => []
            ];

            // WHY: Track if method is internal to prevent ResourceSecurity from generating operation
            $isInternalMethod = false;

            // Scan for ApiOperation attributes
            $operationAttributes = $method->getAttributes(ApiOperation::class);
            foreach ($operationAttributes as $attribute) {
                $operation = $attribute->newInstance();

                // WHY: Skip internal-only operations from OpenAPI spec
                // Internal operations are used by Nginx/Lua and should not be exposed in public API docs
                if ($operation->internal) {
                    $isInternalMethod = true;  // Mark method as internal
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
                // Pass controller class for convention-based DataStructure discovery
                $resolvedParam = $this->resolveParameterRef(
                    $paramRef,
                    $methodMetadata['dataSchema'] ?? null,
                    $reflection->getName()
                );

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

                // WHY: Generate operation info from ResourceSecurity ONLY if not internal
                // Internal methods should not appear in OpenAPI even if they have ResourceSecurity
                if (empty($methodMetadata['operations']) && !$isInternalMethod) {
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

            // WHY: Only add method metadata if it has operations (non-internal)
            // Parameters and responses alone are not enough - we need at least one operation
            // This prevents internal-only methods from appearing in OpenAPI spec
            if (!empty($methodMetadata['operations'])) {
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
                    // ✨ FIX: Skip parameters without required fields
                    if (!isset($parameter['name']) || !isset($parameter['type'])) {
                        continue;
                    }

                    $schemas[$operationKey]['parameters'][$parameter['name']] = [
                        'type' => $parameter['type'],
                        'required' => $parameter['required'] ?? false,
                        'validation' => $parameter['validationRules'] ?? [],
                        'default' => $parameter['default'] ?? null,
                        'enum' => $parameter['enum'] ?? null
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

        // WHY: Process local and external addresses using unified method to eliminate code duplication
        // Each address generates HTTPS server + optional HTTP server (if redirect is disabled)
        foreach ($addresses['local'] as $address) {
            $servers = array_merge(
                $servers,
                $this->generateServerEntry($address, 'Local network', $httpsPort, $httpPort, $redirectToHttps)
            );
        }

        foreach ($addresses['external'] as $address) {
            $servers = array_merge(
                $servers,
                $this->generateServerEntry($address, 'External network', $httpsPort, $httpPort, $redirectToHttps)
            );
        }

        return $servers;
    }

    /**
     * Generate server entries for a single address
     *
     * WHY: Eliminate code duplication between local and external address processing
     * Creates HTTPS server + optional HTTP server based on redirect settings
     *
     * @param string $address IP address or hostname
     * @param string $type Network type description (e.g., "Local network", "External network")
     * @param string $httpsPort HTTPS port number
     * @param string $httpPort HTTP port number
     * @param string $redirectToHttps Whether HTTP redirects to HTTPS ('1' or '0')
     * @return array<int, array<string, string>> Server entries for this address
     */
    private function generateServerEntry(
        string $address,
        string $type,
        string $httpsPort,
        string $httpPort,
        string $redirectToHttps
    ): array {
        $servers = [];

        // Add HTTPS server
        $servers[] = [
            'url' => $this->buildServerUrl('https', $address, $httpsPort),
            'description' => "HTTPS ({$type})"
        ];

        // WHY: Only add HTTP server if redirect to HTTPS is disabled
        // When redirect is enabled, HTTP requests are automatically redirected to HTTPS
        if ($redirectToHttps !== '1' && !empty($httpPort)) {
            $servers[] = [
                'url' => $this->buildServerUrl('http', $address, $httpPort),
                'description' => "HTTP ({$type})"
            ];
        }

        return $servers;
    }

    /**
     * Build server URL with optional port
     *
     * WHY: Centralize URL building logic to avoid repetition
     * Default ports (80 for HTTP, 443 for HTTPS) are omitted from URL
     *
     * @param string $protocol 'http' or 'https'
     * @param string $address IP address or hostname
     * @param string $port Port number
     * @return string Complete server URL
     */
    private function buildServerUrl(string $protocol, string $address, string $port): string
    {
        $defaultPorts = ['https' => '443', 'http' => '80'];
        $needsPort = $port !== ($defaultPorts[$protocol] ?? '');

        return sprintf(
            '%s://%s%s/',
            $protocol,
            $address,
            $needsPort ? ":{$port}" : ''
        );
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

        // Generate resource-level paths (with {id}) ONLY if resource has resource-level operations
        // WHY: Singleton resources (storage, s3-storage, system, etc.) have empty resourceLevel array
        // and should NOT have /{id} endpoint in OpenAPI spec
        $hasResourceLevelOps = !empty($httpMapping['resourceLevel'] ?? []);
        $resourcePath = null;

        if ($hasResourceLevelOps) {
            $resourcePath = $basePath . '/{id}';

            // Extract id parameter definition from resource-level operations
            // Path parameters should be defined at path level, not inside each operation
            // This matches the pattern from document (1).yaml: parameters defined once for the path
            $idParameterSchema = $this->extractIdParameterFromOperations($resource['operations'] ?? []);

            $paths[$resourcePath] = [
                'parameters' => [$idParameterSchema]
            ];
        }

        // WHY: Translate tags once per resource instead of per operation for performance
        // Reduces translateTagsArray() calls from O(N operations) to O(1)
        $translatedTags = $this->translateTagsArray($resource['resource']['tags'] ?? []);

        // Extract resource name from first tag for placeholder replacement in responses
        $resourceName = !empty($translatedTags) ? $translatedTags[0] : '';

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
                    // WHY: Explicitly check collectionLevel first - singletons define getRecord/update/patch there
                    // FIX: Respect HttpMapping configuration instead of relying only on operation name patterns
                    $isCollectionLevel = in_array($operationName, $httpMapping['collectionLevel'] ?? []);
                    $isResourceLevel = in_array($operationName, $httpMapping['resourceLevel'] ?? []);

                    if ($isCollectionLevel && $isResourceLevel) {
                        // WHY: Misconfiguration - operation cannot be both collection and resource level
                        SystemMessages::sysLogMsg(__METHOD__, "WARNING: Operation '$operationName' is in both collectionLevel and resourceLevel for path '$basePath'", LOG_WARNING);
                        continue;
                    }

                    $requiresId = $isResourceLevel ||
                                  (!$isCollectionLevel && $this->operationRequiresId($operationName));

                    // WHY: Skip if operation requires ID but resourcePath not created (misconfiguration)
                    // This prevents using null resourcePath when singleton has resource-level operation
                    if ($requiresId && $resourcePath === null) {
                        SystemMessages::sysLogMsg(__METHOD__, "WARNING: Operation '$operationName' requires ID but resource has no resourceLevel operations in HttpMapping for path '$basePath'", LOG_WARNING);
                        continue;
                    }

                    $targetPath = $requiresId ? $resourcePath : $collectionPath;

                    // Merge class-level and method-level security
                    $methodSecurity = $operation['security'] ?? [];
                    $combinedSecurity = array_merge($resource['security'] ?? [], $methodSecurity);

                    $paths[$targetPath][$method] = [
                        'summary' => $this->translateText($operationData['summary'] ?? ''),
                        'description' => $this->translateText($operationData['description'] ?? ''),
                        'operationId' => $operationData['operationId'] ?? $operationName,
                        'tags' => $translatedTags, // WHY: Reuse cached translated tags
                        'parameters' => $this->generateParametersForOperation($parameters, $requiresId),
                        'responses' => $this->generateResponsesForOperation($responses, $resourceName, $operation['dataSchema'] ?? null),
                        'security' => $this->generateSecurityForOperation($combinedSecurity)
                    ];

                    // Add request body for POST/PUT/PATCH
                    if (in_array($method, ['post', 'put', 'patch'])) {
                        $bodyParameters = array_filter($parameters, function($param) {
                            return ($param['in'] ?? '') === 'query' && !in_array($param['name'], self::PAGINATION_PARAMS);
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

                // WHY: Skip if no operations (internal-only methods filtered out)
                // Internal methods have empty operations array due to continue on line 216
                if (empty($operation['operations'])) {
                    continue;
                }

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

                // ✨ FIX: Generate OpenAPI parameters BEFORE building operation
                // WHY: We need the transformed parameters for requestBody generation
                $openApiParameters = $this->generateParametersForOperation($parameters, $isResourceLevel);

                $paths[$customPath] = [
                    'parameters' => $pathLevelParams,
                    $httpMethod => [
                        'summary' => $this->translateText($operationData['summary'] ?? ''),
                        'description' => $this->translateText($operationData['description'] ?? ''),
                        'operationId' => $operationData['operationId'] ?? $customMethod,
                        'tags' => $translatedTags, // WHY: Reuse cached translated tags
                        'parameters' => $openApiParameters,
                        'responses' => $this->generateResponsesForOperation($responses, $resourceName, $operation['dataSchema'] ?? null),
                        'security' => $this->generateSecurityForOperation($combinedSecurity)
                    ]
                ];

                // WHY: Add request body for POST/PUT/PATCH custom methods
                // Body parameters are those with 'in' => 'query' (non-pagination params)
                if (in_array($httpMethod, ['post', 'put', 'patch'])) {
                    $bodyParameters = array_filter($openApiParameters, function($param) {
                        return ($param['in'] ?? '') === 'query' && !in_array($param['name'], self::PAGINATION_PARAMS);
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
     * WHY: Search for custom id parameter definition in any operation's parameters
     * If found, use its schema (pattern, example, description) for path-level parameter
     * Otherwise, return default numeric id schema
     *
     * @param array<string, mixed> $operations Operations metadata
     * @return array<string, mixed> OpenAPI parameter definition
     */
    private function extractIdParameterFromOperations(array $operations): array
    {
        // WHY: Default id parameter uses numeric pattern (most common case)
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

        // WHY: Search for custom id parameter in any operation (not just resource-level)
        // This allows any operation to define custom id schema (e.g., UUID, prefix patterns)
        foreach ($operations as $operation) {
            $idParams = array_filter(
                $operation['parameters'] ?? [],
                fn($param) => ($param['name'] ?? '') === 'id'
            );

            if (!empty($idParams)) {
                $param = reset($idParams);

                // WHY: Build schema with only non-null values for cleaner OpenAPI output
                $schema = array_filter([
                    'type' => $param['type'] ?? 'string',
                    'pattern' => $param['pattern'] ?? null,
                    'example' => $param['example'] ?? null
                ], fn($value) => $value !== null);

                return [
                    'name' => 'id',
                    'in' => 'path',
                    'required' => true,
                    'description' => $this->translateText($param['description'] ?? 'rest_param_id_description'),
                    'schema' => $schema
                ];
            }
        }

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
            if (($param['name'] ?? '') === 'id') {
                continue;
            }

            // ✨ FIX: Skip parameters without required fields
            // WHY: Some parameters may be malformed or incomplete in metadata
            if (!isset($param['type']) || !isset($param['in']) || !isset($param['name'])) {
                SystemMessages::sysLogMsg(__METHOD__, "WARNING: Skipping parameter with missing required fields: " . json_encode($param), LOG_WARNING);
                continue;
            }

            // WHY: Build schema using centralized method to avoid duplication
            $schema = $this->buildParameterSchema($param);

            // WHY: Extract example from schema (buildParameterSchema includes it)
            $example = $schema['example'] ?? null;
            unset($schema['example']); // Example goes at param level, not schema level

            $openApiParam = [
                'name' => $param['name'],
                'in' => $param['in'],
                'description' => $schema['description'],
                'required' => $param['required'] ?? false,
                'schema' => $schema
            ];

            // Remove description from schema (it's at param level)
            unset($openApiParam['schema']['description']);

            if ($example !== null) {
                $openApiParam['example'] = $example;
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
     *
     * WHY: Check security rules in priority order - last rule (method-level) takes precedence
     * This allows methods to override class-level security requirements
     *
     * @param array<int, array<string, mixed>> $security Security rules from class and method attributes
     * @return array<int, array<string, array<int, string>>> OpenAPI security requirements
     */
    private function generateSecurityForOperation(array $security): array
    {
        // WHY: Method-level security (last rule) overrides class-level (earlier rules)
        // Check last rule first for 'public' access - if found, endpoint doesn't require auth
        if (!empty($security)) {
            $lastRule = end($security);
            $lastRequirements = $lastRule['requirements'] ?? [];
            if (in_array('public', $lastRequirements)) {
                return []; // Public endpoints don't require authentication
            }
        }

        // WHY: Build OpenAPI security requirements from non-public rules
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
     *
     * WHY: Convert operation parameters to OpenAPI request body schema
     * Used for POST/PUT/PATCH operations to document request payload
     *
     * @param array<int, mixed> $parameters Array of parameter definitions from generateParametersForOperation
     * @return array<string, mixed> OpenAPI request body specification
     */
    private function generateRequestBody(array $parameters): array
    {
        $properties = [];
        $required = [];

        foreach ($parameters as $param) {
            $properties[$param['name']] = $this->buildParameterSchema($param);

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
     * Build OpenAPI schema object from parameter definition
     *
     * WHY: Centralize schema building logic to eliminate duplication
     * Handles both raw parameter format and OpenAPI-transformed format
     *
     * @param array<string, mixed> $param Parameter definition
     * @return array<string, mixed> OpenAPI schema with type, enum, example, etc.
     */
    private function buildParameterSchema(array $param): array
    {
        // WHY: Support both raw format (type) and OpenAPI format (schema['type'])
        // generateRequestBody receives OpenAPI-transformed params from generateParametersForOperation
        $schema = [
            'type' => $param['schema']['type'] ?? $param['type'] ?? 'string',
            'description' => $this->translateText($param['description'] ?? '')
        ];

        // WHY: Add optional constraints only if present for cleaner output
        $constraints = ['enum', 'pattern', 'minimum', 'maximum', 'minLength', 'maxLength', 'format'];
        foreach ($constraints as $constraint) {
            $value = $param['schema'][$constraint] ?? $param[$constraint] ?? null;
            if ($value !== null && $value !== '') {
                $schema[$constraint] = $value;
            }
        }

        // WHY: Example is at top level in OpenAPI, not inside schema
        if (isset($param['example']) && $param['example'] !== null) {
            $schema['example'] = $param['example'];
        }

        return $schema;
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
    private function resolveParameterRef(ApiParameterRef $paramRef, ?array $dataSchema, ?string $controllerClass = null): ?array
    {
        // ✨ PRIORITY ORDER for determining DataStructure class:
        // 1. ApiParameterRef::dataStructure (explicit override, e.g., CommonDataStructure for 'id')
        // 2. ApiDataSchema::schemaClass (controller-level DataStructure)
        // 3. Convention-based: derive from controller namespace
        //    Controllers\{Resource}\RestController -> Lib\{Resource}\DataStructure

        $schemaClass = $paramRef->dataStructure ?? ($dataSchema['schemaClass'] ?? null);

        // ✨ FIX: If no explicit dataStructure, try convention-based discovery
        if ($schemaClass === null && $controllerClass !== null) {
            $schemaClass = $this->deriveDataStructureFromController($controllerClass);
        }

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
        $relatedParams = $definitions['related'] ?? [];

        // Find parameter definition by name
        // Check BOTH request AND related sections
        // WHY: Custom method parameters (export format, import strategy, etc.) are in 'related'
        // Standard CRUD parameters (number, user_username, etc.) are in 'request'
        if (isset($requestParams[$paramRef->parameterName])) {
            $baseDefinition = $requestParams[$paramRef->parameterName];
        } elseif (isset($relatedParams[$paramRef->parameterName])) {
            $baseDefinition = $relatedParams[$paramRef->parameterName];
        } else {
            return null;
        }

        // Merge with overrides from ApiParameterRef
        $overrides = $paramRef->getOverrides();

        // Build full parameter definition
        // WHY: Priority order for 'in' location: override > baseDefinition > default 'query'
        // This ensures DataStructure can specify 'in' => 'query' and it will be respected
        $inLocation = 'query'; // default
        if (isset($overrides['in'])) {
            $inLocation = $overrides['in']->value;
        } elseif (isset($baseDefinition['in'])) {
            $inLocation = $baseDefinition['in'];
        }

        $resolved = [
            'name' => $paramRef->parameterName,
            'type' => $baseDefinition['type'] ?? 'string',
            'description' => $overrides['description'] ?? $baseDefinition['description'] ?? '',
            'in' => $inLocation,
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
     * Derive DataStructure class from controller class name using convention
     *
     * Supports two patterns:
     * 1. Core: Controllers\{Resource}\RestController -> Lib\{Resource}\DataStructure
     * 2. Module: Lib\RestAPI\{Resource}\Controller -> Lib\RestAPI\{Resource}\DataStructure
     *
     * Examples:
     * - MikoPBX\PBXCoreREST\Controllers\Cdr\RestController
     *   -> MikoPBX\PBXCoreREST\Lib\Cdr\DataStructure
     * - Modules\ModuleExampleRestAPIv3\Lib\RestAPI\Tasks\Controller
     *   -> Modules\ModuleExampleRestAPIv3\Lib\RestAPI\Tasks\DataStructure
     *
     * @param string $controllerClass Fully qualified controller class name
     * @return string|null DataStructure class name if derivable, null otherwise
     */
    private function deriveDataStructureFromController(string $controllerClass): ?string
    {
        // Pattern 1: Core - MikoPBX\PBXCoreREST\Controllers\{Resource}\RestController
        if (preg_match('/^(.+)\\\\Controllers\\\\(.+)\\\\RestController$/', $controllerClass, $matches)) {
            $baseNamespace = $matches[1]; // MikoPBX\PBXCoreREST
            $resource = $matches[2];      // Cdr, CallQueues, etc.

            // Derive: MikoPBX\PBXCoreREST\Lib\{Resource}\DataStructure
            $dataStructureClass = $baseNamespace . '\\Lib\\' . $resource . '\\DataStructure';

            // Verify class exists
            if (class_exists($dataStructureClass)) {
                return $dataStructureClass;
            }
        }

        // Pattern 2: Module - Modules\{Module}\Lib\RestAPI\{Resource}\Controller
        if (preg_match('/^Modules\\\\(.+)\\\\Lib\\\\RestAPI\\\\(.+)\\\\Controller$/', $controllerClass, $matches)) {
            $moduleName = $matches[1];    // ModuleExampleRestAPIv3
            $resource = $matches[2];      // Tasks, Contacts, etc.

            // Derive: Modules\{Module}\Lib\RestAPI\{Resource}\DataStructure
            $dataStructureClass = "Modules\\{$moduleName}\\Lib\\RestAPI\\{$resource}\\DataStructure";

            // Verify class exists
            if (class_exists($dataStructureClass)) {
                return $dataStructureClass;
            }
        }

        return null;
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