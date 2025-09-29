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

use MikoPBX\PBXCoreREST\Attributes\{ActionType, ResourceSecurity, HttpMapping};
use ReflectionMethod;
use ReflectionClass;

/**
 * Security resolver for automatic action type detection
 *
 * Determines ActionType using hybrid approach:
 * 1. Explicit ResourceSecurity attribute (highest priority)
 * 2. HTTP method mapping from HttpMapping attribute
 * 3. Method name heuristics (fallback)
 *
 * @package MikoPBX\PBXCoreREST\Services
 */
class SecurityResolver
{
    /**
     * Mapping of HTTP methods to default action types
     *
     * @var array<string, ActionType>
     */
    private array $httpMethodMapping;

    /**
     * Method name patterns that override HTTP method mapping
     *
     * @var array<string, ActionType>
     */
    private array $methodNameOverrides;

    public function __construct()
    {
        $this->httpMethodMapping = [
            'GET' => ActionType::READ,
            'POST' => ActionType::WRITE,
            'PUT' => ActionType::WRITE,
            'PATCH' => ActionType::WRITE,
            'DELETE' => ActionType::WRITE,
        ];

        $this->methodNameOverrides = [
            // Admin operations (usually GET but need admin rights)
            'restart' => ActionType::ADMIN,
            'reboot' => ActionType::ADMIN,
            'backup' => ActionType::ADMIN,
            'restore' => ActionType::ADMIN,
            'reset' => ActionType::ADMIN,
            'clear' => ActionType::ADMIN,
            'flush' => ActionType::ADMIN,
            'reload' => ActionType::ADMIN,
            'testConnection' => ActionType::ADMIN,
            'diagnose' => ActionType::ADMIN,

            // Sensitive operations (reading confidential data)
            'getPassword' => ActionType::SENSITIVE,
            'getSecret' => ActionType::SENSITIVE,
            'getKey' => ActionType::SENSITIVE,
            'getToken' => ActionType::SENSITIVE,
            'getLogs' => ActionType::SENSITIVE,
            'getCredentials' => ActionType::SENSITIVE,

            // Write operations that might look like reads
            'copy' => ActionType::WRITE,
            'clone' => ActionType::WRITE,
            'duplicate' => ActionType::WRITE,
            'generate' => ActionType::WRITE,
            'create' => ActionType::WRITE,
            'save' => ActionType::WRITE,
            'store' => ActionType::WRITE,
            'upload' => ActionType::WRITE,
            'import' => ActionType::WRITE,
            'export' => ActionType::WRITE,
            'send' => ActionType::WRITE,
            'process' => ActionType::WRITE,

            // Explicit read operations
            'get' => ActionType::READ,
            'list' => ActionType::READ,
            'find' => ActionType::READ,
            'search' => ActionType::READ,
            'view' => ActionType::READ,
            'show' => ActionType::READ,
            'display' => ActionType::READ,
            'fetch' => ActionType::READ,
            'load' => ActionType::READ,
        ];
    }

    /**
     * Resolve action type for a method
     */
    public function resolveActionType(ReflectionMethod $method): ActionType
    {
        // 1. Check for explicit ResourceSecurity attribute (highest priority)
        $resourceSecurity = $this->getResourceSecurity($method);
        if ($resourceSecurity && $resourceSecurity->action !== null) {
            return $resourceSecurity->action;
        }

        // 2. Check HTTP method mapping from HttpMapping attribute
        $httpMethod = $this->getHttpMethodForMethod($method);
        if ($httpMethod !== null) {
            // Check if method name should override HTTP method mapping
            $methodNameAction = $this->getActionFromMethodName($method->getName());
            if ($methodNameAction !== null) {
                return $methodNameAction;
            }

            // Use HTTP method mapping
            return $this->httpMethodMapping[$httpMethod] ?? ActionType::READ;
        }

        // 3. Fallback to method name heuristics
        return $this->getActionFromMethodName($method->getName()) ?? ActionType::READ;
    }

    /**
     * Get ResourceSecurity attribute from method or class
     */
    public function getResourceSecurity(ReflectionMethod $method): ?ResourceSecurity
    {
        // Check method level first
        $attributes = $method->getAttributes(ResourceSecurity::class);
        if (!empty($attributes)) {
            return $attributes[0]->newInstance();
        }

        // Check class level
        $classAttributes = $method->getDeclaringClass()->getAttributes(ResourceSecurity::class);
        if (!empty($classAttributes)) {
            return $classAttributes[0]->newInstance();
        }

        return null;
    }

    /**
     * Get HTTP method for a method from HttpMapping attribute
     */
    public function getHttpMethodForMethod(ReflectionMethod $method): ?string
    {
        $class = $method->getDeclaringClass();
        $httpMappingAttributes = $class->getAttributes(HttpMapping::class);

        if (empty($httpMappingAttributes)) {
            return null;
        }

        $httpMapping = $httpMappingAttributes[0]->newInstance();
        return $httpMapping->getHttpMethodForOperation($method->getName());
    }

    /**
     * Get action type from method name using heuristics
     */
    public function getActionFromMethodName(string $methodName): ?ActionType
    {
        // Direct method name match
        if (isset($this->methodNameOverrides[$methodName])) {
            return $this->methodNameOverrides[$methodName];
        }

        // Pattern matching
        foreach ($this->methodNameOverrides as $pattern => $actionType) {
            if (str_starts_with($methodName, $pattern)) {
                return $actionType;
            }
        }

        // Special patterns
        if (preg_match('/^(get|fetch|load|show|display|view|list|find|search)/', $methodName)) {
            return ActionType::READ;
        }

        if (preg_match('/^(create|save|store|update|modify|edit|delete|remove|add|insert)/', $methodName)) {
            return ActionType::WRITE;
        }

        if (preg_match('/^(restart|reboot|reset|clear|flush|reload|backup|restore|test|diagnose)/', $methodName)) {
            return ActionType::ADMIN;
        }

        if (preg_match('/^(password|secret|key|token|credential|private)/', $methodName)) {
            return ActionType::SENSITIVE;
        }

        return null; // Unknown, let caller decide default
    }

    /**
     * Get all permissions for a method
     *
     * @return array<string>
     */
    public function getMethodPermissions(ReflectionMethod $method): array
    {
        $resourceSecurity = $this->getResourceSecurity($method);
        if (!$resourceSecurity) {
            return [];
        }

        $actionType = $this->resolveActionType($method);
        return $resourceSecurity->getAllPermissions($actionType);
    }

    /**
     * Get primary permission for a method (resource:action format)
     */
    public function getMethodPermission(ReflectionMethod $method): ?string
    {
        $resourceSecurity = $this->getResourceSecurity($method);
        if (!$resourceSecurity) {
            return null;
        }

        $actionType = $this->resolveActionType($method);
        return $resourceSecurity->getPermission($actionType);
    }

    /**
     * Check if method allows specific permission
     */
    public function methodAllowsPermission(ReflectionMethod $method, string $permission): bool
    {
        $resourceSecurity = $this->getResourceSecurity($method);
        if (!$resourceSecurity) {
            return false;
        }

        $actionType = $this->resolveActionType($method);
        return $resourceSecurity->allowsPermission($permission, $actionType);
    }

    /**
     * Analyze controller class and extract all unique permissions
     *
     * @return array<string>
     */
    public function extractControllerPermissions(string $controllerClass): array
    {
        $permissions = [];
        $reflection = new ReflectionClass($controllerClass);

        foreach ($reflection->getMethods() as $method) {
            if ($method->isPublic() && !$method->isStatic() && !$method->isConstructor()) {
                $methodPermissions = $this->getMethodPermissions($method);
                $permissions = array_merge($permissions, $methodPermissions);
            }
        }

        return array_unique($permissions);
    }

    /**
     * Get security analysis for a controller
     *
     * @return array<string, mixed>
     */
    public function analyzeControllerSecurity(string $controllerClass): array
    {
        $analysis = [
            'class' => $controllerClass,
            'permissions' => [],
            'methods' => [],
            'resources' => [],
            'actions' => []
        ];

        $reflection = new ReflectionClass($controllerClass);

        foreach ($reflection->getMethods() as $method) {
            if ($method->isPublic() && !$method->isStatic() && !$method->isConstructor()) {
                $actionType = $this->resolveActionType($method);
                $resourceSecurity = $this->getResourceSecurity($method);
                $permission = $this->getMethodPermission($method);

                $methodAnalysis = [
                    'name' => $method->getName(),
                    'action_type' => $actionType->value,
                    'resource' => $resourceSecurity?->resource,
                    'permission' => $permission,
                    'http_method' => $this->getHttpMethodForMethod($method),
                    'explicit_security' => $resourceSecurity?->action !== null
                ];

                $analysis['methods'][] = $methodAnalysis;

                if ($permission) {
                    $analysis['permissions'][] = $permission;
                }

                if ($resourceSecurity) {
                    $analysis['resources'][] = $resourceSecurity->resource;
                }

                $analysis['actions'][] = $actionType->value;
            }
        }

        // Remove duplicates and sort
        $analysis['permissions'] = array_unique($analysis['permissions']);
        $analysis['resources'] = array_unique($analysis['resources']);
        $analysis['actions'] = array_unique($analysis['actions']);

        sort($analysis['permissions']);
        sort($analysis['resources']);
        sort($analysis['actions']);

        return $analysis;
    }
}