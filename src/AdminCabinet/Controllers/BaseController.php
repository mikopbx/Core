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

use MikoPBX\AdminCabinet\Plugins\SecurityPlugin;
use MikoPBX\Common\Library\Text;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\SentryErrorHandlerProvider;
use MikoPBX\Modules\Config\WebUIConfigInterface;
use Phalcon\Filter\Filter;
use Phalcon\Flash\Exception;
use Phalcon\Http\ResponseInterface;
use Phalcon\Mvc\Controller;
use Phalcon\Mvc\Dispatcher;
use Phalcon\Mvc\View;
use Phalcon\Tag;

/**
 * @property \Phalcon\Session\Manager session
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property string language
 * @property bool showModuleStatusToggle if false it hides status toggle on current UI page
 * @property \MikoPBX\AdminCabinet\Library\Elements elements
 * @property \Phalcon\Flash\Session flash
 * @property \Phalcon\Tag tag
 * @property \Phalcon\Config\Adapter\Json config
 * @property \Phalcon\Logger\Logger loggerAuth
 */
class BaseController extends Controller
{
    protected string $actionName;
    protected string $controllerName;
    protected string $controllerClass;
    protected string $controllerNameUnCamelized;
    protected bool $isExternalModuleController;

    /**
     * Initializes base class
     */
    public function initialize(): void
    {
        $this->actionName = $this->dispatcher->getActionName();
        /** @scrutinizer ignore-call */
        $this->controllerClass = $this->dispatcher->getHandlerClass();
        $this->controllerName = Text::camelize($this->dispatcher->getControllerName(), '_');
        $this->controllerNameUnCamelized = Text::uncamelize($this->controllerName, '-');
        $this->isExternalModuleController = str_starts_with($this->dispatcher->getNamespaceName(), 'Modules');

        if ($this->request->isAjax() === false) {
            $this->prepareView();
        }
    }

    /**
     * Prepares the view by setting the necessary variables and configurations.
     *
     * @return void
     */
    protected function prepareView(): void
    {
        // Set the default timezone based on PBX settings
        date_default_timezone_set(PbxSettings::getValueByKey(PbxSettings::PBX_TIMEZONE));

        // Set PBXLicense view variable if user is authenticated
        if ($this->isAuthenticated()) {
            $this->view->PBXLicense = PbxSettings::getValueByKey(PbxSettings::PBX_LICENSE);
        } else {
            $this->view->PBXLicense = '';
        }

        // Set Support URL based on language
        if ($this->language === 'ru') {
            $this->view->urlToSupport = 'https://www.mikopbx.ru/support/?fromPBX=true';
        } else {
            $this->view->urlToSupport = 'https://www.mikopbx.com/support/?fromPBX=true';
        }

        // Set the title based on the current action
        $title = 'MikoPBX';
        switch ($this->actionName) {
            case 'index':
            case 'delete':
            case 'save':
            case 'modify':
            case '*** WITHOUT ACTION ***':
                $title .= '|' . $this->translation->_("Breadcrumb{$this->controllerName}");
                break;
            default:
                $title .= '|' . $this->translation->_("Breadcrumb{$this->controllerName}{$this->actionName}");
        }
        Tag::setTitle($title);

        // Set other view variables
        $this->view->t = $this->translation;
        $this->view->debugMode = $this->config->path('adminApplication.debugMode');
        $this->view->urlToLogo = $this->url->get('assets/img/logo-mikopbx.svg');
        $this->view->logoHref = $this->getLogoHref();
        $this->view->urlToController = $this->url->get($this->controllerNameUnCamelized);
        $this->view->represent = '';
        $this->view->WebAdminLanguage = $this->language;

        // Prepare available languages array for static dropdown
        $this->view->availableLanguages = \MikoPBX\Common\Providers\LanguageProvider::AVAILABLE_LANGUAGES;

        $this->view->submitMode = 'SaveSettings';
        $this->view->lastSentryEventId = $this->setLastSentryEventId();
        $this->view->PBXVersion = PbxSettings::getValueByKey(PbxSettings::PBX_VERSION);
        $this->view->PBXName = PbxSettings::getValueByKey(PbxSettings::PBX_NAME);
        $this->view->MetaTegHeadDescription = $this->translation->_('MetaTegHeadDescription');
        $this->view->isExternalModuleController = $this->isExternalModuleController;
        if ($this->controllerClass!==SessionController::class) {
            $this->view->setTemplateAfter('main');
        }

        $this->view->globalModuleUniqueId = '';
        $this->view->actionName = $this->actionName;
        $this->view->controllerName = $this->controllerName;
        $this->view->controllerClass = $this->controllerClass;
        $this->view->currentPage = "AdminCabinet/$this->controllerName/$this->actionName";
        
        // Add module variables into view if it is an external module controller
        if ($this->isExternalModuleController) {
            /** @var PbxExtensionModules $module */
            $module = PbxExtensionModules::findFirstByUniqid($this->getModuleUniqueId());
            if ($module === null) {
                $module = new PbxExtensionModules();
                $module->disabled = '1';
                $module->name = 'Unknown module';
            }
            $this->view->module = $module->toArray();
            $this->view->globalModuleUniqueId = $module->uniqid;
            $this->view->showModuleStatusToggle = $this->showModuleStatusToggle??true;
            $this->view->currentPage = "$module->uniqid/$this->controllerName/$this->actionName";
        }
    }

    /**
     * Performs actions before executing the route.
     *
     * @param Dispatcher $dispatcher
     * @return void
     */
    public function beforeExecuteRoute(Dispatcher $dispatcher): void
    {
        $this->actionName = $this->dispatcher->getActionName();
        $this->controllerName = Text::camelize($this->dispatcher->getControllerName(), '_');
        // Add module variables into view if it is an external module controller
        if (str_starts_with($this->dispatcher->getNamespaceName(), 'Modules')) {
            $this->view->pick("Modules/{$this->getModuleUniqueId()}/$this->controllerName/$this->actionName");
        } else {
            $this->view->pick("$this->controllerName/$this->actionName");
        }

        PBXConfModulesProvider::hookModulesMethod(WebUIConfigInterface::ON_BEFORE_EXECUTE_ROUTE, [$dispatcher]);
    }

    /**
     * Performs actions after executing the route and returns the response.
     *
     * @param Dispatcher $dispatcher
     * @return ResponseInterface
     * @throws Exception
     */
    public function afterExecuteRoute(Dispatcher $dispatcher): ResponseInterface
    {

        if ($this->request->isAjax() === true) {
            $this->view->setRenderLevel(View::LEVEL_NO_RENDER);
            $this->response->setContentType('application/json', 'UTF-8');
            $data = $this->view->getParamsToView();

            /* Set global params if is not set in controller/action */
            if (isset($data['raw_response'])) {
                $result = $data['raw_response'];
            } else {
                $data['success'] = $data['success'] ?? true;
                $data['reload'] = $data['reload'] ?? false;
                $data['message'] = $data['message'] ?? $this->flash->getMessages();

                // Let's add information about the last error to display a dialog window for the user.
                $sentry =  $this->di->get(SentryErrorHandlerProvider::SERVICE_NAME, ['admin-cabinet']);
                if ($sentry) {
                    $data['lastSentryEventId'] = $sentry->getLastEventId();
                }

                $result = json_encode($data);
            }
            $this->response->setContent($result);
        }

        PBXConfModulesProvider::hookModulesMethod(WebUIConfigInterface::ON_AFTER_EXECUTE_ROUTE, [$dispatcher]);

        return $this->response->send();
    }

    /**
     * Forwards the request to a different controller and action based on the provided URI.
     *
     * @param string $uri The URI to forward to.
     * @return void
     */
    protected function forward(string $uri): void
    {
        $uriParts = explode('/', $uri);
        if ($this->isExternalModuleController and count($uriParts)>2) {
            $params = array_slice($uriParts, 3);
            $moduleUniqueID = $this->getModuleUniqueId();
            $this->dispatcher->forward(
                [
                    'namespace'=>"Modules\\$moduleUniqueID\\App\\Controllers",
                    'controller' => $uriParts[1],
                    'action' => $uriParts[2],
                    'params' => $params,
                ]
            );
        } else {
            $params = array_slice($uriParts, 2);

            $this->dispatcher->forward(
                [
                    'namespace'=>"MikoPBX\AdminCabinet\Controllers",
                    'controller' => $uriParts[0],
                    'action' => $uriParts[1],
                    'params' => $params,
                ]
            );
        }
    }

    /**
     * Sanitizes the caller ID by removing any characters that are not alphanumeric or spaces.
     *
     * @param string $callerId The caller ID to sanitize.
     * @return string The sanitized caller ID.
     */
    protected function sanitizeCallerId(string $callerId): string
    {
        return preg_replace('/[^a-zA-Zа-яА-Я0-9 ]/ui', '', $callerId);
    }

    /**
     * Sorts array by priority field
     *
     * @param $a
     * @param $b
     *
     * @return int|null
     */
    protected function sortArrayByPriority($a, $b): ?int
    {
        if (is_array($a)) {
            $a = (int)$a['priority'];
        } else {
            $a = (int)$a->priority;
        }

        if (is_array($b)) {
            $b = (int)$b['priority'];
        } else {
            $b = (int)$b->priority;
        }

        if ($a === $b) {
            return 0;
        } else {
            return ($a < $b) ? -1 : 1;
        }
    }

    /**
     * Sets the last Sentry event ID.
     *
     * @return \Sentry\EventId|null The last Sentry event ID, or null if metrics sending is disabled.
     */
    private function setLastSentryEventId(): ?\Sentry\EventId
    {
        $result = null;
        // Allow anonymous statistics collection for JS code
        $sentry =  $this->di->get(SentryErrorHandlerProvider::SERVICE_NAME);
        if ($sentry) {
            $result = $sentry->getLastEventId();
        }
        return $result;
    }

    /**
     *  Returns the unique ID of the module parsing controller namespace;
     * @return string
     */
    private function getModuleUniqueId():string
    {
        // Split the namespace into an array using the backslash as a separator
        $parts = explode('\\', get_class($this));

        // Get the second part of the namespace
        return $parts[1];
    }

    /**
     * Get the logo href URL based on user's home page from JWT token.
     *
     * For users with limited permissions, returns their configured home page.
     * For admins or when home page is not set, returns default index.
     *
     * @return string URL for logo click redirect
     */
    private function getLogoHref(): string
    {
        $defaultUrl = $this->url->get('index');

        // Try to get home page from refresh token cookie
        if ($this->cookies->has('refreshToken')) {
            try {
                $refreshToken = $this->cookies->get('refreshToken')->getValue();
                if (!empty($refreshToken)) {
                    $jwt = $this->di->getShared(\MikoPBX\Common\Providers\JwtProvider::SERVICE_NAME);
                    $homePage = $jwt->extractHomePageFromRefreshToken($refreshToken);
                    if (!empty($homePage)) {
                        return $homePage;
                    }
                }
            } catch (\Throwable) {
                // Cookie decryption failed - use default
            }
        }

        return $defaultUrl;
    }

    /**
     * Save an entity and handle success or error messages.
     *
     * @param mixed $entity The entity to be saved.
     * @return bool True if the entity was successfully saved, false otherwise.
     */
    protected function saveEntity(mixed $entity, string $reloadPath = ''): bool
    {
        $success = $entity->save();

        if (!$success) {
            $errors = $entity->getMessages();
            $this->flash->error(implode('<br>', $errors));
        } elseif (!$this->request->isAjax()) {
            $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
            if ($reloadPath!=='') {
                $this->forward($reloadPath);
            }
        }

        if ($this->request->isAjax()) {
            $this->view->success = $success;
            if ($reloadPath!=='' && $success) {
                $this->view->reload = str_replace('{id}', $entity->id, $reloadPath);
            }
        }

        return $success;
    }


    /**
     * Delete an entity and handle success or error messages.
     *
     * @param mixed $entity The entity to be deleted.
     * @return bool True if the entity was successfully deleted, false otherwise.
     */
    protected function deleteEntity(mixed $entity, string $reloadPath = ''): bool
    {
        $success = $entity->delete();

        if (!$success) {
            $errors = $entity->getMessages();
            $this->flash->error(implode('<br>', $errors));
        } elseif (!$this->request->isAjax()) {
            // $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
            if ($reloadPath!=='') {
                $this->forward($reloadPath);
            }
        }

        if ($this->request->isAjax()) {
            $this->view->success = $success;
            if ($reloadPath!=='' && $success) {
                $this->view->reload = $reloadPath;
            }
        }

        return $success;
    }

    /**
     * Creates a JPEG file from the provided image.
     *
     * @param string $base64_string The base64 encoded image string.
     * @param string $output_file The output file path to save the JPEG file.
     *
     * @return void
     */
    protected function base64ToJpegFile(string $base64_string, string $output_file): void
    {
        // Open the output file for writing
        $ifp = fopen($output_file, 'wb');

        if ($ifp === false) {
            return;
        }
        // Split the string on commas
        // $data[0] == "data:image/png;base64"
        // $data[1] == <actual base64 string>
        $data = explode(',', $base64_string);

        if (count($data) > 1) {
            // Write the base64 decoded data to the file
            fwrite($ifp, base64_decode($data[1]));

            // Close the file resource
            fclose($ifp);
        }
    }

    /**
     * Recursively sanitizes input data based on the provided filter.
     *
     * @param array $data The data to be sanitized.
     * @param \Phalcon\Filter\FilterInterface $filter The filter object used for sanitization.
     *
     * @return array The sanitized data.
     */
    public static function sanitizeData(array $data, \Phalcon\Filter\FilterInterface $filter): array
    {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                // Recursively sanitize array values
                $data[$key] = self::sanitizeData($value, $filter);
            } elseif (is_string($value)) {
                // Check if the string is valid JSON
                $jsonDecoded = json_decode($value, true);
                if (json_last_error() === JSON_ERROR_NONE && $value !== '') {
                    // If it's valid JSON, sanitize its content and re-encode
                    if (is_array($jsonDecoded)) {
                        // Sanitize the JSON's content recursively
                        $sanitizedJson = self::sanitizeData($jsonDecoded, $filter);
                        $data[$key] = json_encode($sanitizedJson);
                    } else {
                        // For non-array JSON values (simple values), keep as is
                        $data[$key] = $value;
                    }
                }
                // Check if the string starts with 'http'
                else if (stripos($value, 'http') === 0) {
                    // If the string starts with 'http', sanitize it as a URL
                    $data[$key] = $filter->sanitize($value, FILTER::FILTER_URL);
                } else {
                    // Sanitize regular strings (trim and remove illegal characters)
                    $data[$key] = $filter->sanitize($value, [FILTER::FILTER_STRING, FILTER::FILTER_TRIM]);
                }
            } elseif (is_numeric($value)) {
                // Sanitize numeric values as integers
                $data[$key] = $filter->sanitize($value, FILTER::FILTER_INT);
            }
        }

        return $data;
    }

    /**
     * Checks if the current user is authenticated using JWT tokens.
     *
     * This method provides a unified authentication check across all controllers.
     * It uses the same logic as SecurityPlugin::isAuthenticated() to ensure consistency.
     *
     * JWT authentication flow:
     * 1. AJAX requests: check for Bearer token in Authorization header
     * 2. Browser page requests: check for refreshToken cookie
     *    - If cookie exists, user is considered authenticated
     *    - TokenManager JS will call /auth:refresh to get access token
     *
     * @return bool true if the user is authenticated, false otherwise.
     */
    protected function isAuthenticated(): bool
    {
        return SecurityPlugin::isAuthenticated($this->request, $this->cookies);
    }
}
