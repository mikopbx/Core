<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\LoginForm;
use MikoPBX\Common\Models\PbxSettings;
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
       @$this->di->get('modelsCache')->clear();
       @$this->di->get('managedCache')->clear();
    }

    /**
     * This action authenticate and logs an user into the application
     *
     */
    public function startAction():void
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
            $this->view->success = true;
            $this->view->reload  = 'index/index';
        } else {
            $this->view->success = false;
            $this->flash->error($this->translation->_('auth_WrongLoginPassword'));
            $remoteAddress = $this->request->getClientAddress(true);
            $userAgent = $this->request->getUserAgent();
            Util::sysLogMsg('web_auth', "From: {$remoteAddress} UserAgent:{$userAgent} Cause: Wrong password");
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
     * Process language change
     */
    public function changeLanguageAction(): void
    {
        $newLanguage = $this->request->getPost('newLanguage', 'string');
        if (array_key_exists($newLanguage, $this->elements->getAvailableWebAdminLanguages())) {
            $this->session->set('WebAdminLanguage', $newLanguage);
            if ($this->session->has('auth')) {
                $languageSettings = PbxSettings::findFirstByKey('WebAdminLanguage');
                if ($languageSettings === null) {
                    $languageSettings      = new PbxSettings();
                    $languageSettings->key = 'WebAdminLanguage';
                }
                $languageSettings->value = $newLanguage;
                $languageSettings->save();
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
