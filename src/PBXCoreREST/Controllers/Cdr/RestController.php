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

namespace MikoPBX\PBXCoreREST\Controllers\Cdr;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\CdrManagementProcessor;

/**
 * RESTful controller for CDR (Call Detail Records) management (v3 API)
 *
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 *
 * @RoutePrefix("/pbxcore/api/v3/cdr")
 *
 * @examples Standard CRUD operations:
 *
 * # List all CDR records with filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/cdr?limit=50&offset=0"
 *
 * # Get specific CDR record
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/cdr/123
 *
 * @examples Custom method operations:
 *
 * # Get active calls
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/cdr:getActiveCalls
 *
 * # Get active channels
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/cdr:getActiveChannels
 *
 * # Stream CDR recording with range support (handled automatically by BaseController)
 * curl -H "Range: bytes=0-1024" http://127.0.0.1/pbxcore/api/v3/cdr:playback?view=/path/to/recording.mp3
 *
 * # Download CDR recording
 * curl http://127.0.0.1/pbxcore/api/v3/cdr:playback?view=/path/to/recording.mp3&download=true&filename=call.mp3
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Cdr
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = CdrManagementProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getActiveCalls', 'getActiveChannels', 'playback']
        ];
    }
}