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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\Passwords;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\PasswordsProcessor;

/**
 * Passwords POST controller
 * 
 * Handles password-related operations:
 * - /pbxcore/api/v2/passwords/validate - Validate password strength
 * - /pbxcore/api/v2/passwords/generate - Generate secure password
 * - /pbxcore/api/v2/passwords/check-dictionary - Check against dictionary
 */
class PostController extends BaseController
{
    /**
     * Process POST requests to passwords API
     *
     * @param string $actionName Action to execute
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker(
            PasswordsProcessor::class,
            $actionName,
            self::sanitizeData($this->request->getPost(), $this->filter)
        );
    }
}