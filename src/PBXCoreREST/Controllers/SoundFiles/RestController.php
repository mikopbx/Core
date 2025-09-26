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

namespace MikoPBX\PBXCoreREST\Controllers\SoundFiles;

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\SoundFilesManagementProcessor;
use MikoPBX\PBXCoreREST\Services\AudioFileService;

/**
 * RESTful controller for sound files management (v3 API)
 *
 * Handles both standard CRUD operations and custom methods following Google API Design Guide patterns.
 * This controller implements a clean RESTful interface with proper HTTP methods and resource-oriented URLs.
 *
 * @RoutePrefix("/pbxcore/api/v3/sound-files")
 *
 * @examples Standard CRUD operations:
 *
 * # List all sound files with filtering
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/sound-files?category=custom"
 *
 * # Get specific sound file
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/sound-files/123
 *
 * # Create new sound file metadata
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/sound-files \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Welcome Message","category":"custom","path":"/tmp/welcome.wav"}'
 *
 * # Full update (replace) sound file metadata
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/sound-files/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"Updated Welcome","category":"custom","path":"/tmp/welcome2.wav"}'
 *
 * # Partial update (modify) sound file metadata
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/sound-files/123 \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"New Name"}'
 *
 * # Delete sound file
 * curl -X DELETE http://127.0.0.1/pbxcore/api/v3/sound-files/123
 *
 * @examples Custom method operations:
 *
 * # Get default values for new sound file
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/sound-files:getDefault
 *
 * # Upload sound file (used with Resumable.js)
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/sound-files:uploadFile \
 *      -H "Content-Type: multipart/form-data" \
 *      -F "file=@audio.wav"
 *
 * # Get sound files for dropdown select
 * curl -X GET "http://127.0.0.1/pbxcore/api/v3/sound-files:getForSelect?category=moh"
 *
 * @package MikoPBX\PBXCoreREST\Controllers\SoundFiles
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = SoundFilesManagementProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getDefault', 'getForSelect', 'playback'],
            'POST' => ['uploadFile']
        ];
    }

}