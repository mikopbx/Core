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

        // Use /tmp for cookie storage (writable, persists during test run)
        $cookieDir = getenv('SELENIUM_COOKIE_DIR') ?: '/tmp/selenium_cookies';

        $this->cookieManager = new CookieManager(
            self::$driver,
            $domain,
            $cookieDir
        );
    }

    /**
     * Test the login functionality
     *
     * @dataProvider loginDataProvider
     * @param array $params Login parameters
     * @param bool $skipCookieRestore Skip cookie restoration attempt (useful for login tests)
     * @return void
     */
    public function LoginOnMikoPbx(array $params, bool $skipCookieRestore = false): void
    {
        if ($this->cookieManager === null) {
            $this->initializeCookieManager();
        }

        $this->waitForAjax();

        // Try to restore session from cookies (skip for login tests to save time)
        if (!$skipCookieRestore && $this->tryLoginWithCookies()) {
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
            self::annotate('No saved cookies found - will perform full login');
            return false;
        }

        try {
            self::annotate('Saved cookies loaded - attempting to restore session');

            // Check if we're already on the target page
            $currentUrl = self::$driver->getCurrentURL();
            $targetUrl = $GLOBALS['SERVER_PBX'];

            // Only refresh if we're already on the same domain (to apply cookies)
            // Don't navigate if we're already there - it would clear cookies!
            if (strpos($currentUrl, parse_url($targetUrl, PHP_URL_HOST)) !== false) {
                // Already on correct domain - just refresh to apply cookies
                self::$driver->navigate()->refresh();
            } else {
                // Need to navigate to the domain first
                self::$driver->navigate()->to($targetUrl);
            }

            // Give TokenManager time to initialize and call /auth:refresh
            // No need to wait for ALL AJAX - just the JWT refresh
            usleep(1500000); // 1.5 seconds for JWT refresh

            // Check if login was successful
            // isUserLoggedIn will wait up to 10 seconds for menu to appear
            $isLoggedIn = $this->isUserLoggedIn(10);

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

        // Quick check if login form exists
        if (!$this->isLoginFormPresent()) {
            self::annotate('Login form not found on first load, refreshing once');
            self::$driver->navigate()->refresh();
            $this->waitForAjax(5); // Shorter timeout for refresh

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

        // Save successful login cookies BEFORE assertTrue
        if ($this->cookieManager->saveCookies()) {
            self::annotate('Successfully saved authentication cookies for future tests');
        } else {
            self::annotate('Warning: Failed to save authentication cookies');
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
            usleep(500000); // 500ms for login request to start
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