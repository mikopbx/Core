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

/**
 * Action types for RBAC permission system
 *
 * Defines the types of actions that can be performed on resources
 * following the Resource:Action RBAC pattern.
 *
 * @package MikoPBX\PBXCoreREST\Attributes
 */
enum ActionType: string
{
    /**
     * Read operations - viewing, listing, getting data
     * Examples: GET /users, GET /users/{id}
     */
    case READ = 'read';

    /**
     * Write operations - creating, updating, deleting
     * Examples: POST /users, PUT /users/{id}, DELETE /users/{id}
     */
    case WRITE = 'write';

    /**
     * Administrative operations - system management, configuration
     * Examples: restart system, backup, reset settings
     */
    case ADMIN = 'admin';

    /**
     * Sensitive operations - access to confidential data
     * Examples: viewing passwords, financial data, personal information
     */
    case SENSITIVE = 'sensitive';

    /**
     * Get human-readable description of the action type
     */
    public function getDescription(): string
    {
        return match($this) {
            self::READ => 'Read access - view and list resources',
            self::WRITE => 'Write access - create, update, delete resources',
            self::ADMIN => 'Administrative access - system management operations',
            self::SENSITIVE => 'Sensitive access - confidential data operations'
        };
    }

    /**
     * Check if this action type includes another action type
     * Used for permission inheritance (admin includes write, write includes read)
     */
    public function includes(ActionType $other): bool
    {
        return match($this) {
            self::ADMIN => true,  // Admin can do everything
            self::SENSITIVE => in_array($other, [self::READ, self::SENSITIVE], true),
            self::WRITE => in_array($other, [self::READ, self::WRITE], true),
            self::READ => $other === self::READ
        };
    }

    /**
     * Get all action types that this action type can perform
     *
     * @return array<ActionType>
     */
    public function getAllowedActions(): array
    {
        return match($this) {
            self::ADMIN => [self::READ, self::WRITE, self::ADMIN, self::SENSITIVE],
            self::SENSITIVE => [self::READ, self::SENSITIVE],
            self::WRITE => [self::READ, self::WRITE],
            self::READ => [self::READ]
        };
    }
}