<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\AdminCabinet\Forms\LoginForm;
use MikoPBX\Common\Models\PbxSettings;

/**
 * Class SessionController
 *
 * Manages user sessions for the admin cabinet, handling user authentication,
 * session initiation, and logout functionalities.
 *
 * @package MikoPBX\AdminCabinet\Controllers
 */
class SessionController extends BaseController
{
    /**
     * Constant for session ID used within the admin cabinet.
     */
    public const string SESSION_ID = 'authAdminCabinet';

    /**
     * Constant for user role within the session.
     */
    public const string ROLE = 'role';

    /**
     * Constant for the default home page after login.
     */
    public const string HOME_PAGE = 'homePage';

    /**
     * Constant for the user's name within the session.
     */
    public const string USER_NAME = 'userName';

    /**
     * Renders the login page.
     *
     * This method prepares and displays the login form along with system settings
     * such as PBX name and description.
     *
     * Authentication is handled by REST API /pbxcore/api/v3/auth:login via JavaScript.
     */
    public function indexAction(): void
    {
        $this->view->setVar('NameFromSettings', PbxSettings::getValueByKey(PbxSettings::PBX_NAME));
        $description = PbxSettings::getValueByKey(PbxSettings::PBX_DESCRIPTION);
        if ($description === PbxSettings::DEFAULT_CLOUD_PASSWORD_DESCRIPTION) {
            $description = $this->translation->_($description);
        }
        $this->view->setVar('DescriptionFromSettings', $description);
        $this->view->setVar('form', new LoginForm());
    }


    /**
     * Ends the user's session and redirects to the login page.
     *
     * Logout is handled by REST API /pbxcore/api/v3/auth:logout via JavaScript.
     * This method only clears the refresh token cookie as a fallback.
     */
    public function endAction(): void
    {
        // Determine if connection is secure (HTTPS)
        $isSecure = $this->request->isSecure();

        // Clear refresh token cookie (JWT refresh token)
        $this->cookies->set(
            'refreshToken',
            '',
            time() - 3600,  // Expire in the past
            '/',
            $isSecure,      // secure (match protocol)
            '',             // domain (current domain, empty string for PHP 8.4 compatibility)
            true,           // httpOnly
            ['samesite' => 'Strict']
        );

        // CRITICAL: Send cookies to browser before redirect
        $this->cookies->send();

        // Check if this is an AJAX request (called from logout())
        if ($this->request->isAjax()) {
            // Return JSON response for AJAX calls
            $this->response->setJsonContent([
                'result' => true,
                'message' => 'Cookie cleared'
            ]);
        } else {
            // Redirect to login page for normal requests
            $this->response->redirect('/session/index');
        }
    }


}
