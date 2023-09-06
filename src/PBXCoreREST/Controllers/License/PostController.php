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

namespace MikoPBX\PBXCoreREST\Controllers\License;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\LicenseManagementProcessor;

/**
 * Handles the POST request for license-related actions.
 *
 * @RoutePrefix("/pbxcore/api/license")
 */
class PostController extends BaseController
{
    /**
     * Calls the corresponding action for license service based on the provided $actionName.
     *
     * @param string $actionName The name of the action.
     *
     * Update license key, get new one, activate coupon
     * @Post("/processUserRequest")
     *
     * Tries to capture a feature for a product.
     * @Post("/captureFeatureForProductId")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $data = $this->request->getPost();
        $this->sendRequestToBackendWorker(LicenseManagementProcessor::class, $actionName, $data);
    }
}