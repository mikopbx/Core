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

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\Exception\NoSuchElementException;
use Facebook\WebDriver\Exception\TimeoutException;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;

/**
 * Trait for logging into the admin cabinet using WebDriver.
 */
trait LoginTrait
{

    /**
     * Test the login functionality with support for cookie-based authentication fallback.
     *
     * @dataProvider loginDataProvider
     * @param array $params Login parameters provided by the data provider.
     */
    public function testLogin(array $params): void
    {
        $this->waitForAjax();

        // Path to the cookie file for persistent login sessions
        $cookieFile = 'C:\Users\hello\Documents\cookies.txt';

        // Attempt to log in using existing cookies
        if (file_exists($cookieFile)) {
            self::annotate('Test action: Try to login using cookies');
            $cookies = unserialize(file_get_contents($cookieFile));
            foreach ($cookies as $cookie) {
                self::$driver->manage()->addCookie($cookie);
            }
            // Navigate to a page that should be accessible only when logged in
            self::$driver->navigate()->to($GLOBALS['SERVER_PBX']);
        }

        // If cookie login failed or no cookies are present, perform a regular login
        if (!$this->isUserLoggedIn()){
            self::annotate('Test action: Cookie-based login failed or no cookies found. Attempting login with credentials.');
            $this->performLogin($cookieFile, $params);
        } else {
            self::annotate('Test action: Successfully logged in using cookies.');
            $this->assertTrue(true);
        }
    }

    /**
     * Performs login operation, first trying with cookies and then with provided credentials if necessary.
     *
     * @param array $params The login parameters including 'login', 'password', and optionally 'password2' for a retry.
     * @param string $cookieFile
     * @return void
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    private function performLogin(string $cookieFile, array $params): void
    {
        // Wait for any AJAX calls to complete before starting login process
        $this->waitForAjax();

        // Fill in the login and password fields
        $this->changeInputField('login', $params['login']);
        $this->changeInputField('password', $params['password']);
        $this->submitLoginForm();

        // If there are error messages and they are visible, try logging in with an alternative password if provided
        if ($this->hasLoginFailed()) {
            $this->changeInputField('password', $params['password2']);
            $this->submitLoginForm();
        }

        if (!$this->isUserLoggedIn()) {
            // If not logged in, throw an exception or handle the login failure appropriately
            $this->fail('Login failed: Neither cookies nor login/password works!');
        } else {
            // If logged in, save the authentication cookies for future sessions
            $this->saveAuthCookie($cookieFile);
            $this->assertElementNotFound(WebDriverBy::xpath("//input[@type='text' and @id='login' and @name='login']"));
        }
    }

    /**
     * Find and click the submit button within the login form
     *
     * @return void
     */
    private function submitLoginForm(): void
    {
        $xpath = '//form[@id="login-form"]//ancestor::div[@id="submitbutton"]'; // Adjust XPath based on your actual HTML structure
        $submitButton = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $submitButton->click();
        // Wait for any AJAX calls to complete after submission
        $this->waitForAjax();
    }

    /**
     * Check for any error messages indicating login failure
     *
     * @return bool
     */
    private function hasLoginFailed(): bool
    {
        $xpath = '//div[contains(@class,"error") and contains(@class,"message")]';
        $errorMessages = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($errorMessages as $errorMessage) {
            if ($errorMessage->isDisplayed()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if the user is logged in by checking if the search field is visible.
     * @return bool
     *
     */
    private function isUserLoggedIn(): bool
    {
        try {
            self::$driver->wait(15, 500)->until(
                WebDriverExpectedCondition::visibilityOfElementLocated(
                    WebDriverBy::id("top-menu-search")
                )
            );
            return true;
        } catch (NoSuchElementException $e) {

        } catch (TimeOutException $e) {

        } catch (\Exception $e) {
            $this->fail($e->getMessage());
        }
        return false;
    }

    /**
     * @param string $cookieFile
     * @return void
     */
    private function saveAuthCookie(string $cookieFile): void
    {
        $cookies = self::$driver->manage()->getCookies();
        file_put_contents($cookieFile, serialize($cookies));
        self::annotate('Test action: Logged in with login/password!');
    }


    /**
     * Provide login data for testing.
     *
     * @return array
     */
    public function loginDataProvider(): array
    {
        $params = [];
        $params[] = [
            [
                'login' => 'admin',
                'password' => '123456789MikoPBX#1',
                'password2' => 'admin',
            ],
        ];

        return $params;
    }
}