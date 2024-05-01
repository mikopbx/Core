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

use ErrorException;
use MikoPBX\AdminCabinet\Forms\LoginForm;
use MikoPBX\Common\Models\AuthTokens;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\AclProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\WebUIConfigInterface;

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
    public const SESSION_ID = 'authAdminCabinet';

    /**
     * Constant for user role within the session.
     */
    public const ROLE = 'role';

    /**
     * Constant for the default home page after login.
     */
    public const HOME_PAGE = 'homePage';

    /**
     * Constant for the user's name within the session.
     */
    public const USER_NAME = 'userName';

    /**
     * Constant for maximum login attempts within the interval.
     */
    private const LOGIN_ATTEMPTS=10;

    /**
     * Constant for the interval to reset login attempts (in seconds).
     */
    private const LOGIN_ATTEMPTS_INTERVAL=300;

    /**
     * Renders the login page.
     *
     * This method prepares and displays the login form along with system settings
     * such as PBX name and description.
     */
    public function indexAction(): void
    {
        $this->view->setVar('NameFromSettings', PbxSettings::getValueByKey(PbxSettingsConstants::PBX_NAME));
        $description = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_DESCRIPTION);
        if ($description===PbxSettingsConstants::DEFAULT_CLOUD_PASSWORD_DESCRIPTION){
            $description=$this->translation->_($description);
        }
        $this->view->setVar('DescriptionFromSettings', $description);
        $this->view->setVar('form', new LoginForm());

        $remoteAddress = $this->request->getClientAddress(true);
        $remainAttempts = $this->countRemainAttempts($remoteAddress,false,self::LOGIN_ATTEMPTS_INTERVAL,self::LOGIN_ATTEMPTS);
        $this->view->remainAttempts = $remainAttempts;
        $this->view->loginAttemptsInterval = self::LOGIN_ATTEMPTS_INTERVAL;
    }

    /**
     * Processes the login form submission.
     *
     * Validates user credentials and initializes a user session on success.
     * Implements login throttling by tracking login attempts and blocking further attempts if necessary.
     *
     * @throws ErrorException Throws an exception if there is an error during the process.
     */
    public function startAction(): void
    {
        if (!$this->request->isPost()) {
            $this->forward('session/index');
        }
        $remoteAddress = $this->request->getClientAddress(true);
        $remainAttempts = $this->countRemainAttempts($remoteAddress,true,self::LOGIN_ATTEMPTS_INTERVAL,self::LOGIN_ATTEMPTS);
        if ($remainAttempts === 0) {
            $userAgent = $this->request->getUserAgent();
            $this->loggerAuth->warning("From: {$remoteAddress} UserAgent:{$userAgent} Cause: Wrong password");
            $this->flash->error($this->translation->_('auth_TooManyLoginAttempts',['interval'=>self::LOGIN_ATTEMPTS_INTERVAL]));
            $this->view->success = true;
            $this->view->reload = $this->url->get('session/index');
            return;
        }

        $loginFromUser = (string)$this->request->getPost('login', null, 'guest');
        $passFromUser = (string)$this->request->getPost('password', null, 'guest');
        $this->flash->clear();
        $userLoggedIn = false;
        $sessionParams = [];
        // Check if the provided login and password match the stored values
        if ($this->checkCredentials($loginFromUser, $passFromUser))
            {
            $sessionParams = [
                SessionController::ROLE => AclProvider::ROLE_ADMINS,
                SessionController::HOME_PAGE => $this->url->get('extensions/index'),
                SessionController::USER_NAME => $loginFromUser
            ];
            $userLoggedIn = true;
        } else {
            // Try to authenticate user over additional module
            $additionalModules = PBXConfModulesProvider::hookModulesMethod(WebUIConfigInterface::AUTHENTICATE_USER, [$loginFromUser, $passFromUser]);

            // Check if any additional module successfully authenticated the user
            foreach ($additionalModules as $moduleUniqueId => $sessionData) {
                if (!empty($sessionData)) {
                    $this->loggerAuth->info("User $loginFromUser was authenticated over module $moduleUniqueId");
                    $sessionParams = $sessionData;
                    $userLoggedIn = true;
                    break;
                }
            }
        }

        if ($userLoggedIn) {
            // Register the session with the specified parameters
            $this->_registerSession($sessionParams);
            if ($this->session->has(PbxSettingsConstants::WEB_ADMIN_LANGUAGE)){
                LanguageController::updateSystemLanguage($this->session->get(PbxSettingsConstants::WEB_ADMIN_LANGUAGE));
            }
            $this->view->success = true;
            $backUri = $this->request->getPost('backUri');
            if (!empty($backUri)) {
                $this->view->reload = $backUri;
            } else {
                $this->view->reload = $this->session->get(SessionController::HOME_PAGE);
            }
        } else {
            // Authentication failed
            $this->view->success = false;
            $this->flash->error($this->translation->_('auth_WrongLoginPassword',['attempts'=>$remainAttempts]));
            $this->clearAuthCookies();
        }

    }

    /**
     * Registers a user session with specific parameters.
     *
     * This method sets session variables and optionally sets a cookie for remembering the session.
     *
     * @param array $sessionParams Parameters to store in the session.
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
     * Sets up a cookie in the user's browser to remember the session.
     *
     * This method is called if the user selects the 'remember me' option on the login form.
     *
     * @param array $sessionParams Parameters associated with the session.
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
     * Clears authentication cookies.
     *
     * This method is typically called during logout to ensure that session cookies are properly cleaned up.
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
     * Ends the user's session and redirects to the login page.
     *
     * This method is used to log out the user, clearing all session data and authentication cookies.
     */
    public function endAction(): void
    {
        $this->session->remove(self::SESSION_ID);
        $this->session->destroy();
        $this->clearAuthCookies();
    }

    /**
     * Verifies if provided credentials match stored values.
     *
     * This method checks user-provided login and password against stored credentials,
     * using secure methods to compare hashed passwords.
     *
     * @param string $login Login name from user input.
     * @param string $password Password from user input.
     * @return bool True if credentials are correct, otherwise false.
     * @throws ErrorException Throws an exception if there is an error during the process.
     */
    private function checkCredentials(string $login, string $password):bool
    {
        // Check admin login name
        $storedLogin = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_LOGIN);
        if ($storedLogin !== $login) {
            return false;
        }

        // Old password check method
        $passwordHash = PbxSettings::getValueByKey(PbxSettingsConstants::WEB_ADMIN_PASSWORD);
        if ($passwordHash === $password) {
            return true;
        }

        // New password check method
        set_error_handler(function($severity, $message, $file, $line) {
            throw new ErrorException($message, 0, $severity, $file, $line);
        });

        try {
            $result = $this->security->checkHash($password, $passwordHash);
        } catch (ErrorException $e) {
            $result = false;
        }
        restore_error_handler();
        return $result;
    }

    /**
     *
     * @param int $interval
     * @return string
     */
    private static function getSessionsKeepAliveKey(int $interval): string
    {
        // Anti FLOOD
        $timestamp = time();
        // Calculate the start of the 5-minute interval
        $interval_start = floor($timestamp / $interval) * $interval;
        return "SessionController:LoginAttempts:$interval_start";
    }

    /**
     * Checks and manages login attempts, implementing throttling to prevent brute-force attacks.
     *
     * @param mixed $remoteAddress The IP address of the client making the request.
     * @param int $interval The interval for resetting the count of login attempts.
     * @param int $maxCount The maximum allowed login attempts within the given interval.
     * @return int The remaining number of attempts within the interval.
     */
    private function countRemainAttempts($remoteAddress, bool $increment = true, int $interval=300, int $maxCount=10): int
    {
        if (!is_string($remoteAddress)){
            return $maxCount;
        }
        $redisAdapter = $this->di->getShared(ManagedCacheProvider::SERVICE_NAME)->getAdapter();
        $zKey = self::getSessionsKeepAliveKey($interval);
        if ($increment){
            $redisAdapter->zIncrBy($zKey, 1, $remoteAddress);
        } else {
            $redisAdapter->zIncrBy($zKey, 0, $remoteAddress);
        }
        $redisAdapter->expire($zKey, $interval);

        $count = $redisAdapter->zScore($zKey, $remoteAddress);
        return Max($maxCount-$count,0);
    }
}
