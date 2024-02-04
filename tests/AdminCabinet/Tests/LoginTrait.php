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

use Facebook\WebDriver\WebDriverBy;

/**
 * Trait for logging into the admin cabinet using WebDriver.
 */
trait LoginTrait
{

    /**
     * Perform the login operation with cookie file
     *
     * @dataProvider loginDataProvider
     *
     * @param array $params The login parameters.
     */
    public function testLogin(array $params): void
    {
        $cookieFile = 'C:\Users\hello\Documents\cookies.txt';

        // Go to the index page
        self::$driver->get($GLOBALS['SERVER_PBX']);

        $loggedIn = false;
        // Check previous login by cookie
        if (file_exists($cookieFile)) {
            self::annotate('Try to login using cookies');
            $cookies = unserialize(file_get_contents($cookieFile));
            foreach ($cookies as $cookie) {
                self::$driver->manage()->addCookie($cookie);
            }
            // Go to the index page
            self::$driver->navigate()->to($GLOBALS['SERVER_PBX']);
            self::$driver->wait(5, 1000)->until(function ($driver) {
                $elements = $driver->findElements(WebDriverBy::id("top-menu-search"));
                return count($elements) > 0;
            });
            $loggedIn = count(self::$driver->findElements(WebDriverBy::id('top-menu-search')))>0;
        }
        if (!$loggedIn){
            self::annotate('Login using credentials');
            $this->performLogin($cookieFile, $params);
        } else {
            self::annotate('Logged in using cookies');
            $this->assertTrue(true);
        }
    }

    /**
     * Perform full login test
     * @param string $cookieFile
     * @param array $params
     * @return void
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    private function performLogin(string $cookieFile, array $params): void
    {
        $this->changeInputField('login', $params['login']);
        $this->changeInputField('password', $params['password']);

        $xpath = '//form[@id="login-form"]//ancestor::div[@id="submitbutton"]';

        $button_Submit = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $button_Submit->click();
        $this->waitForAjax();

        $xpath = '//div[contains(@class,"error") and contains(@class,"message")]';
        $errorMessages = self::$driver->findElements(WebDriverBy::xpath($xpath));
        if (count($errorMessages) > 0) {
            foreach ($errorMessages as $errorMessage) {
                if ($errorMessage->isDisplayed()) {
                    $this->changeInputField('password', $params['password2']);
                    $xpath = '//form[@id="login-form"]//ancestor::div[@id="submitbutton"]';
                    $button_Submit = self::$driver->findElement(WebDriverBy::xpath($xpath));
                    $button_Submit->click();
                }
            }
        }

        self::$driver->wait(10, 500)->until(function ($driver) {
            $elements = $driver->findElements(WebDriverBy::id("top-menu-search"));
            return count($elements) > 0;
        });

        $loggedIn = self::$driver->findElement(WebDriverBy::id('top-menu-search'));

        if (!$loggedIn){
            $this->assertFalse(true);
            self::setSessionStatus('Neither cookies, not login password works!');
        } else {
            // Save auth cookie
            $cookies = self::$driver->manage()->getCookies();
            file_put_contents($cookieFile, serialize($cookies));
            $this->assertTrue(true);
            self::annotate('Logged in with login/password!');
        }

        $this->assertElementNotFound(WebDriverBy::xpath("//input[@type = 'text' and @id = 'login' and @name = 'login']"));
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