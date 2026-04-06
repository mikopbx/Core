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

namespace MikoPBX\Tests\AdminCabinet\Tests\Traits;

use Facebook\WebDriver\WebDriverBy;
use RuntimeException;

/**
 * Trait LoginTrait
 * Handles authentication in tests
 *
 * Note: Cookie persistence between test sessions doesn't work due to httpOnly cookie restrictions.
 * Each test session performs a fresh login. Use processIsolation="false" in phpunit.xml
 * to share sessions within a test suite.
 */
trait LoginTrait
{
    /**
     * Perform login on MikoPBX
     *
     * @dataProvider loginDataProvider
     * @param array $params Login parameters
     * @return void
     */
    public function LoginOnMikoPbx(array $params): void
    {
        $this->performLogin($params);
    }

    /**
     * Perform login using credentials (JWT authentication)
     *
     * Flow:
     * 1. Fill login form with username/password
     * 2. JavaScript calls /pbxcore/api/v3/auth:login via AJAX
     * 3. Server returns accessToken (saved in memory by TokenManager)
     * 4. Server sets refreshToken in httpOnly cookie
     * 5. User is authenticated for this browser session
     *
     * @param array $params Login parameters
     * @return void
     * @throws RuntimeException
     */
    private function performLogin(array $params): void
    {
        // Quick check if login form exists (without waiting for all AJAX)
        if (!$this->isLoginFormPresent()) {
            self::annotate('Login form not found on first load, refreshing once');
            self::$driver->navigate()->refresh();
            // Give page a moment to load after refresh
            usleep(500000); // 500ms

            if (!$this->isLoginFormPresent()) {
                throw new RuntimeException('Login form not found after page refresh');
            }
        }

        // First attempt with primary password
        $this->changeInputField('login', $params['login']);
        $this->changeInputField('password', $params['password']);
        $this->submitLoginForm();

        // Try alternative password if first attempt failed
        if ($this->hasLoginFailed() && isset($params['password2'])) {
            $this->changeInputField('password', $params['password2']);
            $this->submitLoginForm();
        }

        if (!$this->isUserLoggedIn()) {
            throw new RuntimeException('Login failed: Credentials not accepted');
        }

        $this->assertTrue(true);
    }

    /**
     * Submit the login form
     *
     * @return void
     * @throws RuntimeException
     */
    private function submitLoginForm(): void
    {
        try {
            $xpath = '//form[@id="login-form"]//ancestor::div[@id="submitbutton"]';
            $submitButton = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $submitButton->click();

            // Just wait for login AJAX to start - no need to wait for ALL AJAX to complete
            // The isUserLoggedIn() method will check if we're actually logged in
            usleep(300000); // 300ms for login request to start
        } catch (\Exception $e) {
            throw new RuntimeException('Failed to submit login form: ' . $e->getMessage());
        }
    }

    /**
     * Check for visible error messages
     *
     * @return bool
     */
    private function hasLoginFailed(): bool
    {
        try {
            $xpath = '//div[contains(@class,"error") and contains(@class,"message")]';
            $errorMessages = self::$driver->findElements(WebDriverBy::xpath($xpath));

            foreach ($errorMessages as $errorMessage) {
                try {
                    if ($errorMessage->isDisplayed()) {
                        return true;
                    }
                } catch (\Facebook\WebDriver\Exception\StaleElementReferenceException $e) {
                    // Element became stale (page redirected) - means login succeeded
                    return false;
                }
            }
        } catch (\Facebook\WebDriver\Exception\StaleElementReferenceException $e) {
            // Page redirected during element search - login likely succeeded
            return false;
        } catch (\Exception $e) {
            // If we can't check for errors, assume login hasn't failed
            // This is intentionally quiet to avoid noise in logs for successful logins
        }

        return false;
    }

    /**
     * Wait for the login process to complete
     *
     * This method waits for the main menu element to appear after login,
     * indicating that the user has been successfully authenticated and
     * the application interface is fully loaded.
     *
     * @param int $timeoutInSeconds Maximum time to wait for the menu to appear
     * @return bool True if login completed successfully, false otherwise
     */
    protected function isUserLoggedIn(int $timeoutInSeconds = 10): bool
    {
        try {
            // Create a WebDriverWait instance with appropriate timeout and polling interval
            $wait = new \Facebook\WebDriver\WebDriverWait(self::$driver, $timeoutInSeconds, 500);

            // Use a custom expected condition with exception handling inside
            $wait->until(function ($driver) {
                try {
                    $element = $driver->findElement(WebDriverBy::cssSelector("#top-menu-search"));
                    return $element->isDisplayed();
                } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
                    // Return false to continue polling
                    return false;
                } catch (\Facebook\WebDriver\Exception\StaleElementReferenceException $e) {
                    // Handle case when element was found but became stale
                    return false;
                }
            });

            // If we got here, the element was found and is displayed
            return true;
        } catch (\Facebook\WebDriver\Exception\TimeOutException $e) {
            // Timed out waiting for login to complete
            self::annotate('Login process timed out after ' . $timeoutInSeconds . ' seconds');
            return false;
        } catch (\Exception $e) {
            // Log other unexpected exceptions
            self::annotate('Warning: Error during login process: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if login form is present on the page
     *
     * @return bool
     */
    private function isLoginFormPresent(): bool
    {
        try {
            $loginForm = self::$driver->findElement(WebDriverBy::id('login-form'));
            return $loginForm->isDisplayed();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Provide test login credentials
     *
     * @return array[]
     */
    public function loginDataProvider(): array
    {
        return [
            [
                [
                    'login' => 'admin',
                    'password' => '123456789MikoPBX#1',
                    'password2' => 'admin',
                ],
            ],
        ];
    }
}
