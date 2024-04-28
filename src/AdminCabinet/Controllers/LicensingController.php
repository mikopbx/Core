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

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\Common\Models\PbxSettingsConstants;
use Phalcon\Http\Response;

class LicensingController extends BaseController
{
    /**
     * Old services still use old controller address
     * License key, get new key, activate coupon form
     *
     */
    public function modifyAction(): void
    {
        // Create a response object
        $response = new Response();

        // Set the redirect URL with a hash fragment
        $redirectUrl = 'pbx-extension-modules/index#licensing';

        // Perform the redirect
        $response->redirect($redirectUrl)->send();

    }

    /**
     * After some changes on form we will refresh some session cache
     */
    public function saveAction()
    {
        $this->session->remove(PbxSettingsConstants::PBX_LICENSE);
    }
}