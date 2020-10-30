<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Modules\Config;


use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

interface RestAPIConfigInterface
{
    /**
     * Returns array of additional routes for PBXCoreREST interface from module
     * [ControllerClass, ActionMethod, RequestTemplate, HttpMethod, RootUrl, NoAuth ]
     *
     * @return array
     * @example
     *  [[GetController::class, 'callAction', '/pbxcore/api/backup/{actionName}', 'get', '/', false],
     *  [PostController::class, 'callAction', '/pbxcore/api/backup/{actionName}', 'post', '/', false]]
     */
    public function getPBXCoreRESTAdditionalRoutes(): array;

    /**
     * Process CoreAPI requests under root rights
     *
     * @param array $request GET/POST parameters
     *
     * @return PBXApiResult
     */
    public function moduleRestAPICallback(array $request): PBXApiResult;
}