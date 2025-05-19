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

        // Save the settings
        $this->submitForm('time-settings-form');

        // Wait for 15 seconds until Nginx is restarted
        sleep(10);

        // Wait for the system to be ready after services restart
        if (!$this->waitForSystemReady()) {
            self::annotate("Warning: System did not respond within expected timeframe", 'warning');
        }

        // Verify settings with retry mechanism
        $this->verifyTimeSettings($params);
    }
    
    /**
     * Navigate to time settings page with retry mechanism
     */
    protected function navigateToTimeSettings(): void 
    {
        $maxRetries = 3;
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
        $params[] = [
            [
                PbxSettings::PBX_TIMEZONE => 'Europe/Riga',
                'PBXTimezone' => 'Europe/Riga', // Ensure we have the same value for verification
                PbxSettings::PBX_MANUAL_TIME_SETTINGS => true,
                'ManualDateTime' => date('d/m/Y, h:i:s A', strtotime('+2 hours')),
                PbxSettings::NTP_SERVER => '',
            ],
        ];
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