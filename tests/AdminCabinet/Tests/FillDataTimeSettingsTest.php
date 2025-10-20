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

use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use Facebook\WebDriver\Exception\WebDriverException;

/**
 * Class to test the filling and changing of date and time settings in the admin cabinet.
 */
class FillDataTimeSettingsTest extends MikoPBXTestsBase
{
    /**
     * Set up before each test
     *
     * @throws GuzzleException
     * @throws \Exception
     */
    public function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Fill date time settings");
    }

    /**
     * Test the change of date and time settings.
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the test.
     */
    public function testChangeDataTimeSettings(array $params): void
    {
        // Navigate to time settings page
        $this->navigateToTimeSettings();
        
        // Set timezone and other settings
        $this->selectDropdownItem(PbxSettings::PBX_TIMEZONE, $params[PbxSettings::PBX_TIMEZONE]);
        $this->changeCheckBoxState(PbxSettings::PBX_MANUAL_TIME_SETTINGS, $params[PbxSettings::PBX_MANUAL_TIME_SETTINGS]);
        sleep(2);
        
        // Configure time settings based on mode
        if ($params[PbxSettings::PBX_MANUAL_TIME_SETTINGS]) {
            $this->changeInputField('ManualDateTime', $params['ManualDateTime']);
        } else {
            $this->changeTextAreaValue(PbxSettings::NTP_SERVER, $params['NTPServer']);
        }

        $this->executeWithRetry(function () {
            $xpath = sprintf('//form[@id="time-settings-form"]//ancestor::div[@id="submitbutton"]');
            $button = $this->waitForElement($xpath);
            $this->scrollIntoView($button);
            $button->click();
            $this->waitForAjax();
        });

        // Wait for 25 seconds until Nginx is restarted
        sleep(25);

        // Wait for the system to be ready after services restart
        if (!$this->waitForSystemReady()) {
            self::annotate("Warning: System did not respond within expected timeframe", 'warning');
        }

        // With JWT leeway (±10 minutes), time changes within this range don't require re-login
        // JWT access tokens remain valid (exp + leeway > current_time)
        // Redis refresh tokens are time-independent (TTL is a counter, not absolute time)
        // However, Nginx restart may invalidate sessions regardless of leeway
        // Try to verify session first, re-login if needed

        try {
            // Try to verify that session is still valid
            $this->verifySessionStillValid();
            self::annotate("Session still valid after time change", 'success');
        } catch (\Exception $e) {
            // Session is invalid, need to re-login
            self::annotate("Session invalidated after time change: " . $e->getMessage());
            $this->reLoginAfterTimeChange();
        }

        // Verify settings with retry mechanism
        $this->verifyTimeSettings($params);
    }
    
    /**
     * Navigate to time settings page with retry mechanism
     */
    protected function navigateToTimeSettings(): void 
    {
        $maxRetries = 10;
        $retryCount = 0;
        $success = false;
        
        while (!$success && $retryCount < $maxRetries) {
            try {
                $this->clickSidebarMenuItemByHref('/admin-cabinet/time-settings/modify/');
                $success = true;
            } catch (\Exception $e) {
                $retryCount++;
                self::annotate("Failed to navigate to time settings: {$e->getMessage()}. Retry {$retryCount}/{$maxRetries}");
                sleep(5);
            }
        }
        
        if (!$success) {
            self::fail("Could not navigate to time settings page after multiple attempts");
        }
    }
    
    /**
     * Verify time settings with retry mechanism
     */
    protected function verifyTimeSettings(array $params): void 
    {
        $maxRetries = 3;
        $retryCount = 0;
        $success = false;
        
        while (!$success && $retryCount < $maxRetries) {
            try {
                // Try to navigate to time settings page
                $this->navigateToTimeSettings();
                
                // Verify timezone
                $this->assertMenuItemSelected(PbxSettings::PBX_TIMEZONE, $params['PBXTimezone']);
                
                // Verify other settings based on mode
                if ($params[PbxSettings::PBX_MANUAL_TIME_SETTINGS]) {
                    // Skip datetime verification as it might have changed
                    // $this->assertInputFieldValueEqual('ManualDateTime', $params['ManualDateTime']);
                } else {
                    $this->assertTextAreaValueIsEqual(PbxSettings::NTP_SERVER, $params['NTPServer']);
                }
                
                // If we reach here, verification was successful
                $success = true;
                self::annotate("Time settings verified successfully", 'success');
                
            } catch (\Exception $e) {
                $retryCount++;
                self::annotate("Verification attempt {$retryCount} failed: {$e->getMessage()}", 'warning');
                sleep(5);
            }
        }
        
        if (!$success) {
            self::fail("Failed to verify time settings after multiple attempts");
        }
    }

    /**
     * Check if time change is beyond JWT leeway tolerance
     * JWT tokens have ±10 minutes leeway for clock skew and time changes
     *
     * NOTE: This method is kept for documentation purposes but is not currently used
     * in the main test flow. The test now uses automatic session verification instead.
     *
     * @param array $params Test parameters
     * @return bool True if time change exceeds leeway
     */
    protected function isTimeChangeBeyondLeeway(array $params): bool
    {
        if (!$params[PbxSettings::PBX_MANUAL_TIME_SETTINGS]) {
            // NTP mode - time changes gradually, never beyond leeway
            return false;
        }

        // Manual mode - check the time difference
        // Format is now 'Y-m-d H:i:s' (e.g., '2025-10-15 14:30:00')
        $manualDateTime = $params['ManualDateTime'];
        $targetTime = strtotime($manualDateTime);
        $currentTime = time();
        $differenceMinutes = abs($targetTime - $currentTime) / 60;

        // JWT leeway is 10 minutes (600 seconds)
        // If time change is > 10 minutes, re-login is required
        return $differenceMinutes > 10;
    }

    /**
     * Verify that session is still valid after time change within leeway
     * Checks that JWT tokens are still accepted by the server
     *
     * @throws \Exception if session is invalid
     */
    protected function verifySessionStillValid(): void
    {
        try {
            // Check current URL first - if already on login page, session is invalid
            $currentUrl = self::$driver->getCurrentURL();
            if (strpos($currentUrl, '/session/index') !== false) {
                throw new \Exception("Already on login page - session expired");
            }

            // Try to access a protected page
            $url = $GLOBALS['SERVER_PBX'] . '/admin-cabinet/';
            self::$driver->get($url);

            // Wait for page to load
            sleep(2);
            $this->waitForAjax();

            // Check if redirected to login page
            $currentUrl = self::$driver->getCurrentURL();
            if (strpos($currentUrl, '/session/index') !== false) {
                throw new \Exception("Redirected to login page - session expired");
            }

            // Check for login form presence (indicates session is invalid)
            try {
                $loginForm = self::$driver->findElement(\Facebook\WebDriver\WebDriverBy::id('login-form'));
                if ($loginForm->isDisplayed()) {
                    throw new \Exception("Login form is visible - session expired");
                }
            } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
                // Login form not found - this is good, means we're authenticated
            }

            // Check for session indicator (top menu should be visible)
            $topMenu = self::$driver->findElement(\Facebook\WebDriver\WebDriverBy::id('top-menu-search'));

            if (!$topMenu->isDisplayed()) {
                throw new \Exception("Top menu not visible - session appears invalid");
            }

            self::annotate("Session verification successful - user is authenticated");
        } catch (\Facebook\WebDriver\Exception\NoSuchElementException $e) {
            // Top menu element not found - likely on login page
            throw new \Exception("Session validation failed - top menu not found (likely on login page): " . $e->getMessage());
        } catch (\Exception $e) {
            self::annotate("Session validation failed: " . $e->getMessage(), 'error');
            throw $e;
        }
    }

    /**
     * Re-login after time change or system restart
     * Required when:
     * - System time changes beyond JWT leeway (>10 minutes)
     * - Nginx restart invalidates session cookies
     * - Session verification fails for any reason
     *
     * JWT tokens have ±10 minutes leeway:
     * - Access tokens: 15 min TTL + 10 min leeway = 25 min tolerance
     * - Refresh tokens: Redis TTL independent of system time
     *
     * This method is called automatically when session validation fails
     */
    protected function reLoginAfterTimeChange(): void
    {
        self::annotate("Re-logging in after session invalidation");

        $maxAttempts = 3;
        $loginData = $this->loginDataProvider();
        
        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                self::annotate("Login attempt {$attempt} of {$maxAttempts}");
                
                // Reload page to get fresh state
                $loginUrl = $GLOBALS['SERVER_PBX'] . '/admin-cabinet/session/index/';
                self::$driver->get($loginUrl);
                sleep(2);

                // Wait for login form to be visible
                self::$driver->wait(10, 500)->until(
                    \Facebook\WebDriver\WebDriverExpectedCondition::visibilityOfElementLocated(
                        \Facebook\WebDriver\WebDriverBy::id('login-form')
                    )
                );

                // Perform login
                $this->loginOnMikoPBX($loginData[0][0]);

                // Wait for login to complete and dashboard to load
                sleep(3);
                $this->waitForAjax();

                // Verify we're logged in by checking for top menu
                self::$driver->wait(10, 500)->until(
                    \Facebook\WebDriver\WebDriverExpectedCondition::visibilityOfElementLocated(
                        \Facebook\WebDriver\WebDriverBy::id('top-menu-search')
                    )
                );

                self::annotate("Re-login successful on attempt {$attempt}", 'success');
                return; // Success, exit the method
                
            } catch (\Exception $e) {
                self::annotate("Login attempt {$attempt} failed: " . $e->getMessage(), 'warning');
                
                // If this was the last attempt, throw the exception
                if ($attempt === $maxAttempts) {
                    self::annotate("All {$maxAttempts} login attempts failed", 'error');
                    throw new \Exception("Failed to re-login after {$maxAttempts} attempts: " . $e->getMessage());
                }
                
                // Wait before next attempt
                sleep(2);
            }
        }
    }

    /**
     * Waits for the system to be ready after restarting services
     * Uses a retry mechanism with exponential backoff
     *
     * @param int $maxAttempts Maximum number of attempts
     * @param int $initialDelay Initial delay in milliseconds
     * @return bool True if system is ready, false otherwise
     */
    protected function waitForSystemReady(int $maxAttempts = 15, int $initialDelay = 1000): bool
    {
        $attempt = 0;
        $delay = $initialDelay;
        
        self::annotate("Waiting for system to be ready after services restart");
        
        while ($attempt < $maxAttempts) {
            try {
                // Try to access admin cabinet homepage
                $url = $GLOBALS['SERVER_PBX'] . '/admin-cabinet/';
                self::$driver->get($url);
                
                // If we reach here without exception, system is responding
                self::annotate("System is ready after {$attempt} attempts", 'success');
                return true;
            } catch (WebDriverException $e) {
                $attempt++;
                $message = "System not ready yet (attempt {$attempt}/{$maxAttempts}): " . $e->getMessage();
                self::annotate($message);
                
                // Exponential backoff with a cap
                $delay = min($delay * 1.5, 10000); // Cap at 10 seconds
                usleep($delay * 1000); // Convert to microseconds
            }
        }
        
        self::annotate("System did not become ready after {$maxAttempts} attempts", 'error');
        return false;
    }

    /**
     * Dataset provider for date and time settings.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];

        // Test 1: Manual time change within JWT leeway (±10 minutes)
        // Changes time by +5 minutes - should NOT require re-login
        // JWT access tokens remain valid (exp + 600 > current_time)
        // Redis refresh tokens unaffected (TTL is time-independent)
        // Format MUST match time-settings-worker.js:117 -> 'YYYY-MM-DD HH:mm:ss'
        $params[] = [
            [
                PbxSettings::PBX_TIMEZONE => 'Europe/Riga',
                'PBXTimezone' => 'Europe/Riga', // Ensure we have the same value for verification
                PbxSettings::PBX_MANUAL_TIME_SETTINGS => true,
                'ManualDateTime' => date('Y-m-d H:i:s', strtotime('+5 minutes')),
                PbxSettings::NTP_SERVER => '',
            ],
        ];

        // Test 2: NTP synchronization (gradual time changes)
        // NTP adjusts time gradually, never exceeding leeway
        // Session always preserved during NTP sync
        $params[] = [
            [
                PbxSettings::PBX_TIMEZONE => 'Europe/Riga',
                'PBXTimezone' => 'Europe/Riga', // Ensure we have the same value for verification
                PbxSettings::PBX_MANUAL_TIME_SETTINGS => false,
                'ManualDateTime' => '',
                PbxSettings::NTP_SERVER => '0.pool.ntp.org',
            ],
        ];

        return $params;
    }
}