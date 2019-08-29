<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

use \Models\PbxSettings;

/**
 * SessionController
 *
 * Allows to authenticate users
 */
class SessionController extends BaseController
{
    public function initialize(): void
    {
        $this->tag->setTitle($this->translation->_('Sign In'));
        parent::initialize();
    }

    public function indexAction(): void
    {
        $form = new LoginForm();
        $this->view->NameFromSettings
              = PbxSettings::getValueByKey('Name');
        $this->view->DescriptionFromSettings
              = PbxSettings::getValueByKey('Description');

        $this->view->form = $form;
    }

    /**
     * Register an authenticated user into session data
     *
     * @param  $role
     */
    private function _registerSession($role)
    {
        $sessionParams = [
            'role' => $role,
            'lang' => substr(PbxSettings::getValueByKey('PBXLanguage'), 0, 2),
        ];
        $this->session->set('auth', $sessionParams);
    }

    /**
     * This action authenticate and logs an user into the application
     *
     */
    public function startAction()
    {
        if ( ! $this->request->isPost()) {
            return $this->forward('session/index');
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
            if (openlog('web_auth', LOG_ODELAY, LOG_LOCAL7)) {
                syslog(LOG_WARNING,
                    "From: {$_SERVER['REMOTE_ADDR']} UserAgent:({$_SERVER['HTTP_USER_AGENT']}) Cause: Wrong password");
                closelog();
            }
        }
    }

    /**
     * Finishes the active session redirecting to the index
     *
     */
    public function endAction(): void
    {
        $this->session->remove('auth');
        $this->session->destroy();
    }
}
