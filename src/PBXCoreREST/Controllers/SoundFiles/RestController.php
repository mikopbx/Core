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
    ApiParameter,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    ParameterLocation,
    HttpMapping,
    ResourceSecurity
};

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
    tags: ['Sound Files', 'Media'],
    description: 'Sound file management for IVR menus, MOH, announcements and system prompts. ' .
                'Supports upload, conversion, playback and CRUD operations for audio files. ' .
                'Handles multiple audio formats with automatic conversion to system-compatible formats.',
    processor: SoundFilesManagementProcessor::class
)]
#[ResourceSecurity('sound_files', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'getForSelect', 'playback'],
        'POST' => ['create', 'uploadFile', 'convertAudioFile'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete', 'playback'],
    collectionLevelMethods: ['getList', 'create'],
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
    #[ApiParameter('category', 'string', 'rest_param_sf_category', ParameterLocation::QUERY, required: false, enum: ['custom', 'moh', 'system'], example: 'custom')]
    #[ApiParameter('offset', 'integer', 'rest_param_offset', ParameterLocation::QUERY, required: false, minimum: 0, example: 0)]
    #[ApiParameter('limit', 'integer', 'rest_param_limit', ParameterLocation::QUERY, required: false, minimum: 1, maximum: 100, default: 20, example: 20)]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, example: 'custom_welcome')]
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
    #[ApiParameter('name', 'string', 'rest_param_sf_name', ParameterLocation::QUERY, required: true, maxLength: 200, example: 'Welcome Message')]
    #[ApiParameter('category', 'string', 'rest_param_sf_category', ParameterLocation::QUERY, required: false, enum: ['custom', 'moh'], default: 'custom', example: 'custom')]
    #[ApiParameter('path', 'string', 'rest_param_sf_path', ParameterLocation::QUERY, required: false, maxLength: 500, example: '/tmp/upload/audio.wav')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, example: 'custom_welcome')]
    #[ApiParameter('name', 'string', 'rest_param_sf_name', ParameterLocation::QUERY, required: true, maxLength: 200, example: 'Updated Welcome')]
    #[ApiParameter('category', 'string', 'rest_param_sf_category', ParameterLocation::QUERY, required: false, enum: ['custom', 'moh'], example: 'custom')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, example: 'custom_welcome')]
    #[ApiParameter('name', 'string', 'rest_param_sf_name', ParameterLocation::QUERY, required: false, maxLength: 200, example: 'New Name')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, example: 'custom_welcome')]
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
    #[ApiParameter('category', 'string', 'rest_param_sf_category', ParameterLocation::QUERY, required: false, enum: ['custom', 'moh', 'system'], example: 'moh')]
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
     * @route GET /pbxcore/api/v3/sound-files/{id}:playback
     */
    #[ApiOperation(
        summary: 'rest_sf_Playback',
        description: 'rest_sf_PlaybackDesc',
        operationId: 'playSoundFile'
    )]
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, example: 'custom_welcome')]
    #[ApiResponse(200, 'rest_response_200_audio_stream')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function playback(string $id): void
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
    #[ApiParameter('file', 'file', 'rest_param_sf_file', ParameterLocation::QUERY, required: true, example: 'audio.wav')]
    #[ApiParameter('resumableChunkNumber', 'integer', 'rest_param_sf_chunk_number', ParameterLocation::QUERY, required: false, example: 1)]
    #[ApiParameter('resumableTotalChunks', 'integer', 'rest_param_sf_total_chunks', ParameterLocation::QUERY, required: false, example: 5)]
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
    #[ApiParameter('filePath', 'string', 'rest_param_sf_file_path', ParameterLocation::QUERY, required: true, maxLength: 500, example: '/tmp/audio.mp3')]
    #[ApiParameter('category', 'string', 'rest_param_sf_category', ParameterLocation::QUERY, required: false, enum: ['custom', 'moh'], default: 'custom', example: 'moh')]
    #[ApiResponse(200, 'rest_response_200_converted')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function convertAudioFile(): void
    {
        // Implementation handled by BaseRestController
    }
}