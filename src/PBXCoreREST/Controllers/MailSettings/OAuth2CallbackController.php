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

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\MailOAuth2Service;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\Common\Providers\EventBusProvider;
use Phalcon\Mvc\View;
use Phalcon\Mvc\View\Engine\Volt;
use function MikoPBX\Common\Config\appPath;

/**
 * OAuth2 Callback Controller
 *
 * Handles OAuth2 authorization callbacks from email providers.
 * This is a public endpoint that doesn't require authentication.
 *
 * @RoutePrefix("/pbxcore/api/v3/mail-settings")
 * @Route("/oauth2-callback", methods=["GET"])
 */
class OAuth2CallbackController extends BaseController
{
    /**
     * Process OAuth2 callback from provider
     *
     * This method handles the OAuth2 callback directly without going through workers.
     * It returns an HTML page that communicates the result to the parent window.
     */
    public function oauth2CallbackAction(): void
    {
        // Get callback parameters
        $code = $this->request->getQuery('code');
        $state = $this->request->getQuery('state');
        $error = $this->request->getQuery('error');
        $errorDescription = $this->request->getQuery('error_description');

        // Get translation service
        $translation = $this->getDI()->getShared('translation');

        // Process OAuth2 callback
        if ($error) {
            $success = false;
            // Get translation key for OAuth2 error
            $errorKey = $this->getOAuth2ErrorKey($error);
            $message = $errorKey ? $translation->_($errorKey) : htmlspecialchars($errorDescription ?: $error, ENT_QUOTES);
        } elseif (empty($code) || empty($state)) {
            $success = false;
            $message = $translation->_('ms_OAuth2MissingParameters');
        } else {
            $result = MailOAuth2Service::handleCallback([
                'code' => $code,
                'state' => $state
            ]);

            // Debug: log what handleCallback actually returns
            SystemMessages::sysLogMsg(__METHOD__, 'OAuth2 handleCallback result: ' . var_export($result, true), LOG_INFO);

            // Check if result is boolean true
            $success = ($result === true);

            if ($success) {
                $message = $translation->_('ms_OAuth2AuthorizationSuccess');
            } else {
                // If result is not boolean, it might be an error message
                if (is_string($result) && !empty($result)) {
                    $message = $result; // Use the actual error message from service
                } else {
                    $message = $translation->_('ms_OAuth2ProcessingFailed');
                }
            }
        }

        // Send OAuth2 result event to EventBus for mail settings page
        $this->sendOAuth2Event($success, $message);

        // For JavaScript, pass translation keys instead of translated messages
        $messageKey = null;
        if ($error) {
            // Try to get translation key for OAuth2 error
            $messageKey = $this->getOAuth2ErrorKey($error);
        } elseif (empty($code) || empty($state)) {
            $messageKey = 'ms_OAuth2MissingParameters';
        } else {
            $messageKey = $success ? 'ms_OAuth2AuthorizationSuccess' : 'ms_OAuth2ProcessingFailed';
        }

        // Render and output HTML
        $html = $this->renderCallbackHtml($success, $message, $messageKey);
        header('Content-Type: text/html; charset=utf-8');
        echo $html;
        exit;
    }

    /**
     * Render OAuth2 callback HTML using view system
     */
    private function renderCallbackHtml(bool $success, string $message, ?string $messageKey = null): string
    {
        // Create a simple view instance
        $view = new View();
        $view->setDI($this->getDI());
        $viewsDir = appPath('src/AdminCabinet/Views');
        $view->setViewsDir($viewsDir);

        // Register Volt engine
        $view->registerEngines([
            '.volt' => function (View $view) {
                $volt = new Volt($view, $view->getDI());

                // Use Directories class for proper cache path management
                $voltCacheDir = Directories::getDir(Directories::APP_VOLT_CACHE_DIR) . '/rest-callback/';
                $volt->setOptions([
                    'path' => $voltCacheDir,
                    'always' => true,
                ]);

                // Create cache directory if not exists
                if (!file_exists($voltCacheDir)) {
                    mkdir($voltCacheDir, 0755, true);
                }

                return $volt;
            },
        ]);

        // Disable main view layout - this template is standalone
        $view->setMainView('');
        $view->disableLevel(View::LEVEL_MAIN_LAYOUT);

        // Set variables
        $view->success = $success;
        $view->message = $message;
        $view->messageKey = $messageKey; // Pass translation key for JavaScript

        // Set translation service for template
        $view->t = $this->getDI()->getShared('translation');

        // Render the specific view with controller and action parameters
        $view->render('MailSettings', 'oauth2-callback');
        return $view->getContent();
    }

    /**
     * Get translation key for OAuth2 error code
     *
     * @param string $errorCode OAuth2 error code
     * @return string|null Translation key or null if no translation available
     */
    private function getOAuth2ErrorKey(string $errorCode): ?string
    {
        $errorTranslations = [
            'access_denied' => 'ms_OAuth2AccessDenied',
            'invalid_request' => 'ms_OAuth2InvalidRequest',
            'invalid_client' => 'ms_OAuth2InvalidClient',
            'invalid_grant' => 'ms_OAuth2InvalidGrant',
            'unauthorized_client' => 'ms_OAuth2UnauthorizedClient',
            'unsupported_grant_type' => 'ms_OAuth2UnsupportedGrantType',
            'invalid_scope' => 'ms_OAuth2InvalidScope',
            'server_error' => 'ms_OAuth2ServerError',
            'temporarily_unavailable' => 'ms_OAuth2TemporarilyUnavailable',
        ];

        return $errorTranslations[$errorCode] ?? null;
    }

    /**
     * Send OAuth2 authorization result event to EventBus
     *
     * @param bool $success Authorization success status
     * @param string $message Result message
     * @return void
     */
    private function sendOAuth2Event(bool $success, string $message): void
    {
        try {
            $eventBus = $this->getDI()->getShared(EventBusProvider::SERVICE_NAME);

            $eventBus->publish('oauth2-authorization', [
                'status' => $success ? 'success' : 'error',
                'message' => $message,
                'timestamp' => time(),
            ]);
        } catch (\Exception $e) {
            // Silently handle EventBus errors - callback should still work without events
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to publish OAuth2 event: ' . $e->getMessage(), LOG_ERR);
        }
    }

    /**
     * Check if this controller requires authentication
     *
     * OAuth2 callback must be accessible without authentication
     * as it's called by external OAuth providers.
     *
     * @return bool Always returns false for OAuth2 callback
     */
    public static function needAuthentication(): bool
    {
        return false;
    }
}