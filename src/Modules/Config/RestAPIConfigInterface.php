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

namespace MikoPBX\Modules\Config;


use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Interface RestAPIConfigInterface
 *
 * This interface defines the configuration for a REST API module in PBX.
 *
 * @package MikoPBX\Modules\Config
 */
interface RestAPIConfigInterface
{
    public const MODULE_RESTAPI_CALLBACK = 'moduleRestAPICallback';

    public const GET_PBXCORE_REST_ADDITIONAL_ROUTES = 'getPBXCoreRESTAdditionalRoutes';

    /**
     * Returns array of additional routes for PBXCoreREST interface from module
     * [ControllerClass, ActionMethod, RequestTemplate, HttpMethod, RootUrl, NoAuth ]
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getpbxcorerestadditionalroutes
     *
     * @return array
     * @example
     *  [[GetController::class, 'callAction', '/pbxcore/api/backup/{actionName}', 'get', '/', false],
     *  [PostController::class, 'callAction', '/pbxcore/api/backup/{actionName}', 'post', '/', false]]
     *
     */
    public function getPBXCoreRESTAdditionalRoutes(): array;

    /**
     * Process PBXCoreREST requests under root rights
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#modulerestapicallback
     *
     * @param array $request GET/POST parameters
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public function moduleRestAPICallback(array $request): PBXApiResult;
}