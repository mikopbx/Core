<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Controllers\WikiLinks;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\WikiLinksManagementProcessor;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    HttpMapping,
    ResourceSecurity,
    SecurityType,
    ApiOperation,
    ApiParameterRef,
    ApiResponse,
    ApiDataSchema
};

/**
 * REST API Controller for Wiki Documentation Links
 *
 * Provides endpoints to generate documentation links based on controller/action context.
 */
#[ApiResource(
    path: '/pbxcore/api/v3/wiki-links',
    tags: ['WikiLinks'],
    description: 'rest_description_WikiLinks',
    processor: WikiLinksManagementProcessor::class
)]
#[ResourceSecurity('wiki-links', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: ['GET' => ['getLink']],
    customMethods: ['getLink']
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = WikiLinksManagementProcessor::class;

    /**
     * Get wiki documentation link for a specific page (PUBLIC - no auth required)
     *
     * Returns the appropriate documentation URL based on controller, action, module ID, and language.
     * Dynamically generates documentation links for admin interface help icons and contextual help.
     * Automatically handles link replacement mapping from wiki.mikopbx.com to docs.mikopbx.com.
     */
    #[ResourceSecurity('wiki_links_get_link', requirements: [SecurityType::PUBLIC])]
    #[ApiOperation(
        summary: 'rest_operation_wl_getLink_summary',
        description: 'rest_operation_wl_getLink_description',
        operationId: 'getWikiLink'
    )]
    #[ApiParameterRef('controller', required: true)]
    #[ApiParameterRef('action')]
    #[ApiParameterRef('language')]
    #[ApiParameterRef('moduleId')]
    #[ApiDataSchema(
        schemaClass: \MikoPBX\PBXCoreREST\Lib\WikiLinks\DataStructure::class,
        type: 'detail'
    )]
    #[ApiResponse(200, 'Documentation link retrieved successfully')]
    #[ApiResponse(400, 'Invalid request parameters', 'PBXApiResult')]
    public function getLink(): void
    {
        // Implementation handled by BaseRestController
    }
}
