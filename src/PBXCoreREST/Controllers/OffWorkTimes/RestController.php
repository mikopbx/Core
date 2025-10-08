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
    tags: ['Off Work Times'],
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
    #[ApiParameter(
        name: 'limit',
        type: 'integer',
        description: 'rest_param_limit',
        in: ParameterLocation::QUERY,
        minimum: 1,
        maximum: 100,
        default: 20,
        example: 20
    )]
    #[ApiParameter(
        name: 'offset',
        type: 'integer',
        description: 'rest_param_offset',
        in: ParameterLocation::QUERY,
        minimum: 0,
        default: 0,
        example: 0
    )]
    #[ApiParameter(
        name: 'search',
        type: 'string',
        description: 'rest_param_search',
        in: ParameterLocation::QUERY,
        maxLength: 255,
        example: 'holiday'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'rest_param_order',
        in: ParameterLocation::QUERY,
        enum: ['priority', 'description', 'date_from', 'date_to'],
        default: 'priority',
        example: 'priority'
    )]
    #[ApiParameter(
        name: 'orderWay',
        type: 'string',
        description: 'rest_param_orderWay',
        in: ParameterLocation::QUERY,
        enum: ['ASC', 'DESC'],
        default: 'ASC',
        example: 'ASC'
    )]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[A-Z0-9-]+$', example: 'OUT-WORK-TIME-1A2B3C')]
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
    #[ApiParameter('description', 'string', 'rest_param_owt_description', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'Weekend Schedule')]
    #[ApiParameter('date_from', 'string', 'rest_param_owt_date_from', ParameterLocation::QUERY, required: false, pattern: '^\d{4}-\d{2}-\d{2}$', example: '2024-01-01')]
    #[ApiParameter('date_to', 'string', 'rest_param_owt_date_to', ParameterLocation::QUERY, required: false, pattern: '^\d{4}-\d{2}-\d{2}$', example: '2024-12-31')]
    #[ApiParameter('weekday_from', 'integer', 'rest_param_owt_weekday_from', ParameterLocation::QUERY, required: false, minimum: 0, maximum: 7, example: 1)]
    #[ApiParameter('weekday_to', 'integer', 'rest_param_owt_weekday_to', ParameterLocation::QUERY, required: false, minimum: 0, maximum: 7, example: 5)]
    #[ApiParameter('time_from', 'string', 'rest_param_owt_time_from', ParameterLocation::QUERY, required: false, pattern: '^\d{2}:\d{2}$', example: '09:00')]
    #[ApiParameter('time_to', 'string', 'rest_param_owt_time_to', ParameterLocation::QUERY, required: false, pattern: '^\d{2}:\d{2}$', example: '18:00')]
    #[ApiParameter('action', 'string', 'rest_param_owt_action', ParameterLocation::QUERY, required: true, enum: ['extension', 'busy', 'hangup'], example: 'extension')]
    #[ApiParameter('extension', 'string', 'rest_param_owt_extension', ParameterLocation::QUERY, required: false, pattern: '^[0-9]{2,8}$', example: '201')]
    #[ApiParameter('audio_message_id', 'string', 'rest_param_owt_audio_message_id', ParameterLocation::QUERY, required: false, example: '43')]
    #[ApiParameter('calType', 'string', 'rest_param_owt_calType', ParameterLocation::QUERY, required: false, enum: ['none', 'iCalendar'], default: 'none', example: 'none')]
    #[ApiParameter('calUrl', 'string', 'rest_param_owt_calUrl', ParameterLocation::QUERY, required: false, maxLength: 500, example: 'https://calendar.google.com/calendar/ical/example/basic.ics')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[A-Z0-9-]+$', example: 'OUT-WORK-TIME-1A2B3C')]
    #[ApiParameter('description', 'string', 'rest_param_owt_description', ParameterLocation::QUERY, required: true, maxLength: 255, example: 'Updated Weekend Schedule')]
    #[ApiParameter('action', 'string', 'rest_param_owt_action', ParameterLocation::QUERY, required: true, enum: ['extension', 'busy', 'hangup'], example: 'extension')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[A-Z0-9-]+$', example: 'OUT-WORK-TIME-1A2B3C')]
    #[ApiParameter('description', 'string', 'rest_param_owt_description', ParameterLocation::QUERY, required: false, maxLength: 255, example: 'Updated Description')]
    #[ApiParameter('time_from', 'string', 'rest_param_owt_time_from', ParameterLocation::QUERY, required: false, pattern: '^\d{2}:\d{2}$', example: '10:00')]
    #[ApiParameter('time_to', 'string', 'rest_param_owt_time_to', ParameterLocation::QUERY, required: false, pattern: '^\d{2}:\d{2}$', example: '17:00')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[A-Z0-9-]+$', example: 'OUT-WORK-TIME-1A2B3C')]
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
    #[ApiParameter('id', 'string', 'rest_param_id', ParameterLocation::PATH, required: true, pattern: '^[A-Z0-9-]+$', example: 'OUT-WORK-TIME-1A2B3C')]
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
    #[ApiParameter(
        name: 'priorities',
        type: 'array',
        description: 'rest_param_owt_priorities',
        in: ParameterLocation::QUERY,
        required: true,
        example: '[{"id":"OUT-WORK-TIME-1A2B3C","priority":1},{"id":"OUT-WORK-TIME-4D5E6F","priority":2}]'
    )]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function changePriorities(): void
    {
        // Implementation handled by BaseRestController
    }

}
