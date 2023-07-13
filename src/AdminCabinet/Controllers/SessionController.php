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

use MikoPBX\AdminCabinet\Forms\LoginForm;
use MikoPBX\Common\Models\AuthTokens;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\AclProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\WebUIConfigInterface;

/**
 * SessionController
 *
 * Allows to authenticate users
 */
class SessionController extends BaseController
{
    public const SESSION_ID = 'authAdminCabinet';

    public const ROLE = 'role';

    public const HOME_PAGE = 'homePage';

    public const WEB_ADMIN_LANGUAGE = 'WebAdminLanguage';

    /**
     * Renders the login page with form and settings values.
     */
    public function indexAction(): void
    {
        $this->view->NameFromSettings
            = PbxSettings::getValueByKey('Name');
        $this->view->DescriptionFromSettings
            = PbxSettings::getValueByKey('Description');
        $this->view->form = new LoginForm();
    }

    /**
     * Handles the login form submission and authentication.
     */
    public function startAction(): void
    {
        if (!$this->request->isPost()) {
            $this->forward('session/index');
        }
        $loginFromUser = $this->request->getPost('login');
        $passFromUser = $this->request->getPost('password');
        $this->flash->clear();
        $login = PbxSettings::getValueByKey('WebAdminLogin');
        $password = PbxSettings::getValueByKey('WebAdminPassword');

        $userLoggedIn = false;
        $sessionParams = [];

        // Check if the provided login and password match the stored values
        if ($password === $passFromUser && $login === $loginFromUser) {
            $sessionParams = [
                SessionController::ROLE => AclProvider::ROLE_ADMINS,
                SessionController::HOME_PAGE => $this->url->get('extensions/index')
            ];
            $userLoggedIn = true;
        } else {
            // Try to authenticate user over additional module
            $additionalModules = PBXConfModulesProvider::hookModulesMethod(WebUIConfigInterface::AUTHENTICATE_USER, [$loginFromUser, $passFromUser]);

            // Check if any additional module successfully authenticated the user
            foreach ($additionalModules as $moduleUniqueId => $sessionData) {
                if (!empty($sessionData)) {
                    $this->loggerAuth->info("User $login was authenticated over module $moduleUniqueId");
                    $sessionParams = $sessionData;
                    $userLoggedIn = true;
                    break;
                }
            }
        }

        if ($userLoggedIn) {
            // Register the session with the specified parameters
            $this->_registerSession($sessionParams);
            $this->updateSystemLanguage();
            $this->view->success = true;
            $backUri = $this->request->getPost('backUri');
            if (!empty($backUri)) {
                $this->view->reload = $backUri;
            } else {
                $this->view->reload = 'index/index';
            }
        } else {
            // Authentication failed
            $this->view->success = false;
            $this->flash->error($this->translation->_('auth_WrongLoginPassword'));
            $remoteAddress = $this->request->getClientAddress(true);
            $userAgent = $this->request->getUserAgent();
            $this->loggerAuth->warning("From: {$remoteAddress} UserAgent:{$userAgent} Cause: Wrong password");
            $this->clearAuthCookies();
        }

    }

    /**
     * Register an authenticated user into session data
     *
     */
    private function _registerSession(array $sessionParams): void
    {
        $this->session->set(self::SESSION_ID, $sessionParams);

        if ($this->request->getPost('rememberMeCheckBox') === 'on') {
            $this->updateRememberMeCookies($sessionParams);
        } else {
            $this->clearAuthCookies();
        }
    }

    /**
     * Setups random password and selector to browser cookie storage to remember me facility
     *
     * @param array $sessionParams
     */
    private function updateRememberMeCookies(array $sessionParams): void
    {
        $cookieExpirationTime = time() + (30 * 24 * 60 * 60);  // for 1 month

        $randomPassword = $this->security->getSaltBytes(32);
        $this->cookies->set("random_token", $randomPassword, $cookieExpirationTime);

        $randomPasswordHash = $this->security->hash($randomPassword);

        $expiryDate = date("Y-m-d H:i:s", $cookieExpirationTime);

        // Get token for username
        $parameters = [
            'conditions' => 'tokenHash = :tokenHash:',
            'binds' => [
                'tokenHash' => $randomPasswordHash,
            ],
        ];
        $userToken = AuthTokens::findFirst($parameters);
        if ($userToken === null) {
            $userToken = new AuthTokens();
        }
        // Insert new token
        $userToken->tokenHash = $randomPasswordHash;
        $userToken->expiryDate = $expiryDate;
        $userToken->sessionParams = json_encode($sessionParams);
        $userToken->save();
    }

    /**
     * Clears remember me cookies
     */
    private function clearAuthCookies(): void
    {
        if ($this->cookies->has('random_token')) {
            $cookie = $this->cookies->get('random_token');
            $value = $cookie->getValue();
            $userTokens = AuthTokens::find();
            foreach ($userTokens as $userToken) {
                if ($this->security->checkHash($value, $userToken->tokenHash)) {
                    $userToken->delete();
                }
            }
            $cookie->delete();
        }
    }

    /**
     * Updates system settings for language
     *
     */
    private function updateSystemLanguage(): void
    {
        $newLanguage = $this->session->get(SessionController::WEB_ADMIN_LANGUAGE);
        if (!isset($newLanguage)) {
            return;
        }
        $languageSettings = PbxSettings::findFirstByKey('WebAdminLanguage');
        if ($languageSettings === null) {
            $languageSettings = new PbxSettings();
            $languageSettings->key = 'WebAdminLanguage';
            $languageSettings->value = PbxSettings::getDefaultArrayValues()['WebAdminLanguage'];
        }
        if ($newLanguage !== $languageSettings->value) {
            $languageSettings->value = $newLanguage;
            $languageSettings->save();
        }
    }

    /**
     * Process language change
     */
    public function changeLanguageAction(): void
    {
        $newLanguage = $this->request->getPost('newLanguage', 'string');
        if (array_key_exists($newLanguage, $this->elements->getAvailableWebAdminLanguages())) {
            $this->session->set(SessionController::WEB_ADMIN_LANGUAGE, $newLanguage);
            if ($this->session->has(self::SESSION_ID)) {
                $this->updateSystemLanguage();
            }
            $this->view->success = true;
        } else {
            $this->view->success = false;
        }
    }

    /**
     * Finishes the active session redirecting to the index
     *
     */
    public function endAction(): void
    {
        $this->session->remove(self::SESSION_ID);
        $this->session->destroy();
        $this->clearAuthCookies();
    }
}
