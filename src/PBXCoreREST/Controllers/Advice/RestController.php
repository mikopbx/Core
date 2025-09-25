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

namespace MikoPBX\PBXCoreREST\Controllers\Advice;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\AdviceProcessor;

/**
 * RESTful controller for system advice and notifications (v3 API)
 *
 * Provides system notifications about configuration issues, security warnings,
 * and recommendations. This is a read-only resource with custom methods only.
 *
 * @RoutePrefix("/pbxcore/api/v3/advice")
 *
 * @examples Custom methods:
 * GET    /pbxcore/api/v3/advice:getList     - Get all system advice/notifications
 * GET    /pbxcore/api/v3/advice:refresh     - Force refresh advice cache
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Advice
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     */
    protected string $processorClass = AdviceProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getList', 'refresh'],
            'POST' => ['refresh'] // Allow POST for refresh operations
        ];
    }

    /**
     * Check if a custom method requires a resource ID
     * Since advice is a collection-level resource, no methods require IDs
     *
     * @param string $method The custom method name
     * @return bool
     */
    protected function isResourceLevelMethod(string $method): bool
    {
        // All advice methods are collection-level
        return false;
    }
}