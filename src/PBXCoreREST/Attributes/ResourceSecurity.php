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

namespace MikoPBX\PBXCoreREST\Attributes;

use Attribute;

/**
 * Resource-based security attribute for RBAC system
 *
 * Defines security requirements using Resource:Action pattern instead of
 * granular permissions. This simplifies role management and follows
 * modern RBAC best practices (AWS IAM, Kubernetes RBAC).
 *
 * @package MikoPBX\PBXCoreREST\Attributes
 */
#[Attribute(Attribute::TARGET_CLASS | Attribute::TARGET_METHOD)]
class ResourceSecurity
{
    /**
     * @param string $resource Resource name (e.g., 'call_queues', 'mail_settings')
     * @param ActionType|null $action Action type (auto-detected if null)
     * @param array<SecurityType> $requirements Security requirements
     * @param bool $optional Whether security is optional
     * @param string $description Description of security requirements
     * @param array<string, mixed> $extensions Custom security extensions
     */
    public function __construct(
        public readonly string $resource,
        public readonly ?ActionType $action = null,
        ?array $requirements = null,
        public readonly bool $optional = false,
        public readonly string $description = '',
        public readonly array $extensions = []
    ) {
        // Set default requirements if not provided - use empty array if not specified
        $this->requirements = $requirements ?? [];
    }

    /**
     * Security requirements for this resource
     *
     * @var array<SecurityType>
     */
    public readonly array $requirements;

    /**
     * Get the permission string in Resource:Action format
     */
    public function getPermission(?ActionType $resolvedAction = null): string
    {
        $actionType = $this->action ?? $resolvedAction ?? ActionType::READ;
        return "{$this->resource}:{$actionType->value}";
    }

    /**
     * Get all permissions that this resource security grants
     * Takes into account action type hierarchy
     *
     * @return array<string>
     */
    public function getAllPermissions(?ActionType $resolvedAction = null): array
    {
        $actionType = $this->action ?? $resolvedAction ?? ActionType::READ;
        $permissions = [];

        foreach ($actionType->getAllowedActions() as $allowedAction) {
            $permissions[] = "{$this->resource}:{$allowedAction->value}";
        }

        return $permissions;
    }

    /**
     * Check if this security allows a specific permission
     */
    public function allowsPermission(string $permission, ?ActionType $resolvedAction = null): bool
    {
        $actionType = $this->action ?? $resolvedAction ?? ActionType::READ;

        // Parse the requested permission
        if (!str_contains($permission, ':')) {
            return false;
        }

        [$requestedResource, $requestedActionStr] = explode(':', $permission, 2);

        // Check resource match
        if ($requestedResource !== $this->resource && $requestedResource !== '*') {
            return false;
        }

        // Parse requested action
        $requestedAction = ActionType::tryFrom($requestedActionStr);
        if ($requestedAction === null) {
            return false;
        }

        // Check if our action type includes the requested action
        return $actionType->includes($requestedAction);
    }

    /**
     * Convert to OpenAPI security format
     *
     * @return array<string, mixed>
     */
    public function toOpenApi(?ActionType $resolvedAction = null): array
    {
        $actionType = $this->action ?? $resolvedAction ?? ActionType::READ;

        return [
            'resource_security' => [
                'resource' => $this->resource,
                'action' => $actionType->value,
                'permission' => $this->getPermission($actionType)
            ]
        ];
    }

    /**
     * Get ACL rules from resource security
     *
     * @return array<string, mixed>
     */
    public function getAclRules(?ActionType $resolvedAction = null): array
    {
        $actionType = $this->action ?? $resolvedAction ?? ActionType::READ;

        return [
            'requirements' => array_map(fn($req) => $req->value, $this->requirements),
            'resource' => $this->resource,
            'action' => $actionType->value,
            'permission' => $this->getPermission($actionType),
            'permissions' => $this->getAllPermissions($actionType),
            'optional' => $this->optional,
            'description' => $this->description
        ];
    }

    /**
     * Check if operation is public (no authentication required)
     */
    public function isPublic(): bool
    {
        return in_array(SecurityType::PUBLIC, $this->requirements, true);
    }

    /**
     * Check if operation allows localhost access
     */
    public function allowsLocalhost(): bool
    {
        return in_array(SecurityType::LOCALHOST, $this->requirements, true);
    }


    /**
     * Create read-only resource security with all access types
     *
     * @param string $resource
     * @param array<SecurityType>|null $requirements
     */
    public static function readOnly(string $resource, ?array $requirements = null): self
    {
        $defaultRequirements = $requirements ?? [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN];
        return new self($resource, ActionType::READ, $defaultRequirements);
    }

    /**
     * Create write resource security with all access types
     *
     * @param string $resource
     * @param array<SecurityType>|null $requirements
     */
    public static function write(string $resource, ?array $requirements = null): self
    {
        $defaultRequirements = $requirements ?? [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN];
        return new self($resource, ActionType::WRITE, $defaultRequirements);
    }

    /**
     * Create admin resource security (localhost only for security)
     *
     * @param string $resource
     * @param array<SecurityType>|null $requirements
     */
    public static function admin(string $resource, ?array $requirements = null): self
    {
        $defaultRequirements = $requirements ?? [SecurityType::LOCALHOST];
        return new self($resource, ActionType::ADMIN, $defaultRequirements);
    }

    /**
     * Create sensitive resource security (localhost only for security)
     *
     * @param string $resource
     * @param array<SecurityType>|null $requirements
     */
    public static function sensitive(string $resource, ?array $requirements = null): self
    {
        $defaultRequirements = $requirements ?? [SecurityType::LOCALHOST];
        return new self($resource, ActionType::SENSITIVE, $defaultRequirements);
    }

    /**
     * Create public resource security (no authentication)
     */
    public static function public(string $resource): self
    {
        return new self($resource, ActionType::READ, [SecurityType::PUBLIC]);
    }

    /**
     * Create localhost-only resource security
     */
    public static function localhost(string $resource, ?ActionType $action = null): self
    {
        return new self($resource, $action, [SecurityType::LOCALHOST]);
    }

    /**
     * Create API key-only resource security
     */
    public static function apiKeyOnly(string $resource, ?ActionType $action = null): self
    {
        return new self($resource, $action, [SecurityType::BEARER_TOKEN]);
    }

    /**
     * Create resource security with all access types (localhost + bearer token)
     */
    public static function allAccess(string $resource, ?ActionType $action = null): self
    {
        return new self($resource, $action, [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN]);
    }
}