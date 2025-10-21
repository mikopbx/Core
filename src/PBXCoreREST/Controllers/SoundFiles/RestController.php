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

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\SoundFilesManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\SoundFiles\DataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameterRef,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    HttpMapping,
    ResourceSecurity
};
use MikoPBX\PBXCoreREST\Lib\Common\CommonDataStructure;

/**
 * RESTful controller for sound files management (v3 API)
 *
 * Comprehensive sound file management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods for file upload, playback, and selection.
 * Supports various audio formats with automatic conversion capabilities.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\SoundFiles
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/sound-files',    
    tags: ['Sound files'],
    description: 'rest_SoundFiles_ApiDescription',
    processor: SoundFilesManagementProcessor::class
)]
#[ResourceSecurity('sound_files', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'getForSelect', 'playback'],
        'HEAD' => ['playback'],
        'POST' => ['create', 'uploadFile', 'convertAudioFile'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create', 'playback'],
    customMethods: ['getDefault', 'getForSelect', 'uploadFile', 'convertAudioFile', 'playback'],
    idPattern: '[a-zA-Z0-9_-]+'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = SoundFilesManagementProcessor::class;

    /**
     * Get list of all sound files
     *
     * @route GET /pbxcore/api/v3/sound-files
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_sf_GetList',
        description: 'rest_sf_GetListDesc',
        operationId: 'getSoundFilesList'
    )]
    #[ApiParameterRef('category')]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific sound file by ID
     *
     * @route GET /pbxcore/api/v3/sound-files/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_sf_GetRecord',
        description: 'rest_sf_GetRecordDesc',
        operationId: 'getSoundFileById'
    )]
    #[ApiParameterRef('id', example: 'custom_welcome')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new sound file
     *
     * @route POST /pbxcore/api/v3/sound-files
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_sf_Create',
        description: 'rest_sf_CreateDesc',
        operationId: 'createSoundFile'
    )]
    #[ApiParameterRef('name', required: true)]
    #[ApiParameterRef('category')]
    #[ApiParameterRef('path')]
    #[ApiResponse(201, 'rest_response_201_created')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function create(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update sound file (full replacement)
     *
     * @route PUT /pbxcore/api/v3/sound-files/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_sf_Update',
        description: 'rest_sf_UpdateDesc',
        operationId: 'updateSoundFile'
    )]
    #[ApiParameterRef('id', example: 'custom_welcome')]
    #[ApiParameterRef('name', required: true)]
    #[ApiParameterRef('category')]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function update(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update sound file
     *
     * @route PATCH /pbxcore/api/v3/sound-files/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_sf_Patch',
        description: 'rest_sf_PatchDesc',
        operationId: 'patchSoundFile'
    )]
    #[ApiParameterRef('id', example: 'custom_welcome')]
    #[ApiParameterRef('name')]
    #[ApiResponse(200, 'rest_response_200_patched')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function patch(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Delete a sound file
     *
     * @route DELETE /pbxcore/api/v3/sound-files/{id}
     */
    #[ApiOperation(
        summary: 'rest_sf_Delete',
        description: 'rest_sf_DeleteDesc',
        operationId: 'deleteSoundFile'
    )]
    #[ApiParameterRef('id', example: 'custom_welcome')]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function delete(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get default values for new sound file
     *
     * @route GET /pbxcore/api/v3/sound-files:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_sf_GetDefault',
        description: 'rest_sf_GetDefaultDesc',
        operationId: 'getSoundFileDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get sound files formatted for dropdown select
     *
     * @route GET /pbxcore/api/v3/sound-files:getForSelect
     */
    #[ApiOperation(
        summary: 'rest_sf_GetForSelect',
        description: 'rest_sf_GetForSelectDesc',
        operationId: 'getSoundFilesForSelect'
    )]
    #[ApiParameterRef('category', example: 'moh')]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getForSelect(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Play back sound file (stream audio)
     *
     * @route GET /pbxcore/api/v3/sound-files:playback
     */
    #[ApiOperation(
        summary: 'rest_sf_Playback',
        description: 'rest_sf_PlaybackDesc',
        operationId: 'playSoundFile'
    )]
    #[ApiParameterRef('view', required: true)]
    #[ApiParameterRef('download')]
    #[ApiParameterRef('filename')]
    #[ApiResponse(200, 'rest_response_200_audio_stream')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function playback(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Upload sound file (multipart/form-data)
     *
     * @route POST /pbxcore/api/v3/sound-files:uploadFile
     */
    #[ApiOperation(
        summary: 'rest_sf_UploadFile',
        description: 'rest_sf_UploadFileDesc',
        operationId: 'uploadSoundFile'
    )]
    #[ApiResponse(200, 'rest_response_200_uploaded')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function uploadFile(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Convert audio file to system format
     *
     * @route POST /pbxcore/api/v3/sound-files:convertAudioFile
     */
    #[ApiOperation(
        summary: 'rest_sf_ConvertAudioFile',
        description: 'rest_sf_ConvertAudioFileDesc',
        operationId: 'convertAudioFile'
    )]
    #[ApiParameterRef('filePath', required: true)]
    #[ApiParameterRef('category', example: 'moh')]
    #[ApiResponse(200, 'rest_response_200_converted')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function convertAudioFile(): void
    {
        // Implementation handled by BaseRestController
    }
}