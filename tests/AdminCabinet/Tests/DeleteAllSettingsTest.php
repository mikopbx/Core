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
        $this->setUpBeforeClass();
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

        // Step 1: Create test data
        $this->createTestData();

        // Step 2: Verify test data exists
        $this->verifyTestDataExists();

        // Step 3: Execute Delete All operation
        $this->executeDeleteAllOperation();

        // Step 4: Verify data was deleted
        $this->verifyDataDeleted();

        // Step 5: Verify system still functional
        $this->verifySystemFunctionality();
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
        // Note: The phrase varies by language. In English it's typically "DELETE ALL SETTINGS"
        // The test will try to extract it from the page label
        $deletePhrase = $this->getDeleteAllPhrase();
        
        // Enter the delete phrase
        $deleteInput->clear();
        $deleteInput->sendKeys($deletePhrase);
        
        // Submit the form to trigger deletion
        $this->submitForm('general-settings-form');
        
        // Wait for operation to complete (this may take some time)
        sleep(10); // System needs time to reset
        
        // Wait for success message
        $this->waitForAjax();
    }

    /**
     * Get the delete all phrase from page or configuration
     */
    private function getDeleteAllPhrase(): string
    {
        // Try to get the phrase from the page label
        try {
            $labelXpath = "//label[@for='deleteAllInput']";
            $label = self::$driver->findElement(WebDriverBy::xpath($labelXpath));
            $labelText = $label->getText();
            
            // Extract the phrase from the label text (usually in quotes or after colon)
            if (preg_match('/["«](.+?)[»"]/', $labelText, $matches)) {
                return $matches[1];
            }
            
            // Fallback to a common phrase if pattern doesn't match
            return "DELETE ALL SETTINGS";
        } catch (\Exception $e) {
            // If we can't find the label, use a default phrase
            // This should be updated based on the actual translation
            return "DELETE ALL SETTINGS";
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
    }

    /**
     * Ensure user is logged in (helper for re-login after reset)
     */
    private function ensureLoggedIn(): void
    {
        try {
            // Check if we're still logged in
            self::$driver->findElement(WebDriverBy::id('top-menu-search'));
        } catch (\Exception $e) {
            // Need to login again
            self::annotate("Re-logging in after system reset");
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

}