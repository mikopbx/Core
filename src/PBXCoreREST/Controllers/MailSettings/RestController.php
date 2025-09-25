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

namespace MikoPBX\PBXCoreREST\Controllers\MailSettings;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\MailSettingsManagementProcessor;

/**
 * RESTful controller for mail settings management (v3 API)
 *
 * Handles both standard CRUD operations and OAuth2 authentication flow for mail settings.
 * This controller implements a clean RESTful interface with proper HTTP methods.
 *
 * @RoutePrefix("/pbxcore/api/v3/mail-settings")
 *
 * @examples Standard CRUD operations:
 *
 * # Get all mail settings
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/mail-settings
 *
 * # Full update (replace all) settings
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/mail-settings \
 *      -H "Content-Type: application/json" \
 *      -d '{"MailSMTPHost":"smtp.gmail.com","MailSMTPPort":"587"}'
 *
 * # Partial update (modify) settings
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/mail-settings \
 *      -H "Content-Type: application/json" \
 *      -d '{"MailSMTPAuthType":"oauth2"}'
 *
 * @examples Custom method operations:
 *
 * # Test SMTP connection
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/mail-settings:testConnection
 *
 * # Send test email
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/mail-settings:sendTestEmail \
 *      -H "Content-Type: application/json" \
 *      -d '{"to":"admin@example.com","subject":"Test","body":"Test message"}'
 *
 * # Get OAuth2 authorization URL
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/mail-settings:getOAuth2Url?provider=google
 *
 * # Process OAuth2 callback
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/mail-settings:oauth2Callback \
 *      -H "Content-Type: application/json" \
 *      -d '{"code":"auth_code_here","state":"state_here"}'
 *
 * # Refresh OAuth2 access token
 * curl -X POST http://127.0.0.1/pbxcore/api/v3/mail-settings:refreshToken
 *
 * @package MikoPBX\PBXCoreREST\Controllers\MailSettings
 */
class RestController extends BaseRestController
{
    protected string $processorClass = MailSettingsManagementProcessor::class;

    /**
     * Define allowed custom methods for each HTTP method
     *
     * @return array<string, array<string>>
     */
    protected function getAllowedCustomMethods(): array
    {
        return [
            'GET' => ['getOAuth2Url', 'oauth2Callback'],  // Added oauth2Callback to GET
            'POST' => ['testConnection', 'sendTestEmail', 'refreshToken']
        ];
    }

    /**
     * Override handleCustomRequest to handle OAuth2 callback specially
     */
    public function handleCustomRequest(?string $idOrMethod = null, ?string $customMethod = null): void
    {
        // Special handling for OAuth2 callback
        if ($idOrMethod === 'oauth2-callback' || $customMethod === 'oauth2-callback') {
            $this->handleOAuth2Callback();
            return;
        }

        // Default handling for other custom requests
        parent::handleCustomRequest($idOrMethod, $customMethod);
    }

    /**
     * Handle OAuth2 callback specially without going through workers
     */
    private function handleOAuth2Callback(): void
    {
        $controller = new OAuth2CallbackController();
        $controller->setDI($this->getDI());
        $controller->oauth2CallbackAction();
    }

    /**
     * Override handleCRUDRequest for singleton resource behavior
     * MailSettings is a singleton - there's only one set of settings
     *
     * @param string|null $id Resource ID (ignored for singleton)
     * @return void
     */
    public function handleCRUDRequest(?string $id = null): void
    {
        // Validate processor class is set
        if (empty($this->processorClass)) {
            $this->sendErrorResponse('Processor class not configured', 500);
            return;
        }

        // Sanitize all input data
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        // Get HTTP method and determine action
        $httpMethod = $this->request->getMethod();

        // Map HTTP method to action for singleton resource
        $action = match($httpMethod) {
            'GET' => 'getList',    // Get all mail settings
            'PUT' => 'update',     // Full update
            'PATCH' => 'patch',    // Partial update
            'DELETE' => 'reset',   // Reset to defaults
            default => null
        };

        if ($action === null) {
            $this->sendErrorResponse("Invalid HTTP method: $httpMethod", 405);
            return;
        }

        // For POST/PUT/PATCH operations, pass HTTP method for processors that need it
        if (in_array($httpMethod, ['POST', 'PUT', 'PATCH'], true)) {
            $requestData['httpMethod'] = $httpMethod;
        }

        // Send request to backend worker
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            $action,
            $requestData
        );
    }
}