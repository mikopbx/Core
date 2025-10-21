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

namespace MikoPBX\PBXCoreREST\Controllers\Search;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\SearchProcessor;
use MikoPBX\PBXCoreREST\Lib\Search\DataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for global search functionality (v3 API)
 *
 * Provides global search functionality for the admin interface.
 * Returns searchable items including entities from database (users, providers, queues, etc.)
 * and static menu pages. Searches by number, name, or searchIndex.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Search
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/search',
    tags: ['Search'],
    description: 'rest_Search_ApiDescription',
    processor: SearchProcessor::class
)]
#[ResourceSecurity('search', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getSearchItems']
    ],
    resourceLevelMethods: [],
    collectionLevelMethods: ['getSearchItems'],
    customMethods: ['getSearchItems'],
    idPattern: ''
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = SearchProcessor::class;

    /**
     * Get searchable items for global search
     *
     * @route GET /pbxcore/api/v3/search:getSearchItems
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list'
    )]
    #[ApiOperation(
        summary: 'rest_search_GetSearchItems',
        description: 'rest_search_GetSearchItemsDesc',
        operationId: 'getSearchItems'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getSearchItems(): void
    {
        // Implementation handled by BaseRestController
    }
}
