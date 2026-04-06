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
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class ChangeLicenseKeyTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Change license key");
    }

    /**
     * Test filling and verifying the license key.
     *
     * @dataProvider licenseKeyProvider
     *
     * @param string $licenseKey The license key to test.
     */
    public function testFillLicenseKey(string $licenseKey): void
    {
        // Navigate to the PBX extension modules section
        $this->clickSidebarMenuItemByHref('/admin-cabinet/pbx-extension-modules/index/');
        $this->changeTabOnCurrentPage('licensing');

        // Remove "MIKO-" prefix from the license key
        $licKey = str_ireplace('MIKO-', '', $licenseKey);

        // Reset license key if already filled
        $this->resetLicenseKeyIfNeeded();
        
        // Fill the license key input field
        $this->changeInputField('licKey', $licKey);

        // Save the license key
        $saveButton = self::$driver->findElement(WebDriverBy::id('save-license-key-button'));
        $saveButton->click();
        $this->waitForAjax();

        // Verify that the saved license key matches the original
        $this->clickSidebarMenuItemByHref('/admin-cabinet/pbx-extension-modules/index/');
        $this->changeTabOnCurrentPage('licensing');
        $this->assertInputFieldValueEqual('licKey', $licenseKey);
    }

    /**
     * Reset license key if it's already filled
     * 
     * @return void
     */
    private function resetLicenseKeyIfNeeded(): void
    {
        // Check if reset button exists (meaning a license key is already set)
        $resetButtonXpath = "//i[@id='reset-license-button']";
        $resetButtons = self::$driver->findElements(WebDriverBy::xpath($resetButtonXpath));
        
        // If no reset button is found, this means no license key is set - nothing to do
        if (empty($resetButtons)) {
            $this->annotate("No license key to reset", "info");
            return;
        }
        
        // Check if the reset button is actually visible/interactable
        try {
            if (!$resetButtons[0]->isDisplayed()) {
                $this->annotate("Reset button exists but is not visible", "info");
                return;
            }
        } catch (\Exception $e) {
            $this->annotate("Could not check if reset button is displayed: " . $e->getMessage(), "info");
            return;
        }
        
        $this->logTestAction("Resetting existing license key");
        
        try {
            // Click the reset button
            $resetButtons[0]->click();
            
            // Wait for the confirmation modal to appear using a silent approach
            $modalXpath = "//div[contains(@class, 'modal') and contains(@class, 'visible')]";
            
            // Используем собственную логику ожидания вместо waitForElement
            self::$driver->wait(10, 500)->until(
                function () use ($modalXpath) {
                    // Используем findElements вместо findElement, так как он не выбрасывает исключения
                    $elements = self::$driver->findElements(WebDriverBy::xpath($modalXpath));
                    return !empty($elements) && $elements[0]->isDisplayed();
                }
            );
            $this->annotate("Confirmation modal appeared", "info");
            
            // Find and click the confirm button - используем findElements для тихой проверки
            $confirmButtonXpath = "//div[@id='confirm-reset-license-button']";
            $confirmButtons = self::$driver->findElements(WebDriverBy::xpath($confirmButtonXpath));
            if (!empty($confirmButtons) && $confirmButtons[0]->isDisplayed()) {
                $confirmButtons[0]->click();
                $this->annotate("Clicked on confirm reset button", "info");
            } else {
                $this->annotate("Confirm reset button not found or not visible - continuing test", "warning");
                return;
            }
            
            // Wait for the modal to disappear
            self::$driver->wait(10, 500)->until(
                function () use ($modalXpath) {
                    try {
                        $elements = self::$driver->findElements(WebDriverBy::xpath($modalXpath));
                        return empty($elements) || !$elements[0]->isDisplayed();
                    } catch (\Exception $e) {
                        // Element not found exceptions mean the element is gone, which is what we want
                        return true;
                    }
                }
            );
            $this->annotate("Modal dialog closed", "info");
            
            // Wait for the input field to appear - снова используем тихий подход
            $inputXpath = "//input[@name='licKey']";
            self::$driver->wait(10, 500)->until(
                function () use ($inputXpath) {
                    $elements = self::$driver->findElements(WebDriverBy::xpath($inputXpath));
                    return !empty($elements) && $elements[0]->isDisplayed();
                }
            );
            $this->annotate("License key field is now available for input", "info");
            
            // Add a small delay to ensure the field is fully ready
            usleep(500000); // 500ms
        } catch (\Exception $e) {
            // Don't fail the test, just log the issue and continue
            $this->annotate("Exception during license key reset: " . $e->getMessage(), "warning");
            // Check if input field is accessible despite the error
            $inputXpath = "//input[@name='licKey']";
            $inputFields = self::$driver->findElements(WebDriverBy::xpath($inputXpath));
            if (empty($inputFields) || !$inputFields[0]->isDisplayed()) {
                $this->fail("License key field not accessible after reset attempt: " . $e->getMessage());
            }
        }
    }

    /**
     * Provides test data for the license key test.
     *
     * @return array
     */
    public function licenseKeyProvider(): array
    {
        return [
            [$GLOBALS['MIKO_LICENSE_KEY']]
        ];
    }
}
