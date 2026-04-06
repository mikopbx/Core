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
 * Reflects the two main access channels in MikoPBX:
 * 1. LOCALHOST - Internal authorization (not exposed in OpenAPI documentation)
 * 2. BEARER_TOKEN - JWT or API Key authentication (documented in OpenAPI)
 */
enum SecurityType: string
{
    /**
     * Local host access (127.0.0.1) - internal authorization for debugging and system operations
     * Not exposed in OpenAPI documentation as it's only available to localhost requests
     */
    case LOCALHOST = 'localhost';

    /**
     * Bearer token access - requires Authorization: Bearer token with specific scopes
     * Can be either JWT (short-lived) or API Key (long-lived)
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
            self::LOCALHOST => 'Local host access - internal authorization for 127.0.0.1 (not in OpenAPI)',
            self::BEARER_TOKEN => 'Bearer token access - requires Authorization: Bearer token (JWT or API Key)',
            self::PUBLIC => 'Public access - no authentication required for anyone'
        };
    }
}