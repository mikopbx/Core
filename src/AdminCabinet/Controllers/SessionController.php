<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\ModelsCacheProvider;
use MikoPBX\Core\System\Util;

/**
 * SessionController
 *
 * Allows to authenticate users
 */
class SessionController extends BaseController
{
    public function indexAction(): void
    {
        $this->flushCache();
        $this->view->NameFromSettings
                          = PbxSettings::getValueByKey('Name');
        $this->view->DescriptionFromSettings
                          = PbxSettings::getValueByKey('Description');
        $this->view->form = new LoginForm();
    }

    /**
     * Flush all cache folders
     */
    private function flushCache(): void
    {
        if ($this->di->has(ModelsCacheProvider::SERVICE_NAME)) {
            $this->di->getShared(ModelsCacheProvider::SERVICE_NAME)->clear();
        }
        if ($this->di->has(ManagedCacheProvider::SERVICE_NAME)) {
            $this->di->getShared(ManagedCacheProvider::SERVICE_NAME)->clear();
        }
    }

    /**
     * This action authenticate and logs an user into the application
     *
     */
    public function startAction(): void
    {
        if ( ! $this->request->isPost()) {
            $this->forward('session/index');
        }
        $loginFromUser = $this->request->getPost('login');
        $passFromUser  = $this->request->getPost('password');
        $this->flash->clear();
        $login    = PbxSettings::getValueByKey('WebAdminLogin');
        $password = PbxSettings::getValueByKey('WebAdminPassword');
        if ($password === $passFromUser && $login === $loginFromUser) {
            $this->_registerSession('admins');
            $this->updateSystemLanguage();
            $this->view->success = true;
            $this->view->reload  = 'index/index';
        } else {
            $this->view->success = false;
            $this->flash->error($this->translation->_('auth_WrongLoginPassword'));
            $remoteAddress = $this->request->getClientAddress(true);
            $userAgent     = $this->request->getUserAgent();
            $this->loggerAuth->warning("From: {$remoteAddress} UserAgent:{$userAgent} Cause: Wrong password");
        }
    }

    /**
     * Register an authenticated user into session data
     *
     * @param  $role
     */
    private function _registerSession($role): void
    {
        $sessionParams = [
            'role' => $role,
        ];
        $this->session->set('auth', $sessionParams);
    }

    /**
     * Updates system settings for language
     *
     */
    private function updateSystemLanguage(): void
    {
        $newLanguage = $this->session->get('WebAdminLanguage');
        if ( ! isset($newLanguage)) {
            return;
        }
        $languageSettings = PbxSettings::findFirstByKey('WebAdminLanguage');
        if ($languageSettings === null) {
            $languageSettings      = new PbxSettings();
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
            $this->session->set('WebAdminLanguage', $newLanguage);
            if ($this->session->has('auth')) {
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
        $this->flushCache();
        $this->session->remove('auth');
        $this->session->destroy();
    }
}
