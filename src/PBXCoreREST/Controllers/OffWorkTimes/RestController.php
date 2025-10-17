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

namespace MikoPBX\PBXCoreREST\Controllers\OffWorkTimes;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\OutWorkTimesManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\OutWorkTimes\DataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\CommonDataStructure;
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

/**
 * RESTful controller for out-of-work-time conditions management (v3 API)
 *
 * Comprehensive time-based routing conditions following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods with automatic OpenAPI generation.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\OffWorkTimes
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/off-work-times',    
    tags: ['OffWorkTimes'],
    description: 'Time-based routing conditions for handling calls outside business hours. ' .
                'Features include time range definitions (daily, weekly, date-specific), ' .
                'holiday scheduling, action routing (forward to extension, play audio), ' .
                'and priority-based rule evaluation.',
    processor: OutWorkTimesManagementProcessor::class
)]
#[ResourceSecurity('off_work_times', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'copy'],
        'POST' => ['create', 'changePriorities'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete', 'copy'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['getDefault', 'changePriorities', 'copy'],
    idPattern: '[0-9]+'  // Numeric ID only (model uses id, not uniqid)
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = OutWorkTimesManagementProcessor::class;


    /**
     * Get list of all time conditions with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/off-work-times
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_owt_GetList',
        description: 'rest_owt_GetListDesc',
        operationId: 'getOffWorkTimesList'
    )]
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: 'holiday')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['priority', 'description', 'date_from', 'date_to'])]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific time condition by ID
     *
     * @route GET /pbxcore/api/v3/off-work-times/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_owt_GetRecord',
        description: 'rest_owt_GetRecordDesc',
        operationId: 'getOffWorkTimeById'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '15')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create a new time condition
     *
     * @route POST /pbxcore/api/v3/off-work-times
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_owt_Create',
        description: 'rest_owt_CreateDesc',
        operationId: 'createOffWorkTime'
    )]
    #[ApiParameterRef('description', required: true)]
    #[ApiParameterRef('calType')]
    #[ApiParameterRef('date_from')]
    #[ApiParameterRef('date_to')]
    #[ApiParameterRef('weekday_from')]
    #[ApiParameterRef('weekday_to')]
    #[ApiParameterRef('time_from')]
    #[ApiParameterRef('time_to')]
    #[ApiParameterRef('calUrl')]
    #[ApiParameterRef('calUser')]
    #[ApiParameterRef('calSecret')]
    #[ApiParameterRef('action')]
    #[ApiParameterRef('extension')]
    #[ApiParameterRef('audio_message_id')]
    #[ApiParameterRef('priority')]
    #[ApiParameterRef('allowRestriction')]
    #[ApiParameterRef('allowedExtensions')]
    #[ApiParameterRef('incomingRouteIds')]
    #[ApiResponse(201, 'rest_response_201_created')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function create(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update an existing time condition (full replacement)
     *
     * @route PUT /pbxcore/api/v3/off-work-times/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_owt_Update',
        description: 'rest_owt_UpdateDesc',
        operationId: 'updateOffWorkTime'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '15')]
    #[ApiParameterRef('description', required: true)]
    #[ApiParameterRef('calType')]
    #[ApiParameterRef('date_from')]
    #[ApiParameterRef('date_to')]
    #[ApiParameterRef('weekday_from')]
    #[ApiParameterRef('weekday_to')]
    #[ApiParameterRef('time_from')]
    #[ApiParameterRef('time_to')]
    #[ApiParameterRef('calUrl')]
    #[ApiParameterRef('calUser')]
    #[ApiParameterRef('calSecret')]
    #[ApiParameterRef('action')]
    #[ApiParameterRef('extension')]
    #[ApiParameterRef('audio_message_id')]
    #[ApiParameterRef('priority')]
    #[ApiParameterRef('allowRestriction')]
    #[ApiParameterRef('allowedExtensions')]
    #[ApiParameterRef('incomingRouteIds')]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function update(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update an existing time condition
     *
     * @route PATCH /pbxcore/api/v3/off-work-times/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_owt_Patch',
        description: 'rest_owt_PatchDesc',
        operationId: 'patchOffWorkTime'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '15')]
    #[ApiParameterRef('description')]
    #[ApiParameterRef('calType')]
    #[ApiParameterRef('date_from')]
    #[ApiParameterRef('date_to')]
    #[ApiParameterRef('weekday_from')]
    #[ApiParameterRef('weekday_to')]
    #[ApiParameterRef('time_from')]
    #[ApiParameterRef('time_to')]
    #[ApiParameterRef('calUrl')]
    #[ApiParameterRef('calUser')]
    #[ApiParameterRef('calSecret')]
    #[ApiParameterRef('action')]
    #[ApiParameterRef('extension')]
    #[ApiParameterRef('audio_message_id')]
    #[ApiParameterRef('priority')]
    #[ApiParameterRef('allowRestriction')]
    #[ApiParameterRef('allowedExtensions')]
    #[ApiParameterRef('incomingRouteIds')]
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
     * Delete a time condition
     *
     * @route DELETE /pbxcore/api/v3/off-work-times/{id}
     */
    #[ApiOperation(
        summary: 'rest_owt_Delete',
        description: 'rest_owt_DeleteDesc',
        operationId: 'deleteOffWorkTime'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '15')]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    #[ApiResponse(409, 'rest_response_409_conflict', 'PBXApiResult')]
    public function delete(string $id): void
    {
        // Implementation handled by BaseRestController
    }


    /**
     * Get default template for new time condition
     *
     * @route GET /pbxcore/api/v3/off-work-times:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_owt_GetDefault',
        description: 'rest_owt_GetDefaultDesc',
        operationId: 'getOffWorkTimeDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Copy an existing time condition
     *
     * @route GET /pbxcore/api/v3/off-work-times/{id}:copy
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_owt_Copy',
        description: 'rest_owt_CopyDesc',
        operationId: 'copyOffWorkTime'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '15')]
    #[ApiResponse(200, 'rest_response_200_copied')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function copy(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update priority order for multiple time conditions
     *
     * @route POST /pbxcore/api/v3/off-work-times:changePriorities
     */
    #[ApiOperation(
        summary: 'rest_owt_ChangePriorities',
        description: 'rest_owt_ChangePrioritiesDesc',
        operationId: 'changeOffWorkTimePriorities'
    )]
    #[ApiParameterRef('priorities', required: true)]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function changePriorities(): void
    {
        // Implementation handled by BaseRestController
    }

}
