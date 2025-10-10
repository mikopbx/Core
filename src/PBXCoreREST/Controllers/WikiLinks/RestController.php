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
    ApiParameter,
    ParameterLocation,
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
    tags: ['Documentation'],
    processor: WikiLinksManagementProcessor::class
)]
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
     * Returns the appropriate documentation URL based on controller, action, and language.
     * Automatically handles link replacement mapping from wiki.mikopbx.com to docs.mikopbx.com.
     */
    #[ResourceSecurity('wiki_links_get_link', requirements: [SecurityType::PUBLIC])]
    #[ApiOperation(
        summary: 'Get documentation link',
        description: 'Returns the documentation URL for a specific page based on controller and action context',
        operationId: 'getWikiLink'
    )]
    #[ApiParameter(
        name: 'controller',
        type: 'string',
        description: 'Controller name in CamelCase format',
        in: ParameterLocation::QUERY,
        required: true,
        example: 'Extensions'
    )]
    #[ApiParameter(
        name: 'action',
        type: 'string',
        description: 'Action name (optional, defaults to "index")',
        in: ParameterLocation::QUERY,
        required: false,
        default: 'index',
        example: 'index'
    )]
    #[ApiParameter(
        name: 'language',
        type: 'string',
        description: 'Language code (optional, defaults to "en")',
        in: ParameterLocation::QUERY,
        required: false,
        enum: ['en', 'ru'],
        default: 'en',
        example: 'en'
    )]
    #[ApiParameter(
        name: 'moduleId',
        type: 'string',
        description: 'Module unique ID for module-specific documentation (optional)',
        in: ParameterLocation::QUERY,
        required: false,
        example: 'ModuleUsersUI'
    )]
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
