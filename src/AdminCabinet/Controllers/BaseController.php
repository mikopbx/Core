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

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\SentryErrorHandlerProvider;
use MikoPBX\Modules\Config\WebUIConfigInterface;
use MikoPBX\Common\Models\{PbxExtensionModules, PbxSettings, PbxSettingsConstants};
use Phalcon\Http\ResponseInterface;
use Phalcon\Mvc\{Controller, Dispatcher, View};
use Phalcon\Tag;
use Phalcon\Text;

/**
 * @property \Phalcon\Session\Manager session
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 * @property string language
 * @property bool showModuleStatusToggle if false it hides status toggle on current UI page
 * @property \MikoPBX\AdminCabinet\Library\Elements elements
 * @property \Phalcon\Flash\Session flash
 * @property \Phalcon\Tag tag
 * @property \Phalcon\Config\Adapter\Json config
 * @property \Phalcon\Logger loggerAuth
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
     * Prepares the view by setting necessary variables and configurations.
     *
     * @return void
     */
    protected function prepareView(): void
    {
        // Set the default timezone based on PBX settings
        date_default_timezone_set(PbxSettings::getValueByKey(PbxSettingsConstants::PBX_TIMEZONE));

        // Set PBXLicense view variable if session exists
        if ($this->session->has(SessionController::SESSION_ID)) {
            $this->view->PBXLicense = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_LICENSE);
        } else {
            $this->view->PBXLicense = '';
        }

        // Set URLs for Wiki and Support based on language
        $this->view->urlToWiki = "https://wiki.mikopbx.com/{$this->controllerNameUnCamelized}";
        if ($this->language === 'ru') {
            $this->view->urlToSupport = 'https://www.mikopbx.ru/support/?fromPBX=true';
        } else {
            $this->view->urlToSupport = 'https://www.mikopbx.com/support/?fromPBX=true';
        }

        // Set the title based on the current action
        $title = 'MikoPBX';
        switch ($this->actionName) {
            case'index':
            case'delete':
            case'save':
            case'modify':
            case'*** WITHOUT ACTION ***':
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
        $this->view->urlToController = $this->url->get($this->controllerNameUnCamelized);
        $this->view->represent = '';
        $this->view->WebAdminLanguage = $this->session->get(PbxSettingsConstants::WEB_ADMIN_LANGUAGE)??PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_LANGUAGE);
        $this->view->AvailableLanguages = json_encode(LanguageController::getAvailableWebAdminLanguages());
        $this->view->submitMode = $this->session->get('SubmitMode') ?? 'SaveSettings';
        $this->view->lastSentryEventId = $this->setLastSentryEventId();
        $this->view->PBXVersion = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_VERSION);
        $this->view->MetaTegHeadDescription = $this->translation->_('MetaTegHeadDescription');
        $this->view->isExternalModuleController = $this->isExternalModuleController;

        if ($this->controllerClass!==SessionController::class){
            $this->view->setTemplateAfter('main');
        }

        $this->view->globalModuleUniqueId = '';
        $this->view->actionName = $this->actionName;
        $this->view->controllerName = $this->controllerName;
        $this->view->controllerClass = $this->controllerClass;

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
        }
    }

    /**
     * Performs actions before executing the route.
     *
     * @return void
     */
    public function beforeExecuteRoute(Dispatcher $dispatcher): void
    {
        // Check if the request method is POST
        if ($this->request->isPost()) {
            // Retrieve the 'submitMode' data from the request
            $data = $this->request->getPost('submitMode');
            if (!empty($data)) {
                // Set the 'SubmitMode' session variable to the retrieved data
                $this->session->set('SubmitMode', $data);
            }
        }

        $this->actionName = $this->dispatcher->getActionName();
        $this->controllerName = Text::camelize($this->dispatcher->getControllerName(), '_');
        // Add module variables into view if it is an external module controller
        if (str_starts_with($this->dispatcher->getNamespaceName(), 'Modules')) {
            $this->view->pick("Modules/{$this->getModuleUniqueId()}/{$this->controllerName}/{$this->actionName}");
        } else  {
            $this->view->pick("{$this->controllerName}/{$this->actionName}");
        }

        PBXConfModulesProvider::hookModulesMethod(WebUIConfigInterface::ON_BEFORE_EXECUTE_ROUTE,[$dispatcher]);
    }

    /**
     * Performs actions after executing the route and returns the response.
     *
     * @return \Phalcon\Http\ResponseInterface
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
                $sentry =  $this->di->get(SentryErrorHandlerProvider::SERVICE_NAME,['admin-cabinet']);
                if ($sentry){
                    $data['lastSentryEventId'] = $sentry->getLastEventId();
                }

                $result = json_encode($data);
            }
            $this->response->setContent($result);
        }

        PBXConfModulesProvider::hookModulesMethod(WebUIConfigInterface::ON_AFTER_EXECUTE_ROUTE,[$dispatcher]);

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
        if ($this->isExternalModuleController and count($uriParts)>2){
            $params = array_slice($uriParts, 3);
            $moduleUniqueID = $this->getModuleUniqueId();
            $this->dispatcher->forward(
                [
                    'namespace'=>"Modules\\{$moduleUniqueID}\\App\\Controllers",
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
        if ($sentry){
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
     * Save an entity and handle success or error messages.
     *
     * @param mixed $entity The entity to be saved.
     * @return bool True if the entity was successfully saved, false otherwise.
     */
    protected function saveEntity($entity, string $reloadPath=''): bool
    {
        $success = $entity->save();

        if (!$success) {
            $errors = $entity->getMessages();
            $this->flash->error(implode('<br>', $errors));
        } elseif (!$this->request->isAjax()) {
            $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
            if ($reloadPath!==''){
                $this->forward($reloadPath);
            }
        }

        if ($this->request->isAjax()) {
            $this->view->success = $success;
            if ($reloadPath!=='' && $success){
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
    protected function deleteEntity($entity, string $reloadPath=''): bool
    {
        $success = $entity->delete();

        if (!$success) {
            $errors = $entity->getMessages();
            $this->flash->error(implode('<br>', $errors));
        } elseif (!$this->request->isAjax()) {
            // $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
            if ($reloadPath!==''){
                $this->forward($reloadPath);
            }
        }

        if ($this->request->isAjax()) {
            $this->view->success = $success;
            if ($reloadPath!=='' && $success){
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
}
