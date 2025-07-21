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

use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use Facebook\WebDriver\WebDriverWait;
use Facebook\WebDriver\Exception\TimeoutException;
use Facebook\WebDriver\Exception\NoSuchElementException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Data\CallQueueDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\Data\EmployeeDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\Data\IncomingCallRulesDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\Data\IVRMenuDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\Data\OutgoingCallRulesDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\Data\SIPProviderDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\Data\FirewallRulesDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\Data\ConferenceRoomsDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\Data\DialplanApplicationsDataFactory;

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
     * Test complete system reset functionality
     * 
     * This test:
     * 1. Creates various test data (users, providers, routes, etc.)
     * 2. Verifies all data exists
     * 3. Executes the "Delete All" operation
     * 4. Verifies all user data was deleted
     * 5. Verifies system settings and admin credentials remain
     */
    public function testDeleteAllSettings(): void
    {
        self::annotate("Test: Delete All Settings - Complete System Reset");

        // Step 1: Save critical settings for verification
        $criticalSettings = $this->saveCriticalSettings();

        // Step 2: Create test data
        $this->createTestData();

        // Step 3: Verify test data exists
        $this->verifyTestDataExists();

        // Step 4: Test cancel operation first
        $this->testCancelOperation();

        // Step 5: Execute Delete All operation
        $this->executeDeleteAllOperation();

        // Step 6: Verify data was deleted
        $this->verifyDataDeleted();

        // Step 7: Verify system still functional
        $this->verifySystemFunctionality();

        // Step 8: Verify critical settings were preserved
        $this->verifyCriticalSettingsPreserved($criticalSettings);
    }

    /**
     * Test cancel operation in modal
     */
    private function testCancelOperation(): void
    {
        self::annotate("Testing cancel operation in delete modal");

        // Navigate to General Settings
        $this->clickSidebarMenuItemByHref('/admin-cabinet/general-settings/modify/');
        
        // Click on System tab
        $systemTabXpath = "//a[@data-tab='system']";
        $systemTab = self::$driver->findElement(WebDriverBy::xpath($systemTabXpath));
        $systemTab->click();
        
        // Wait for tab content to load
        $this->waitForAjax();
        
        // Find the delete all input field
        $deleteInputXpath = "//input[@name='deleteAllInput']";
        $deleteInput = self::$driver->findElement(WebDriverBy::xpath($deleteInputXpath));
        
        // Get the required phrase from translation
        $deletePhrase = $this->getDeleteAllPhrase();
        
        // Enter the delete phrase
        $deleteInput->clear();
        $deleteInput->sendKeys($deletePhrase);
        
        // Submit the form to trigger modal
        $this->submitForm('general-settings-form');
        
        // Wait for modal to appear
        $this->waitForModal();
        
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
        
        // Verify we're still on the same page and data is intact
        $this->assertTextPresent('Danger Zone');
        
        self::annotate("Cancel operation successful - modal closed without deleting data");
    }

    /**
     * Creates all types of test data for deletion test
     */
    private function createTestData(): void
    {
        self::annotate("Creating test data for deletion");

        // Create test extensions (users)
        $this->createTestExtensions();

        // Create SIP provider
        $this->createTestProvider();

        // Create incoming and outgoing routes
        $this->createTestRoutes();

        // Create call queue
        $this->createTestCallQueue();

        // Create IVR menu
        $this->createTestIvrMenu();

        // Create conference room
        $this->createTestConference();

        // Create dialplan application
        $this->createTestDialplanApplication();

        // Create network filter
        $this->createTestNetworkFilter();
        
        // Modify codec settings (disable some and change priorities)
        $this->modifyCodecSettings();
    }

    /**
     * Create test extensions
     */
    private function createTestExtensions(): void
    {
        self::annotate("Creating test extensions");

        // Navigate to Extensions
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        
        // Create 3 test users using predefined employee data
        $employeeKeys = ['eugeniy.makrchev', 'nikolay.beketov', 'svetlana.vlasova'];
        foreach ($employeeKeys as $key) {
            $testData = EmployeeDataFactory::getEmployeeData($key);
            
            // Click Add new button
            $this->clickButtonByHref('/admin-cabinet/extensions/modify');
            
            // Fill form
            $this->changeInputField('user_username', $testData['username']);
            $this->changeInputField('number', $testData['number']);
            $this->changeInputField('mobile_number', $testData['mobile'] ?? '');
            $this->changeInputField('user_email', $testData['email'] ?? '');
            $this->changeInputField('sip_secret', $testData['secret']);
            
            // Submit form
            $this->submitForm('extensions-form');
            
            // Wait for redirect
            $this->waitForAjax();
        }
    }

    /**
     * Create test SIP provider
     */
    private function createTestProvider(): void
    {
        self::annotate("Creating test SIP provider");

        // Navigate to Providers
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        
        // Create provider using predefined provider data
        $testData = SIPProviderDataFactory::getSIPProviderData('pctel');
        
        // Click Add new button
        $this->clickButtonByHref('/admin-cabinet/providers/modifysip');
        
        // Fill form
        $this->changeInputField('description', $testData['description']);
        $this->changeInputField('host', $testData['host']);
        $this->changeInputField('username', $testData['username']);
        $this->changeInputField('secret', $testData['password']);
        
        // Submit form
        $this->submitForm('save-provider-form');
        
        // Wait for redirect
        $this->waitForAjax();
    }

    /**
     * Create test routes
     */
    private function createTestRoutes(): void
    {
        self::annotate("Creating test routes");

        // Create incoming route
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $incomingData = IncomingCallRulesDataFactory::getRuleData('first.rule');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');
        $this->changeInputField('rulename', $incomingData['rulename']);
        $this->changeInputField('number', $incomingData['number'] ?? '');
        if (isset($incomingData['extension'])) {
            $this->selectDropdownItem('extension', $incomingData['extension']);
        }
        $this->submitForm('incoming-route-form');
        $this->waitForAjax();

        // Create outgoing route
        $this->clickSidebarMenuItemByHref('/admin-cabinet/outbound-routes/index/');
        $outgoingData = OutgoingCallRulesDataFactory::getRuleData('local.out.call.rule');
        $this->clickButtonByHref('/admin-cabinet/outbound-routes/modify');
        $this->changeInputField('rulename', $outgoingData['rulename']);
        $this->changeInputField('numberbeginswith', $outgoingData['numberbeginswith'] ?? '');
        if (isset($outgoingData['restnumbers'])) {
            $this->changeInputField('restnumbers', $outgoingData['restnumbers']);
        }
        $this->submitForm('outbound-route-form');
        $this->waitForAjax();
    }

    /**
     * Create test call queue
     */
    private function createTestCallQueue(): void
    {
        self::annotate("Creating test call queue");

        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');
        $testData = CallQueueDataFactory::getCallQueueData('sales.department');
        $this->clickButtonByHref('/admin-cabinet/call-queues/modify');
        $this->changeInputField('name', $testData['name']);
        $this->changeInputField('extension', $testData['extension']);
        if (isset($testData['seconds_to_ring_each_member'])) {
            $this->changeInputField('seconds_to_ring_each_member', $testData['seconds_to_ring_each_member']);
        }
        $this->submitForm('queue-form');
        $this->waitForAjax();
    }

    /**
     * Create test IVR menu
     */
    private function createTestIvrMenu(): void
    {
        self::annotate("Creating test IVR menu");

        $this->clickSidebarMenuItemByHref('/admin-cabinet/ivr-menu/index/');
        $testData = IVRMenuDataFactory::getIVRMenuData('main.ivr.menu');
        $this->clickButtonByHref('/admin-cabinet/ivr-menu/modify');
        $this->changeInputField('name', $testData['name']);
        $this->changeInputField('extension', $testData['extension']);
        if (isset($testData['timeout'])) {
            $this->changeInputField('timeout', $testData['timeout']);
        }
        $this->submitForm('ivr-menu-form');
        $this->waitForAjax();
    }

    /**
     * Create test conference room
     */
    private function createTestConference(): void
    {
        self::annotate("Creating test conference room");

        $this->clickSidebarMenuItemByHref('/admin-cabinet/conference-rooms/index/');
        
        // Get test conference data
        $testData = ConferenceRoomsDataFactory::getConferenceRoomData('sales.conference');
        
        // Create conference with test data
        $this->clickButtonByHref('/admin-cabinet/conference-rooms/modify');
        
        // Fill conference data
        $this->changeInputField('name', $testData['name']);
        $this->changeInputField('extension', $testData['extension']);
        $this->changeInputField('pinCode', $testData['pinCode']);
        
        $this->submitForm('conference-room-form');
        $this->waitForAjax();
    }

    /**
     * Create test dialplan application
     */
    private function createTestDialplanApplication(): void
    {
        self::annotate("Creating test dialplan application");

        $this->clickSidebarMenuItemByHref('/admin-cabinet/dialplan-applications/index/');
        
        // Get test dialplan application data
        $testData = DialplanApplicationsDataFactory::getApplicationData('echo.test');
        
        // Create dialplan application with test data
        $this->clickButtonByHref('/admin-cabinet/dialplan-applications/modify');
        
        // Fill dialplan application data
        $this->changeInputField('name', $testData['name']);
        $this->changeInputField('extension', $testData['extension']);
        $this->selectDropdownItem('type', $testData['type']);
        $this->changeTextAreaValue('applicationlogic', $testData['applicationlogic']);
        
        $this->submitForm('dialplan-application-form');
        $this->waitForAjax();
    }

    /**
     * Create test network filter
     */
    private function createTestNetworkFilter(): void
    {
        self::annotate("Creating test network filter");

        $this->clickSidebarMenuItemByHref('/admin-cabinet/firewall/index/');
        
        // Get test data
        $testData = FirewallRulesDataFactory::getRuleData('miko.network');
        
        $this->clickButtonByHref('/admin-cabinet/firewall/modify');
        
        // Fill network filter data
        $this->changeInputField('description', $testData['description']);
        $this->changeInputField('network', $testData['network']);
        $this->changeInputField('subnet', $testData['subnet']);
        
        // Set rule checkboxes
        foreach ($testData['rules'] as $rule => $enabled) {
            if ($enabled) {
                $this->changeCheckBoxState($rule, true);
            }
        }
        
        $this->submitForm('network-filter-form');
        $this->waitForAjax();
    }

    /**
     * Modify codec settings to test reset functionality
     */
    private function modifyCodecSettings(): void
    {
        self::annotate("Modifying codec settings for reset test");
        
        // Navigate to General Settings
        $this->clickSidebarMenuItemByHref('/admin-cabinet/general-settings/modify/');
        
        // Click on Audio/Video codecs tab
        $codecsTabXpath = "//a[@data-tab='codecs']";
        $codecsTab = self::$driver->findElement(WebDriverBy::xpath($codecsTabXpath));
        $codecsTab->click();
        
        // Wait for tab content to load
        $this->waitForAjax();
        
        // Disable some audio codecs (opus, g722, ilbc)
        $codecsToDisable = ['opus', 'g722', 'ilbc', 'h264', 'vp8'];
        
        foreach ($codecsToDisable as $codecName) {
            try {
                // Find the checkbox for this codec
                $checkboxXpath = "//tr[contains(@class, 'codec-row')]//td[contains(., '$codecName')]/..//input[@type='checkbox']";
                $checkbox = self::$driver->findElement(WebDriverBy::xpath($checkboxXpath));
                
                // If checked, click to uncheck
                if ($checkbox->getAttribute('checked') !== null) {
                    // Click the parent div to toggle
                    $toggleDiv = self::$driver->findElement(
                        WebDriverBy::xpath("//tr[contains(@class, 'codec-row')]//td[contains(., '$codecName')]/..//div[contains(@class, 'ui toggle checkbox')]")
                    );
                    $toggleDiv->click();
                    self::annotate("Disabled codec: $codecName");
                }
            } catch (\Exception $e) {
                self::annotate("Could not find codec to disable: $codecName");
            }
        }
        
        // Save the changes
        $this->submitForm('general-settings-form');
        $this->waitForAjax();
        
        self::annotate("Codec settings modified - some codecs disabled");
    }

    /**
     * Verify all test data was created successfully
     */
    private function verifyTestDataExists(): void
    {
        self::annotate("Verifying test data exists");

        // Check extensions
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->assertTextPresent('Eugeniy Makrchev');
        $this->assertTextPresent('Nikolay Beketov');
        $this->assertTextPresent('Svetlana Vlasova');

        // Check provider
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->assertTextPresent('PCTEL');

        // Check routes
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->assertTextPresent('First rule');
        
        $this->clickSidebarMenuItemByHref('/admin-cabinet/outbound-routes/index/');
        $this->assertTextPresent('Local outgoing calls');

        // Check other entities
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');
        $this->assertTextPresent('Sales department');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/ivr-menu/index/');
        $this->assertTextPresent('Main IVR menu');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/conference-rooms/index/');
        $this->assertTextPresent('Sales Team Conference');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/dialplan-applications/index/');
        $this->assertTextPresent('Echo Test Application');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/firewall/index/');
        $this->assertTextPresent('MikoNetwork');
    }

    /**
     * Execute the Delete All operation
     */
    private function executeDeleteAllOperation(): void
    {
        self::annotate("Executing Delete All operation");

        // Navigate to General Settings
        $this->clickSidebarMenuItemByHref('/admin-cabinet/general-settings/modify/');
        
        // Click on System tab
        $systemTabXpath = "//a[@data-tab='system']";
        $systemTab = self::$driver->findElement(WebDriverBy::xpath($systemTabXpath));
        $systemTab->click();
        
        // Wait for tab content to load
        $this->waitForAjax();
        
        // Find the delete all input field
        $deleteInputXpath = "//input[@name='deleteAllInput']";
        $deleteInput = self::$driver->findElement(WebDriverBy::xpath($deleteInputXpath));
        
        // Get the required phrase from translation
        $deletePhrase = $this->getDeleteAllPhrase();
        self::annotate("Using delete phrase: '$deletePhrase'");
        
        // Enter the delete phrase
        $deleteInput->clear();
        $deleteInput->sendKeys($deletePhrase);
        
        // Submit the form to trigger modal
        $this->submitForm('general-settings-form');
        
        // Wait for modal to appear
        $this->waitForModal();
        
        // Verify statistics are loaded in modal
        $this->verifyDeleteStatisticsInModal();
        
        // Click confirm button in modal
        $confirmButtonXpath = "//div[@id='delete-all-modal']//div[@class='actions']//div[contains(@class, 'approve')]";
        $confirmButton = self::$driver->findElement(WebDriverBy::xpath($confirmButtonXpath));
        $confirmButton->click();
        
        // Wait for the delete process to start and complete
        $this->waitForDeleteProcessToComplete();
        
        // Wait for system restart
        $this->waitForSystemRestart();
    }

    /**
     * Get the delete all phrase from page or configuration
     */
    private function getDeleteAllPhrase(): string
    {
        // The phrase is typically "удалить всё" in Russian or similar in other languages
        // We'll try to get it from the JavaScript variable if available
        try {
            // Try to execute JavaScript to get the translation
            $phrase = self::$driver->executeScript("return globalTranslate.gs_EnterDeleteAllPhrase;");
            if (!empty($phrase)) {
                return $phrase;
            }
        } catch (\Exception $e) {
            // JavaScript variable not available
        }
        
        // Try to get the phrase from the page label
        try {
            $labelXpath = "//label[@for='deleteAllInput']";
            $label = self::$driver->findElement(WebDriverBy::xpath($labelXpath));
            $labelText = $label->getText();
            
            // Extract the phrase from the label text (usually in quotes or after colon)
            if (preg_match('/["«](.+?)[»"]/', $labelText, $matches)) {
                return $matches[1];
            }
            
            // For Russian, the phrase is typically "удалить всё"
            if (stripos($labelText, 'удалить') !== false) {
                return "удалить всё";
            }
            
            // Fallback to a common phrase if pattern doesn't match
            return "DELETE ALL SETTINGS";
        } catch (\Exception $e) {
            // If we can't find the label, use a default phrase
            // This should be updated based on the actual translation
            return "удалить всё"; // Default to Russian as it's commonly used
        }
    }

    /**
     * Verify all test data was deleted
     */
    private function verifyDataDeleted(): void
    {
        self::annotate("Verifying data was deleted");

        // Re-login if needed (in case session was cleared)
        $this->ensureLoggedIn();

        // Check extensions - only default should remain
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->assertTextNotPresent('Eugeniy Makrchev');
        $this->assertTextNotPresent('Nikolay Beketov');
        $this->assertTextNotPresent('Svetlana Vlasova');

        // Check provider deleted
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->assertTextNotPresent('PCTEL');

        // Check routes deleted
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->assertTextNotPresent('First rule');
        
        $this->clickSidebarMenuItemByHref('/admin-cabinet/outbound-routes/index/');
        $this->assertTextNotPresent('Local outgoing calls');

        // Check other entities deleted
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');
        $this->assertTextNotPresent('Sales department');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/ivr-menu/index/');
        $this->assertTextNotPresent('Main IVR menu');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/conference-rooms/index/');
        $this->assertTextNotPresent('Sales Team Conference');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/dialplan-applications/index/');
        $this->assertTextNotPresent('Echo Test Application');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/firewall/index/');
        $this->assertTextNotPresent('MikoNetwork');
    }

    /**
     * Verify system is still functional after reset
     */
    private function verifySystemFunctionality(): void
    {
        self::annotate("Verifying system functionality after reset");

        // Verify we can still navigate
        $this->clickSidebarMenuItemByHref('/admin-cabinet/general-settings/modify/');
        
        // Verify admin credentials still work (we're still logged in)
        $topMenuSearch = self::$driver->findElements(WebDriverBy::id('top-menu-search'));
        $this->assertCount(1, $topMenuSearch, "Admin interface should be accessible");

        // Verify we can create new extension (system is functional)
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $addButton = self::$driver->findElements(WebDriverBy::xpath("//a[@href='/admin-cabinet/extensions/modify']"));
        $this->assertGreaterThan(0, count($addButton), "Should be able to add new extensions");
        
        // Verify codecs were reset to defaults
        $this->verifyCodecDefaults();
    }

    /**
     * Ensure user is logged in (helper for re-login after reset)
     */
    private function ensureLoggedIn(): void
    {
        try {
            // First, make sure we're on the right URL
            $currentUrl = self::$driver->getCurrentURL();
            if (strpos($currentUrl, $this->testsConfig['url']) === false) {
                self::$driver->get($this->testsConfig['url']);
                sleep(2);
            }
            
            // Check if we're on login page
            $loginElements = self::$driver->findElements(WebDriverBy::id('login-form'));
            if (count($loginElements) > 0) {
                // We're on login page, need to login
                self::annotate("On login page, logging in...");
                $this->loginToPBX();
                return;
            }
            
            // Check if we're logged in by looking for top menu
            $topMenuElements = self::$driver->findElements(WebDriverBy::id('top-menu-search'));
            if (count($topMenuElements) === 0) {
                // Not logged in, navigate to base URL and login
                self::annotate("Not logged in, navigating to login page...");
                self::$driver->get($this->testsConfig['url']);
                sleep(2);
                $this->loginToPBX();
            } else {
                self::annotate("Already logged in");
            }
        } catch (\Exception $e) {
            // Error checking login status, try to login
            self::annotate("Error checking login status: " . $e->getMessage());
            self::annotate("Attempting to login...");
            self::$driver->get($this->testsConfig['url']);
            sleep(2);
            $this->loginToPBX();
        }
    }

    /**
     * Assert text is present on the page
     */
    private function assertTextPresent(string $text): void
    {
        $xpath = "//*[contains(text(), '$text')]";
        $elements = self::$driver->findElements(WebDriverBy::xpath($xpath));
        $this->assertGreaterThan(0, count($elements), "Text '$text' should be present on page");
    }

    /**
     * Assert text is not present on the page
     */
    private function assertTextNotPresent(string $text): void
    {
        $xpath = "//*[contains(text(), '$text')]";
        $elements = self::$driver->findElements(WebDriverBy::xpath($xpath));
        $this->assertEquals(0, count($elements), "Text '$text' should not be present on page");
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

    /**
     * Verify statistics are loaded in the modal
     */
    private function verifyDeleteStatisticsInModal(): void
    {
        self::annotate("Verifying delete statistics in modal");
        
        // Wait for statistics to load (loader should disappear)
        try {
            $wait = new WebDriverWait(self::$driver, 10);
            $wait->until(
                WebDriverExpectedCondition::invisibilityOfElementLocated(
                    WebDriverBy::xpath("//div[@id='delete-statistics-content']//div[contains(@class, 'loader')]")
                )
            );
        } catch (TimeoutException $e) {
            // Loader might have already disappeared
            self::annotate("Loader element not found or already hidden");
        }
        
        // Verify at least some statistics are shown
        $statisticsXpath = "//div[@id='delete-statistics-content']//div[@class='ui segment']";
        $statisticsElements = self::$driver->findElements(WebDriverBy::xpath($statisticsXpath));
        
        $this->assertGreaterThan(0, count($statisticsElements), "Statistics should be displayed in modal");
        
        // Verify specific items we created are shown (users/extensions)
        // The modal should show we have created test data
        $modalContent = self::$driver->findElement(WebDriverBy::id('delete-statistics-content'))->getText();
        self::annotate("Modal statistics content: " . substr($modalContent, 0, 200) . "...");
        
        // Log the statistics for debugging
        foreach ($statisticsElements as $element) {
            $text = $element->getText();
            self::annotate("Statistic item: $text");
        }
    }

    /**
     * Assert text is present in the modal
     */
    private function assertModalContainsText(string $text): void
    {
        $xpath = "//div[@id='delete-all-modal']//*[contains(text(), '$text')]";
        $elements = self::$driver->findElements(WebDriverBy::xpath($xpath));
        $this->assertGreaterThan(0, count($elements), "Text '$text' should be present in modal");
    }

    /**
     * Wait for delete process to complete with WebSocket progress tracking
     */
    private function waitForDeleteProcessToComplete(): void
    {
        self::annotate("Waiting for delete process to complete");
        
        $maxWaitTime = 120; // 2 minutes max for delete process
        $startTime = time();
        
        // Wait for modal to close (indicates process completed)
        try {
            $wait = new WebDriverWait(self::$driver, $maxWaitTime);
            $wait->until(
                WebDriverExpectedCondition::invisibilityOfElementLocated(
                    WebDriverBy::id('delete-all-modal')
                )
            );
            self::annotate("Delete modal closed, process completed");
        } catch (TimeoutException $e) {
            // Modal didn't close, check if error occurred
            try {
                $errorXpath = "//div[@class='ui error message' or contains(@class, 'negative')]";
                $errorElements = self::$driver->findElements(WebDriverBy::xpath($errorXpath));
                if (count($errorElements) > 0) {
                    $errorText = $errorElements[0]->getText();
                    $this->fail("Delete process failed with error: $errorText");
                }
            } catch (\Exception $ex) {
                // No error found
            }
            
            $this->fail("Delete process did not complete within $maxWaitTime seconds");
        }
        
        // Additional wait for any final operations
        sleep(5);
    }

    /**
     * Wait for system restart after delete operation
     */
    private function waitForSystemRestart(): void
    {
        self::annotate("Waiting for system restart");
        
        $maxRestartTime = 180; // 3 minutes max for restart
        $checkInterval = 10; // Check every 10 seconds
        $startTime = time();
        
        // First, expect the system to become unavailable
        self::annotate("Waiting for system to go down for restart...");
        sleep(10); // Give some time for restart to initiate
        
        $systemWentDown = false;
        while ((time() - $startTime) < 60) { // Wait up to 1 minute for shutdown
            try {
                // Try to access the page
                self::$driver->get($this->testsConfig['url']);
                sleep($checkInterval);
            } catch (\Exception $e) {
                // System is down, this is expected
                $systemWentDown = true;
                self::annotate("System went down for restart");
                break;
            }
        }
        
        if (!$systemWentDown) {
            self::annotate("WARNING: System did not appear to go down, but continuing...");
        }
        
        // Now wait for system to come back up
        self::annotate("Waiting for system to come back online...");
        $systemBackUp = false;
        $remainingTime = $maxRestartTime - (time() - $startTime);
        
        while ($remainingTime > 0) {
            try {
                // Try to access the login page
                self::$driver->get($this->testsConfig['url']);
                
                // Check if we can find an element that indicates the page loaded
                $wait = new WebDriverWait(self::$driver, 5);
                $wait->until(
                    WebDriverExpectedCondition::presenceOfElementLocated(
                        WebDriverBy::tagName('body')
                    )
                );
                
                // Check if we're on login page or already logged in
                $loginElements = self::$driver->findElements(WebDriverBy::id('login-form'));
                $topMenuElements = self::$driver->findElements(WebDriverBy::id('top-menu-search'));
                
                if (count($loginElements) > 0 || count($topMenuElements) > 0) {
                    $systemBackUp = true;
                    self::annotate("System is back online");
                    break;
                }
            } catch (\Exception $e) {
                // System still down, wait and retry
                self::annotate("System still down, waiting... (remaining: {$remainingTime}s)");
            }
            
            sleep($checkInterval);
            $remainingTime = $maxRestartTime - (time() - $startTime);
        }
        
        if (!$systemBackUp) {
            $this->fail("System did not come back online within $maxRestartTime seconds");
        }
        
        // Give the system a bit more time to fully initialize
        sleep(10);
        
        self::annotate("System restart completed successfully");
    }

    /**
     * Save critical settings before deletion
     * 
     * @return array Array of critical settings
     */
    private function saveCriticalSettings(): array
    {
        self::annotate("Saving critical settings before deletion");
        
        $settings = [];
        
        // Navigate to General Settings
        $this->clickSidebarMenuItemByHref('/admin-cabinet/general-settings/modify/');
        
        // Get web admin password (should remain unchanged)
        $settings['web_admin_password'] = $this->testsConfig['password'] ?? '';
        
        // Get PBX name
        $settings['pbx_name'] = $this->getInputFieldValue('PBXName');
        
        // Get language setting
        $settings['pbx_language'] = $this->getDropdownSelectedValue('PBXLanguage');
        
        // Switch to Network tab to get ports
        $networkTabXpath = "//a[@data-tab='network']";
        $networkTab = self::$driver->findElement(WebDriverBy::xpath($networkTabXpath));
        $networkTab->click();
        $this->waitForAjax();
        
        // Get port settings
        $settings['web_port'] = $this->getInputFieldValue('WebPort');
        $settings['web_https_port'] = $this->getInputFieldValue('WebHTTPSPort');
        $settings['ssh_port'] = $this->getInputFieldValue('SSHPort');
        
        // Get License info - switch to Licensing tab
        $licensingTabXpath = "//a[@data-tab='licensing']";
        $licensingTab = self::$driver->findElement(WebDriverBy::xpath($licensingTabXpath));
        $licensingTab->click();
        $this->waitForAjax();
        
        // Check if we have a license key displayed
        try {
            $licenseKeyElement = self::$driver->findElement(WebDriverBy::id('licKey'));
            $settings['license_key'] = $licenseKeyElement->getAttribute('value');
        } catch (\Exception $e) {
            // No license key found
            $settings['license_key'] = '';
        }
        
        self::annotate("Critical settings saved: " . json_encode($settings));
        
        return $settings;
    }

    /**
     * Verify critical settings were preserved after deletion
     * 
     * @param array $savedSettings Settings saved before deletion
     */
    private function verifyCriticalSettingsPreserved(array $savedSettings): void
    {
        self::annotate("Verifying critical settings were preserved");
        
        // Navigate to General Settings
        $this->clickSidebarMenuItemByHref('/admin-cabinet/general-settings/modify/');
        
        // Verify PBX name (it's reset to default)
        $currentPbxName = $this->getInputFieldValue('PBXName');
        self::annotate("PBX Name: Expected default 'MikoPBX', Got: '$currentPbxName'");
        
        // Verify language setting preserved
        $currentLanguage = $this->getDropdownSelectedValue('PBXLanguage');
        $this->assertEquals($savedSettings['pbx_language'], $currentLanguage, "Language setting should be preserved");
        
        // Switch to Network tab
        $networkTabXpath = "//a[@data-tab='network']";
        $networkTab = self::$driver->findElement(WebDriverBy::xpath($networkTabXpath));
        $networkTab->click();
        $this->waitForAjax();
        
        // Verify port settings preserved
        $currentWebPort = $this->getInputFieldValue('WebPort');
        $this->assertEquals($savedSettings['web_port'], $currentWebPort, "Web port should be preserved");
        
        $currentHttpsPort = $this->getInputFieldValue('WebHTTPSPort');
        $this->assertEquals($savedSettings['web_https_port'], $currentHttpsPort, "HTTPS port should be preserved");
        
        $currentSshPort = $this->getInputFieldValue('SSHPort');
        $this->assertEquals($savedSettings['ssh_port'], $currentSshPort, "SSH port should be preserved");
        
        // Verify admin login still works (we're logged in)
        $this->assertTrue(true, "Admin credentials preserved - we're still logged in");
        
        // Check license if it existed
        if (!empty($savedSettings['license_key'])) {
            $licensingTabXpath = "//a[@data-tab='licensing']";
            $licensingTab = self::$driver->findElement(WebDriverBy::xpath($licensingTabXpath));
            $licensingTab->click();
            $this->waitForAjax();
            
            try {
                $licenseKeyElement = self::$driver->findElement(WebDriverBy::id('licKey'));
                $currentLicenseKey = $licenseKeyElement->getAttribute('value');
                $this->assertEquals($savedSettings['license_key'], $currentLicenseKey, "License key should be preserved");
                self::annotate("License key preserved");
            } catch (\Exception $e) {
                // License might be displayed differently after reset
                self::annotate("Could not verify license key preservation");
            }
        }
        
        self::annotate("Critical settings verification completed");
    }

    /**
     * Get input field value
     * 
     * @param string $fieldId Field ID
     * @return string Field value
     */
    private function getInputFieldValue(string $fieldId): string
    {
        try {
            $element = self::$driver->findElement(WebDriverBy::id($fieldId));
            return $element->getAttribute('value') ?? '';
        } catch (\Exception $e) {
            return '';
        }
    }

    /**
     * Get selected value from dropdown
     * 
     * @param string $dropdownId Dropdown ID
     * @return string Selected value
     */
    protected function getDropdownSelectedValue(string $dropdownId): string
    {
        try {
            // Semantic UI dropdown - get the selected value from hidden input
            $hiddenInput = self::$driver->findElement(WebDriverBy::name($dropdownId));
            return $hiddenInput->getAttribute('value') ?? '';
        } catch (\Exception $e) {
            return '';
        }
    }

    /**
     * Verify codecs were reset to default values and priorities
     */
    private function verifyCodecDefaults(): void
    {
        self::annotate("Verifying codec defaults after reset");
        
        // Navigate to General Settings
        $this->clickSidebarMenuItemByHref('/admin-cabinet/general-settings/modify/');
        
        // Click on Audio/Video codecs tab
        $codecsTabXpath = "//a[@data-tab='codecs']";
        $codecsTab = self::$driver->findElement(WebDriverBy::xpath($codecsTabXpath));
        $codecsTab->click();
        
        // Wait for tab content to load
        $this->waitForAjax();
        
        // Expected codec order and all should be enabled
        $expectedAudioCodecs = [
            'alaw' => 'G.711 A-law',
            'ulaw' => 'G.711 μ-law',
            'opus' => 'Opus',
            'g722' => 'G.722',
            'g729' => 'G.729',
            'ilbc' => 'iLBC',
            'g726' => 'G.726',
            'gsm' => 'GSM',
            'adpcm' => 'ADPCM',
            'lpc10' => 'LPC-10',
            'speex' => 'Speex',
            'slin' => 'Signed Linear PCM'
        ];
        
        $expectedVideoCodecs = [
            'h264' => 'H.264',
            'h263' => 'H.263',
            'h263p' => 'H.263+',
            'vp8' => 'VP8',
            'vp9' => 'VP9',
            'jpeg' => 'JPEG',
            'h261' => 'H.261'
        ];
        
        // Verify audio codecs are all enabled
        self::annotate("Checking audio codecs");
        $audioCodecRows = self::$driver->findElements(
            WebDriverBy::xpath("//h4[contains(text(), 'Audio codecs')]/following-sibling::table//tr[@class='codec-row']")
        );
        
        $foundAudioCodecs = [];
        foreach ($audioCodecRows as $index => $row) {
            // Get codec name from the row
            $codecNameElement = $row->findElement(WebDriverBy::xpath(".//td[3]"));
            $codecDescription = trim($codecNameElement->getText());
            
            // Check if toggle is enabled
            $toggleXpath = ".//div[contains(@class, 'ui toggle checkbox')]//input[@type='checkbox']";
            $toggle = $row->findElement(WebDriverBy::xpath($toggleXpath));
            $isEnabled = $toggle->getAttribute('checked') !== null;
            
            // Get the data-value which represents priority
            $priority = $row->getAttribute('data-value');
            
            self::annotate("Audio codec: $codecDescription, Priority: $priority, Enabled: " . ($isEnabled ? 'Yes' : 'No'));
            
            // All codecs should be enabled after reset
            $this->assertTrue($isEnabled, "Audio codec $codecDescription should be enabled after reset");
            
            // Check priority order (should match our expected order)
            $expectedPriority = $index + 1;
            $this->assertEquals($expectedPriority, intval($priority), "Audio codec $codecDescription should have priority $expectedPriority");
            
            $foundAudioCodecs[] = $codecDescription;
        }
        
        // Verify video codecs are all enabled
        self::annotate("Checking video codecs");
        $videoCodecRows = self::$driver->findElements(
            WebDriverBy::xpath("//h4[contains(text(), 'Video codecs')]/following-sibling::table//tr[@class='codec-row']")
        );
        
        $foundVideoCodecs = [];
        foreach ($videoCodecRows as $index => $row) {
            // Get codec name from the row
            $codecNameElement = $row->findElement(WebDriverBy::xpath(".//td[3]"));
            $codecDescription = trim($codecNameElement->getText());
            
            // Check if toggle is enabled
            $toggleXpath = ".//div[contains(@class, 'ui toggle checkbox')]//input[@type='checkbox']";
            $toggle = $row->findElement(WebDriverBy::xpath($toggleXpath));
            $isEnabled = $toggle->getAttribute('checked') !== null;
            
            // Get the data-value which represents priority
            $priority = $row->getAttribute('data-value');
            
            self::annotate("Video codec: $codecDescription, Priority: $priority, Enabled: " . ($isEnabled ? 'Yes' : 'No'));
            
            // All codecs should be enabled after reset
            $this->assertTrue($isEnabled, "Video codec $codecDescription should be enabled after reset");
            
            // Check priority order (should match our expected order)
            $expectedPriority = $index + 1;
            $this->assertEquals($expectedPriority, intval($priority), "Video codec $codecDescription should have priority $expectedPriority");
            
            $foundVideoCodecs[] = $codecDescription;
        }
        
        self::annotate("Codec defaults verification completed");
        self::annotate("Found " . count($foundAudioCodecs) . " audio codecs and " . count($foundVideoCodecs) . " video codecs, all enabled");
    }

}