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
 * Security requirement types for MikoPBX API
 *
 * Reflects the three main access channels in MikoPBX:
 * 1. LOCALHOST - Direct local access without authentication
 * 2. SESSION - Web interface with user roles and ACL
 * 3. BEARER_TOKEN - Bearer token access with scope-based permissions
 */
enum SecurityType: string
{
    /**
     * Local host access (127.0.0.1) - always allowed for debugging and internal operations
     */
    case LOCALHOST = 'localhost';

    /**
     * Web session access - requires user authentication with roles and ACL permissions
     */
    case SESSION = 'session';

    /**
     * Bearer token access - requires Authorization: Bearer token with specific scopes
     */
    case BEARER_TOKEN = 'bearer_token';

    /**
     * Public access - no authentication required (OAuth callbacks, webhooks)
     */
    case PUBLIC = 'public';

    /**
     * Get human-readable description of the security type
     */
    public function getDescription(): string
    {
        return match($this) {
            self::LOCALHOST => 'Local host access - no authentication required for 127.0.0.1',
            self::SESSION => 'Web session access - requires user login with roles and permissions',
            self::BEARER_TOKEN => 'Bearer token access - requires Authorization: Bearer token with specific scopes',
            self::PUBLIC => 'Public access - no authentication required for anyone'
        };
    }

    /**
     * Check if this security type requires authentication
     */
    public function requiresAuthentication(): bool
    {
        return match($this) {
            self::LOCALHOST, self::PUBLIC => false,
            self::SESSION, self::BEARER_TOKEN => true
        };
    }

    /**
     * Check if this security type supports resource:action permissions
     */
    public function supportsResourcePermissions(): bool
    {
        return match($this) {
            self::SESSION, self::BEARER_TOKEN => true,
            self::LOCALHOST, self::PUBLIC => false
        };
    }

    /**
     * Get the priority order for security type checking (higher = checked first)
     */
    public function getPriority(): int
    {
        return match($this) {
            self::PUBLIC => 1,      // Check public first
            self::LOCALHOST => 2,   // Then localhost
            self::BEARER_TOKEN => 3, // Then Bearer token
            self::SESSION => 4      // Session last (most complex)
        };
    }
}