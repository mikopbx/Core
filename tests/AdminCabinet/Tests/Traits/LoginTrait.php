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
use MikoPBX\Tests\AdminCabinet\Tests\Utils\CookieManager;
use RuntimeException;

/**
 * Trait LoginTrait
 * Handles authentication in tests with improved cookie management
 */
trait LoginTrait
{
    private ?CookieManager $cookieManager = null;

    /**
     * Initialize cookie manager
     *
     * @return void
     */
    protected function initializeCookieManager(): void
    {
        if (!isset($GLOBALS['SERVER_PBX'])) {
            throw new RuntimeException('SERVER_PBX global variable is not set');
        }

        // Extract domain from SERVER_PBX global
        $domain = parse_url($GLOBALS['SERVER_PBX'], PHP_URL_HOST);
        if (!$domain) {
            throw new RuntimeException('Could not extract domain from SERVER_PBX');
        }

        $this->cookieManager = new CookieManager(
            self::$driver,
            $domain,
            getenv('SELENIUM_COOKIE_DIR')
        );
    }

    /**
     * Test the login functionality
     *
     * @dataProvider loginDataProvider
     * @param array $params Login parameters
     * @return void
     */
    public function LoginOnMikoPbx(array $params): void
    {
        if ($this->cookieManager === null) {
            $this->initializeCookieManager();
        }

        $this->waitForAjax();

        // Try to restore session from cookies
        if ($this->tryLoginWithCookies()) {
            self::annotate('Successfully logged in using saved session');
            $this->assertTrue(true);
            return;
        }

        // Perform regular login
        $this->performLogin($params);
    }

    /**
     * Try to login using saved cookies (JWT refresh token)
     *
     * With JWT authentication:
     * 1. loadCookies() restores refreshToken cookie
     * 2. Navigate to page triggers TokenManager.initialize()
     * 3. TokenManager calls /auth:refresh using refreshToken cookie
     * 4. New accessToken is stored in memory
     * 5. User is authenticated
     *
     * @return bool
     */
    private function tryLoginWithCookies(): bool
    {
        if (!$this->cookieManager->loadCookies()) {
            return false;
        }

        try {
            self::annotate('Attempting to restore session using refreshToken cookie');

            // Navigate to dashboard or protected page
            self::$driver->navigate()->to($GLOBALS['SERVER_PBX']);

            // Wait for initial AJAX requests (including TokenManager.initialize())
            $this->waitForAjax();

            // Give TokenManager extra time to complete /auth:refresh request
            // and obtain new access token from refresh token cookie
            sleep(2);

            // Wait for any subsequent AJAX after token refresh
            $this->waitForAjax();

            // Check if login was successful
            $isLoggedIn = $this->isUserLoggedIn();

            if ($isLoggedIn) {
                self::annotate('Session restored successfully via JWT refresh token');
            } else {
                self::annotate('Session restoration failed - refresh token may be expired');
            }

            return $isLoggedIn;
        } catch (\Exception $e) {
            self::annotate('Cookie login failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Perform login using credentials (JWT authentication)
     *
     * Flow:
     * 1. Fill login form with username/password
     * 2. JavaScript calls /pbxcore/api/v3/auth:login via AJAX
     * 3. Server returns accessToken (saved in memory by TokenManager)
     * 4. Server sets refreshToken in httpOnly cookie
     * 5. Browser stores cookies (including refreshToken)
     * 6. CookieManager saves all cookies for reuse in next test
     *
     * @param array $params Login parameters
     * @return void
     * @throws RuntimeException
     */
    private function performLogin(array $params): void
    {
        // Clear any existing cookies before login attempt
        $this->cookieManager->clearAll();

        $this->waitForAjax();
        
        // Check if login form exists, if not - try to refresh up to 5 times
        $maxRefreshAttempts = 5;
        $refreshAttempt = 0;
        $formFound = $this->isLoginFormPresent();
        
        while (!$formFound && $refreshAttempt < $maxRefreshAttempts) {
            self::annotate('Login form not found, refreshing page. Attempt ' . ($refreshAttempt + 1));
            self::$driver->navigate()->refresh();
            sleep(5); // Wait 5 seconds between attempts
            $this->waitForAjax();
            $formFound = $this->isLoginFormPresent();
            $refreshAttempt++;
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
        } else {
            $this->assertTrue(true);
        }

        // Save successful login cookies
        if (!$this->cookieManager->saveCookies()) {
            self::annotate('Warning: Failed to save authentication cookies');
        }
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
            // Wait for AJAX login request to start and complete
            $this->waitForAjax(10, true);
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
                if ($errorMessage->isDisplayed()) {
                    return true;
                }
            }
        } catch (\Exception $e) {
            // If we can't check for errors, assume login hasn't failed
            self::annotate('Warning: Could not check for login errors: ' . $e->getMessage());
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
    protected function isUserLoggedIn(int $timeoutInSeconds = 30): bool
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