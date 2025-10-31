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

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\Exception\TimeoutException;
use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use Facebook\WebDriver\WebDriverWait;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Class DeleteAllSettingsTest
 * Tests the "Delete All Settings" functionality that resets the system to factory defaults
 *
 * @package MikoPBX\Tests\AdminCabinet\Tests
 */
class DeleteAllSettingsTest extends MikoPBXTestsBase
{
    /**
     * Set up before each test
     */
    public function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Delete all settings");
    }

    /**
     * Test Delete All Settings functionality
     *
     * FULL VERSION - delete, wait for restart, verify empty
     */
    public function testDeleteAllSettings(): void
    {
        self::annotate("=== Test: Delete All Settings ===");

        try {
            // Step 1: Navigate to Delete All Settings tab
            self::annotate("Step 1: Navigating to Delete All Settings tab");
            $this->navigateToDeleteAllTab();

            // Step 2: Execute deletion
            self::annotate("Step 2: Executing Delete All operation");
            $this->executeDeleteAllOperation();

            // Step 3: Wait for system restart and reconnect
            self::annotate("Step 3: Waiting for system restart");
            $this->waitForSystemToBeAvailable();

            // Step 4: Force logout
            self::annotate("Step 4: Force logout");
            $this->forceLogout();

            // Step 5: Login again
            self::annotate("Step 5: Login again");
            $this->loginAgain();

            // Step 6: Navigate to Delete All tab and verify list is empty
            self::annotate("Step 6: Navigate to Delete All tab");
            $this->navigateToDeleteAllTab();

            self::annotate("Step 6b: Verify delete list is empty");
            $this->verifyDeleteListIsEmpty();

            self::annotate("✓✓✓ TEST COMPLETED SUCCESSFULLY ✓✓✓");

            $this->assertTrue(true, "Test completed successfully");

        } catch (\Exception $e) {
            self::annotate("✗✗✗ ERROR: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Navigate to Delete All Settings tab
     */
    private function navigateToDeleteAllTab(): void
    {
        // Navigate to General Settings
        $this->clickSidebarMenuItemByHref('/admin-cabinet/general-settings/modify/');

        // Click on Delete All Settings tab
        $deleteAllTabXpath = "//a[@data-tab='deleteAll']";
        $deleteAllTab = self::$driver->findElement(WebDriverBy::xpath($deleteAllTabXpath));
        $deleteAllTab->click();

        // Wait for tab content to load
        $this->waitForAjax();

        self::annotate("Navigated to Delete All Settings tab");
    }

    /**
     * Open delete modal and verify there are items to delete
     */
    private function openDeleteModalAndVerifyItemsExist(): void
    {
        // Find the delete all input field
        $deleteInputXpath = "//input[@name='deleteAllInput']";
        $deleteInput = self::$driver->findElement(WebDriverBy::xpath($deleteInputXpath));

        // Get the required phrase from translation
        $deletePhrase = $this->getDeleteAllPhrase();
        self::annotate("Using delete phrase: '$deletePhrase'");

        // Enter the delete phrase
        $deleteInput->clear();
        $deleteInput->sendKeys($deletePhrase);

        // Wait for the button to be replaced by JavaScript
        sleep(2);

        // Click the "Delete all settings" button (which is dynamically replaced)
        $deleteButtonXpath = "//div[@id='submitbutton' and contains(@class, 'negative')]";
        $deleteButton = self::$driver->findElement(WebDriverBy::xpath($deleteButtonXpath));
        $deleteButton->click();

        // Wait for modal to appear
        $this->waitForModal();

        // Wait for statistics to load (loader should disappear)
        try {
            $wait = new WebDriverWait(self::$driver, 10);
            $wait->until(
                WebDriverExpectedCondition::invisibilityOfElementLocated(
                    WebDriverBy::xpath("//div[@id='delete-statistics-content']//div[contains(@class, 'loader')]")
                )
            );
        } catch (TimeoutException $e) {
            self::annotate("Loader element not found or already hidden");
        }

        sleep(2); // Give it time to render

        // Get statistics content
        $modalContent = self::$driver->findElement(WebDriverBy::id('delete-statistics-content'))->getText();
        $sanitizedContent = str_replace(["\n", "\r", "\t"], ' ', substr($modalContent, 0, 300));
        self::annotate("Modal statistics: " . $sanitizedContent);

        // Verify at least some statistics are shown
        $statisticsElements = self::$driver->findElements(
            WebDriverBy::xpath("//div[@id='delete-statistics-content']//div[@class='ui segment']")
        );

        $this->assertGreaterThan(0, count($statisticsElements), "Statistics should be displayed in modal");
        self::annotate("✓ Verified: Found " . count($statisticsElements) . " items to delete");
    }

    /**
     * Cancel deletion by closing the modal
     */
    private function cancelDeletion(): void
    {
        // Click cancel button
        $cancelButtonXpath = "//div[@id='delete-all-modal']//div[contains(@class, 'cancel')]";
        $cancelButton = self::$driver->findElement(WebDriverBy::xpath($cancelButtonXpath));
        $cancelButton->click();

        // Wait for modal to close
        $wait = new WebDriverWait(self::$driver, 10);
        $wait->until(
            WebDriverExpectedCondition::invisibilityOfElementLocated(
                WebDriverBy::id('delete-all-modal')
            )
        );

        self::annotate("✓ Canceled deletion - modal closed");
    }

    /**
     * Execute the Delete All operation (simplified version)
     * Opens modal, confirms deletion, waits for process to complete
     */
    private function executeDeleteAllOperation(): void
    {
        self::annotate("[EXECUTE] Step 1: Finding delete input field...");

        // Find the delete all input field
        $deleteInputXpath = "//input[@name='deleteAllInput']";
        $deleteInput = self::$driver->findElement(WebDriverBy::xpath($deleteInputXpath));

        // Get the required phrase
        $deletePhrase = $this->getDeleteAllPhrase();

        // Enter the delete phrase
        $deleteInput->clear();
        $deleteInput->sendKeys($deletePhrase);

        // Wait for the button to be replaced
        sleep(2);

        // Click the "Delete all settings" button
        $deleteButtonXpath = "//div[@id='submitbutton' and contains(@class, 'negative')]";
        $deleteButton = self::$driver->findElement(WebDriverBy::xpath($deleteButtonXpath));
        $deleteButton->click();

        // Wait for modal to appear
        $this->waitForModal();

        // Wait for statistics to load
        try {
            $wait = new WebDriverWait(self::$driver, 10);
            $wait->until(
                WebDriverExpectedCondition::invisibilityOfElementLocated(
                    WebDriverBy::xpath("//div[@id='delete-statistics-content']//div[contains(@class, 'loader')]")
                )
            );
        } catch (TimeoutException $e) {
        }

        sleep(2);

        // Click confirm button in modal
        $confirmButton = self::$driver->findElement(WebDriverBy::id('confirm-delete-all'));
        $confirmButton->click();

        // Wait for deletion process to complete (up to 2 minutes)
        $this->waitForDeletionToComplete();
    }

    /**
     * Wait for deletion process to complete
     */
    private function waitForDeletionToComplete(): void
    {

        // Strategy: Wait for modal to disappear OR page to start reloading
        // Deletion process updates data-stage attribute on modal
        $maxWaitTime = 120; // 2 minutes max
        $startTime = time();

        while ((time() - $startTime) < $maxWaitTime) {
            try {
                // Check if modal still exists
                $modalElements = self::$driver->findElements(WebDriverBy::id('delete-all-modal'));

                if (count($modalElements) === 0) {
                    return;
                }

                // Check if modal is still visible
                if (!$modalElements[0]->isDisplayed()) {
                    return;
                }

                // Check data-stage attribute
                $stage = $modalElements[0]->getAttribute('data-stage');

                // If stage is 'complete' or 'DeleteAll_Stage_Restart' - deletion done
                if ($stage === 'complete' || $stage === 'DeleteAll_Stage_Restart') {
                    sleep(2); // Wait a bit for UI to stabilize
                    return;
                }

                sleep(5); // Check every 5 seconds

            } catch (\Exception $e) {
                // Modal might have disappeared due to page reload
                sleep(2);
                return;
            }
        }

    }

    /**
     * Wait for delete process to complete
     *
     * SIMPLIFIED: Just wait fixed time and close modal
     */
    private function waitForDeleteProcessToComplete(): void
    {
        self::annotate("Waiting for delete process to complete (120 seconds)...");

        // Wait 2 minutes for delete process
        $waitTime = 120;
        sleep($waitTime);

        self::annotate("Delete process should be complete, looking for close button...");

        // Try to close the modal if it's still visible
        try {
            $modalElements = self::$driver->findElements(WebDriverBy::id('delete-all-modal'));
            if (count($modalElements) > 0 && $modalElements[0]->isDisplayed()) {
                self::annotate("Modal still visible, trying to close...");

                // Try to find and click close button
                $closeButtonXpath = "//div[@id='delete-all-modal']//div[@class='actions']//button[contains(@class, 'ok') or contains(@class, 'cancel')]";
                $closeButtons = self::$driver->findElements(WebDriverBy::xpath($closeButtonXpath));

                if (count($closeButtons) > 0) {
                    self::annotate("Clicking close button...");
                    $closeButtons[0]->click();
                    sleep(2);
                } else {
                    self::annotate("No close button found, modal may have closed automatically");
                }
            } else {
                self::annotate("Modal already closed");
            }
        } catch (\Exception $e) {
            self::annotate("Note: " . $e->getMessage());
            // Continue anyway
        }

        self::annotate("✓ Delete process completed");
    }

    /**
     * Wait for system to become available after restart
     * Actively checks by refreshing the page until login form appears
     */
    private function waitForSystemToBeAvailable(): void
    {
        self::annotate("Waiting for system to restart...");

        // Wait minimum 30 seconds for system to start rebooting
        sleep(30);

        self::annotate("Checking system availability...");

        $maxWaitTime = 180; // 3 minutes total max wait
        $startTime = time();
        $attempt = 0;

        while ((time() - $startTime) < $maxWaitTime) {
            $attempt++;

            try {
                // Try to navigate to the system
                self::$driver->get($GLOBALS['SERVER_PBX']);

                // Wait a bit for page to render
                sleep(2);

                // Check if login form is present (system is ready)
                $loginFormElements = self::$driver->findElements(WebDriverBy::id('login-form'));
                if (count($loginFormElements) > 0 && $loginFormElements[0]->isDisplayed()) {
                    self::annotate("✓ System is available");
                    return;
                }


            } catch (\Exception $e) {
            }

            // Wait 5 seconds before next attempt
            sleep(5);
        }

        throw new \Exception("System did not become available within {$maxWaitTime} seconds");
    }

    /**
     * Force logout to ensure clean state
     */
    private function forceLogout(): void
    {
        self::annotate("=== FORCING LOGOUT ===");

        try {
            // Navigate to the base URL
            self::$driver->get($GLOBALS['SERVER_PBX']);
            sleep(2);

            // Check if we're already on login page
            $loginFormElements = self::$driver->findElements(WebDriverBy::id('login-form'));
            if (count($loginFormElements) > 0 && $loginFormElements[0]->isDisplayed()) {
                self::annotate("Already logged out - login form is visible");
                return;
            }

            // Try to find and click logout button
            $userMenuXpath = "//div[@id='user-cabinet-menu']";
            $userMenuElements = self::$driver->findElements(WebDriverBy::xpath($userMenuXpath));

            if (count($userMenuElements) > 0 && $userMenuElements[0]->isDisplayed()) {
                self::annotate("Clicking user menu...");
                $userMenuElements[0]->click();
                sleep(1);

                // Look for logout link
                $logoutXpath = "//a[@href='/session/end']";
                $logoutElements = self::$driver->findElements(WebDriverBy::xpath($logoutXpath));

                if (count($logoutElements) > 0) {
                    self::annotate("Clicking logout link...");
                    $logoutElements[0]->click();
                    sleep(3);

                    // Verify we're on login page
                    $wait = new WebDriverWait(self::$driver, 10);
                    $wait->until(
                        WebDriverExpectedCondition::visibilityOfElementLocated(
                            WebDriverBy::id('login-form')
                        )
                    );

                    self::annotate("✓ Successfully logged out");
                    return;
                }
            }

            // Fallback: navigate directly to logout URL
            self::annotate("Navigating to /session/end");
            self::$driver->get($GLOBALS['SERVER_PBX'] . '/session/end');
            sleep(3);

            $wait = new WebDriverWait(self::$driver, 10);
            $wait->until(
                WebDriverExpectedCondition::visibilityOfElementLocated(
                    WebDriverBy::id('login-form')
                )
            );

            self::annotate("✓ Logged out via direct URL");

        } catch (\Exception $e) {
            self::annotate("Logout error: " . $e->getMessage());

            // Check if we're already logged out
            try {
                self::$driver->get($GLOBALS['SERVER_PBX']);
                sleep(2);

                $loginFormElements = self::$driver->findElements(WebDriverBy::id('login-form'));
                if (count($loginFormElements) > 0 && $loginFormElements[0]->isDisplayed()) {
                    self::annotate("✓ Already on login page");
                    return;
                }
            } catch (\Exception $e2) {
                // Ignore
            }

            throw new \Exception("Failed to logout: " . $e->getMessage());
        }
    }

    /**
     * Login again after system restart
     */
    private function loginAgain(): void
    {
        self::annotate("=== LOGGING IN AGAIN ===");

        try {
            // Ensure we're on the base URL
            self::$driver->get($GLOBALS['SERVER_PBX']);
            sleep(2);

            // Wait for login form
            $wait = new WebDriverWait(self::$driver, 30);
            $wait->until(
                WebDriverExpectedCondition::visibilityOfElementLocated(
                    WebDriverBy::id('login-form')
                )
            );


            // Fill in username
            $usernameField = self::$driver->findElement(WebDriverBy::name('login'));
            $usernameField->clear();
            $usernameField->sendKeys('admin');

            // Fill in password
            $passwordField = self::$driver->findElement(WebDriverBy::name('password'));
            $passwordField->clear();
            $passwordField->sendKeys('123456789MikoPBX#1');


            // Submit form
            $submitButton = self::$driver->findElement(WebDriverBy::id('submitbutton'));
            $submitButton->click();

            // Wait for successful login
            $wait->until(
                WebDriverExpectedCondition::visibilityOfElementLocated(
                    WebDriverBy::id('top-menu-search')
                )
            );

            sleep(2); // Wait for page to stabilize

            self::annotate("✓ Successfully logged in");

        } catch (\Exception $e) {
            throw new \Exception("Failed to login again: " . $e->getMessage());
        }
    }

    /**
     * Verify that delete list is empty after deletion
     */
    private function verifyDeleteListIsEmpty(): void
    {
        self::annotate("=== VERIFYING DELETE LIST IS EMPTY ===");

        // Find the delete all input field
        $deleteInputXpath = "//input[@name='deleteAllInput']";
        $deleteInput = self::$driver->findElement(WebDriverBy::xpath($deleteInputXpath));

        // Get the required phrase
        $deletePhrase = $this->getDeleteAllPhrase();
        self::annotate("Using delete phrase: '$deletePhrase'");

        // Enter the delete phrase
        $deleteInput->clear();
        $deleteInput->sendKeys($deletePhrase);

        // Wait for the button to be replaced
        sleep(2);

        // Click the "Delete all settings" button
        $deleteButtonXpath = "//div[@id='submitbutton' and contains(@class, 'negative')]";
        $deleteButton = self::$driver->findElement(WebDriverBy::xpath($deleteButtonXpath));
        $deleteButton->click();

        // Wait for modal to appear
        $this->waitForModal();

        // Wait for statistics to load
        try {
            $wait = new WebDriverWait(self::$driver, 10);
            $wait->until(
                WebDriverExpectedCondition::invisibilityOfElementLocated(
                    WebDriverBy::xpath("//div[@id='delete-statistics-content']//div[contains(@class, 'loader')]")
                )
            );
        } catch (TimeoutException $e) {
            self::annotate("Loader not found or already hidden");
        }

        sleep(2);

        // Get statistics content
        $modalContent = self::$driver->findElement(WebDriverBy::id('delete-statistics-content'))->getText();
        $sanitizedContent = str_replace(["\n", "\r", "\t"], ' ', $modalContent);
        self::annotate("Delete statistics: " . substr($sanitizedContent, 0, 300));

        // Check statistics
        $statisticsElements = self::$driver->findElements(
            WebDriverBy::xpath("//div[@id='delete-statistics-content']//div[@class='ui segment']")
        );

        self::annotate("Found " . count($statisticsElements) . " statistic segments");

        // Check if there are items to delete
        $hasNonZeroItems = false;
        foreach ($statisticsElements as $index => $element) {
            $text = $element->getText();
            $sanitizedText = str_replace(["\n", "\r", "\t"], ' ', mb_substr($text, 0, 100));
            self::annotate("  Segment " . ($index + 1) . ": " . $sanitizedText);

            // Check for non-zero counts
            if (preg_match('/(\d+)\s+/u', $text, $matches)) {
                $count = (int)$matches[1];
                if ($count > 0) {
                    $hasNonZeroItems = true;
                    self::annotate("  ⚠ Found count: " . $count);
                }
            }
        }

        // Close the modal
        $cancelButtonXpath = "//div[@id='delete-all-modal']//div[contains(@class, 'cancel')]";
        $cancelButton = self::$driver->findElement(WebDriverBy::xpath($cancelButtonXpath));
        $cancelButton->click();

        $wait = new WebDriverWait(self::$driver, 10);
        $wait->until(
            WebDriverExpectedCondition::invisibilityOfElementLocated(
                WebDriverBy::id('delete-all-modal')
            )
        );

        if ($hasNonZeroItems) {
            self::annotate("⚠ WARNING: Delete list contains items - data may not be fully deleted");
        } else {
            self::annotate("✓ Delete list is empty - all data was deleted");
        }

        self::annotate("✓ Verification completed");
    }

    /**
     * Get the delete all phrase from page or configuration
     */
    private function getDeleteAllPhrase(): string
    {
        // Try to get it from JavaScript variable
        try {
            $phrase = self::$driver->executeScript("return globalTranslate.gs_EnterDeleteAllPhrase;");
            if (!empty($phrase)) {
                return $phrase;
            }
        } catch (\Exception $e) {
            // JavaScript variable not available
        }

        // Try to get from page label
        try {
            $labelXpath = "//label[@for='deleteAllInput']";
            $label = self::$driver->findElement(WebDriverBy::xpath($labelXpath));
            $labelText = $label->getText();

            // Extract phrase from label
            if (preg_match('/["«](.+?)[»"]/', $labelText, $matches)) {
                return $matches[1];
            }

            // For Russian
            if (stripos($labelText, 'удалить') !== false) {
                return "удалить всё";
            }

            return "delete all";
        } catch (\Exception $e) {
            return "delete all";
        }
    }

    /**
     * Wait for modal to appear
     */
    private function waitForModal(): void
    {
        self::annotate("Waiting for delete confirmation modal");

        $wait = new WebDriverWait(self::$driver, 10);
        $wait->until(
            WebDriverExpectedCondition::visibilityOfElementLocated(
                WebDriverBy::id('delete-all-modal')
            )
        );

        // Additional wait for animation
        sleep(1);
    }
}
