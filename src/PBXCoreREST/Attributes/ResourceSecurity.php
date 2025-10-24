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
}