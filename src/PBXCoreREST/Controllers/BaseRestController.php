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

namespace MikoPBX\PBXCoreREST\Controllers;

use MikoPBX\PBXCoreREST\Attributes\{HttpMapping, ResourceSecurity, ActionType};
use MikoPBX\PBXCoreREST\Services\SecurityResolver;

/**
 * Base RESTful controller for v3 API endpoints
 * 
 * This abstract class provides common functionality for all RESTful controllers,
 * including standard CRUD operations and custom method handling following Google API Design Guide.
 * 
 * Child classes need to:
 * 1. Define the processor class name by setting $processorClass property
 * 2. Optionally override action mapping in getActionMapping()
 * 3. Optionally define custom methods in getAllowedCustomMethods()
 * 4. Optionally override method validation in validateResourceLevelMethod()
 * 
 * @package MikoPBX\PBXCoreREST\Controllers
 */
abstract class BaseRestController extends BaseController
{
    /**
     * The processor class to handle requests
     * Must be defined in child classes
     *
     * @var string
     */
    protected string $processorClass = '';

    /**
     * Security resolver for automatic action type detection
     *
     * @var SecurityResolver|null
     */
    protected ?SecurityResolver $securityResolver = null;
    
    /**
     * Map of HTTP methods to processor actions
     * Can be overridden in child classes for custom mapping
     * 
     * @var array<string, array<string, string>>
     */
    protected array $actionMapping = [
        'GET' => [
            'collection' => 'getList',
            'resource' => 'getRecord'
        ],
        'POST' => [
            'collection' => 'create',
            'resource' => 'create'
        ],
        'PUT' => [
            'collection' => 'update',
            'resource' => 'update'
        ],
        'PATCH' => [
            'collection' => 'patch',
            'resource' => 'patch'
        ],
        'DELETE' => [
            'collection' => 'delete',
            'resource' => 'delete'
        ]
    ];
    
    /**
     * Get HTTP mapping from attributes or fallback to default implementation
     *
     * @return HttpMapping|null
     */
    protected function getHttpMapping(): ?HttpMapping
    {
        $reflection = new \ReflectionClass($this);
        $attributes = $reflection->getAttributes(HttpMapping::class);

        if (!empty($attributes)) {
            return $attributes[0]->newInstance();
        }

        return null;
    }

    /**
     * Define allowed custom methods for each HTTP method
     * Uses HttpMapping attribute if available, otherwise fallback to legacy method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        $httpMapping = $this->getHttpMapping();

        if ($httpMapping !== null) {
            $result = [];

            foreach ($httpMapping->mapping as $method => $operations) {
                $ops = is_string($operations) ? [$operations] : $operations;
                $customOps = array_intersect($ops, $httpMapping->customMethods);

                if (!empty($customOps)) {
                    $result[strtoupper($method)] = array_values($customOps);
                } else {
                    $result[strtoupper($method)] = [];
                }
            }

            return $result;
        }

        // Legacy fallback
        return [
            'GET' => [],
            'POST' => []
        ];
    }
    
    /**
     * Get action mapping for HTTP methods
     * Can be overridden in child classes for custom behavior
     * 
     * @return array<string, array<string, string>>
     */
    protected function getActionMapping(): array
    {
        return $this->actionMapping;
    }
    
    /**
     * Check if a custom method requires a resource ID
     * Uses HttpMapping attribute if available, otherwise fallback to legacy method
     *
     * @param string $method The custom method name
     * @return bool
     */
    protected function isResourceLevelMethod(string $method): bool
    {
        $httpMapping = $this->getHttpMapping();

        if ($httpMapping !== null) {
            return $httpMapping->requiresResourceId($method);
        }

        // Legacy fallback - define default resource-level methods
        $resourceLevelMethods = [
            'getStatus',
            'getHistory',
            'getStats',
            'forceCheck',
            'updateStatus',
            'enable',
            'disable',
            'uninstall',
            'reset',
            'restart',
            'startDownload',
            'getDownloadStatus'
        ];

        return in_array($method, $resourceLevelMethods, true);
    }

    /**
     * Get security resolver instance
     */
    public function getSecurityResolver(): SecurityResolver
    {
        if ($this->securityResolver === null) {
            $this->securityResolver = new SecurityResolver();
        }

        return $this->securityResolver;
    }

    /**
     * Get ResourceSecurity for a method (hybrid approach)
     */
    public function getResourceSecurity(string $methodName): ?ResourceSecurity
    {
        try {
            $reflection = new \ReflectionMethod($this, $methodName);
            return $this->getSecurityResolver()->getResourceSecurity($reflection);
        } catch (\ReflectionException $e) {
            return null;
        }
    }

    /**
     * Get action type for a method (hybrid approach)
     */
    public function getActionType(string $methodName): ActionType
    {
        try {
            $reflection = new \ReflectionMethod($this, $methodName);
            return $this->getSecurityResolver()->resolveActionType($reflection);
        } catch (\ReflectionException $e) {
            return ActionType::READ;
        }
    }

    /**
     * Get permission string for a method (resource:action format)
     */
    public function getMethodPermission(string $methodName): ?string
    {
        try {
            $reflection = new \ReflectionMethod($this, $methodName);
            return $this->getSecurityResolver()->getMethodPermission($reflection);
        } catch (\ReflectionException $e) {
            return null;
        }
    }

    /**
     * Get all permissions for this controller
     *
     * @return array<string>
     */
    public function getControllerPermissions(): array
    {
        return $this->getSecurityResolver()->extractControllerPermissions(static::class);
    }

    /**
     * Get security analysis for this controller
     *
     * @return array<string, mixed>
     */
    public function getSecurityAnalysis(): array
    {
        return $this->getSecurityResolver()->analyzeControllerSecurity(static::class);
    }
    
    /**
     * Handle standard CRUD requests (GET, POST, PUT, PATCH, DELETE)
     * 
     * @param string|null $id Resource ID for single resource operations
     * @return void
     */
    public function handleCRUDRequest(?string $id = null): void
    {
        // Validate processor class is set
        if (empty($this->processorClass)) {
            $this->sendErrorResponse('Processor class not configured', 500);
            return;
        }
        
        // Sanitize all input data
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        // Add ID to request data if provided in URL
        if (!empty($id)) {
            $requestData['id'] = $id;
        }
        
        // Get HTTP method and determine action
        $httpMethod = $this->request->getMethod();
        $action = $this->mapHttpMethodToAction($httpMethod, $id !== null);
        
        if ($action === null) {
            $this->sendErrorResponse("Invalid HTTP method: $httpMethod", 405);
            return;
        }
        
        // For POST/PUT/PATCH operations, pass HTTP method for processors that need it
        if (in_array($httpMethod, ['POST', 'PUT', 'PATCH'], true)) {
            $requestData['httpMethod'] = $httpMethod;
        }
        
        // Send request to backend worker
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            $action,
            $requestData
        );
    }
    
    /**
     * Handle custom method requests following Google API Design Guide
     * 
     * Handles both collection-level and resource-level custom methods.
     * For resource-level routes, parameters are passed in order: id, then customMethod
     * 
     * @param string|null $idOrMethod Either the ID (for resource routes) or method (for collection routes)
     * @param string|null $customMethod The custom method name (for resource routes) or null (for collection routes)
     * @return void
     */
    public function handleCustomRequest(?string $idOrMethod = null, ?string $customMethod = null): void
    {
        // Validate processor class is set
        if (empty($this->processorClass)) {
            $this->sendErrorResponse('Processor class not configured', 500);
            return;
        }

        // Determine if this is a collection-level or resource-level request
        $id = null;
        $actualMethod = null;

        if ($customMethod !== null) {
            // Resource-level: /resource/{id}:method
            $id = $idOrMethod;
            $actualMethod = $customMethod;
        } else {
            // Collection-level: /resource:method
            $actualMethod = $idOrMethod;
        }

        // Validate method name
        if (empty($actualMethod)) {
            $this->sendErrorResponse('Custom method name is required', 400);
            return;
        }

        // Check if method is allowed for this HTTP method
        $httpMethod = $this->request->getMethod();
        $allowedMethods = $this->getAllowedCustomMethods();

        if (!isset($allowedMethods[$httpMethod]) || !in_array($actualMethod, $allowedMethods[$httpMethod], true)) {
            $this->sendErrorResponse("Method '$actualMethod' is not allowed with HTTP $httpMethod", 405);
            return;
        }

        // Validate resource-level methods have an ID
        if ($this->isResourceLevelMethod($actualMethod) && empty($id)) {
            $this->sendErrorResponse("Method '$actualMethod' requires a resource ID", 400);
            return;
        }

        // Sanitize all input data
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        // Add ID if provided for resource-specific custom methods
        if (!empty($id)) {
            $requestData['id'] = $id;
        }

        // Map custom method name to processor action (can be overridden in child classes)
        $processorAction = $this->mapCustomMethodToAction($actualMethod);

        // Send request to backend worker with mapped action
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            $processorAction,
            $requestData
        );
    }

    /**
     * Map custom method name to processor action
     * Override in child classes to provide custom mapping
     *
     * @param string $methodName The custom method name from the route
     * @return string The processor action name
     */
    protected function mapCustomMethodToAction(string $methodName): string
    {
        // Default: use method name as-is
        return $methodName;
    }

    /**
     * Handle resource-level custom method requests (e.g., /resource/{id}:method)
     *
     * This is an alias for handleCustomRequest optimized for resource-level routes
     * where the ID and method are passed as separate parameters.
     *
     * @param string $id The resource ID
     * @param string $customMethod The custom method name
     * @return void
     */
    public function handleResourceCustomRequest(string $id, string $customMethod): void
    {
        $this->handleCustomRequest($id, $customMethod);
    }

    /**
     * Map HTTP method to processor action
     * 
     * @param string $httpMethod The HTTP method
     * @param bool $hasId Whether an ID is present (resource vs collection)
     * @return string|null The processor action or null if invalid
     */
    protected function mapHttpMethodToAction(string $httpMethod, bool $hasId): ?string
    {
        $mapping = $this->getActionMapping();
        $context = $hasId ? 'resource' : 'collection';
        
        // Special handling for GET
        if ($httpMethod === 'GET') {
            return $hasId ? ($mapping['GET']['resource'] ?? 'getRecord') : ($mapping['GET']['collection'] ?? 'getList');
        }
        
        // For other methods, use the same action regardless of context unless specified
        return $mapping[$httpMethod][$context] ?? $mapping[$httpMethod]['collection'] ?? null;
    }
    
    /**
     * Send error response
     * 
     * @param string $message Error message
     * @param int $statusCode HTTP status code
     * @return void
     */
    protected function sendErrorResponse(string $message, int $statusCode = 400): void
    {
        $this->response->setJsonContent([
            'result' => false,
            'messages' => ['error' => [$message]]
        ]);
        
        $statusText = match ($statusCode) {
            400 => 'Bad Request',
            405 => 'Method Not Allowed',
            500 => 'Internal Server Error',
            default => 'Error'
        };
        
        $this->response->setStatusCode($statusCode, $statusText);
        $this->response->send();
    }
}