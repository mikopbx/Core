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
 * Parameter location types for OpenAPI specification
 *
 * Defines where a parameter can be located in an HTTP request.
 * Follows OpenAPI 3.1 specification for parameter locations.
 *
 * @see https://spec.openapis.org/oas/v3.1.0#parameter-locations
 */
enum ParameterLocation: string
{
    /**
     * Path parameter - part of the URL path (e.g., /users/{id})
     */
    case PATH = 'path';

    /**
     * Query parameter - part of the URL query string (e.g., ?limit=10)
     */
    case QUERY = 'query';

    /**
     * Header parameter - HTTP request header (e.g., Authorization: Bearer token)
     */
    case HEADER = 'header';

    /**
     * Cookie parameter - HTTP cookie (e.g., Cookie: sessionId=abc123)
     */
    case COOKIE = 'cookie';
}
