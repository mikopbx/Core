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
use MikoPBX\PBXCoreREST\Lib\Advice\DataStructure;
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
 * RESTful controller for system advice and notifications (v3 API)
 *
 * Comprehensive system advice and notifications management following Google API Design Guide patterns.
 * Provides configuration recommendations, security warnings, and system health notifications.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Advice
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/advice',
    tags: ['System Advice'],
    description: 'System advice and notification management for PBX health monitoring. ' .
                'Provides automated analysis of system configuration, security recommendations, ' .
                'performance warnings, and best practice suggestions. This is a read-only resource ' .
                'with custom methods for retrieving and refreshing system advice.',
    processor: AdviceProcessor::class
)]
#[ResourceSecurity('advice', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'refresh'],
        'POST' => ['refresh']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: ['getList', 'refresh'],
    customMethods: ['getList', 'refresh'],
    idPattern: ''
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = AdviceProcessor::class;


    /**
     * Get list of all system advice and notifications
     *
     * @route GET /pbxcore/api/v3/advice:getList
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list'
    )]
    #[ApiOperation(
        summary: 'rest_advice_GetList',
        description: 'rest_advice_GetListDesc',
        operationId: 'getAdviceList'
    )]
    #[ApiParameterRef('category')]
    #[ApiParameterRef('severity')]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Refresh system advice cache
     *
     * @route GET /pbxcore/api/v3/advice:refresh
     * @route POST /pbxcore/api/v3/advice:refresh
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list'
    )]
    #[ApiOperation(
        summary: 'rest_advice_Refresh',
        description: 'rest_advice_RefreshDesc',
        operationId: 'refreshAdvice'
    )]
    #[ApiParameterRef('force')]
    #[ApiResponse(200, 'rest_response_200_refreshed')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function refresh(): void
    {
        // Implementation handled by BaseRestController
    }
}