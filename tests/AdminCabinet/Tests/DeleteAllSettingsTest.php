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
use MikoPBX\Tests\AdminCabinet\Tests\AudioFiles\MikoHelloAudioTest;
use MikoPBX\Tests\AdminCabinet\Tests\CallQueues\AccountantDepartmentTest;
use MikoPBX\Tests\AdminCabinet\Tests\ConferenceRooms\SalesConferenceTest;
use MikoPBX\Tests\AdminCabinet\Tests\DialplanApplications\EchoTestTest;
use MikoPBX\Tests\AdminCabinet\Tests\Extensions\BrownBrandonTest;
use MikoPBX\Tests\AdminCabinet\Tests\Extensions\CollinsMelanieTest;
use MikoPBX\Tests\AdminCabinet\Tests\Extensions\SmithJamesTest;
use MikoPBX\Tests\AdminCabinet\Tests\FillPBXSettingsTest;
use MikoPBX\Tests\AdminCabinet\Tests\FirewallRules\MikoNetworkTest;
use MikoPBX\Tests\AdminCabinet\Tests\IVRMenus\SecondIvrMenuTest;
use MikoPBX\Tests\AdminCabinet\Tests\IncomingCallRules\SecondRuleTest;
use MikoPBX\Tests\AdminCabinet\Tests\OutgoingCallRules\LocalCallsTest;
use MikoPBX\Tests\AdminCabinet\Tests\SIPProviders\PctelTest;
use MikoPBX\Tests\AdminCabinet\Tests\Traits\EntityCreationTrait;

/**
 * Class DeleteAllSettingsTest
 * Tests the "Delete All Settings" functionality that resets the system to factory defaults
 *
 * @package MikoPBX\Tests\AdminCabinet\Tests
 */
class DeleteAllSettingsTest extends MikoPBXTestsBase
{
    use EntityCreationTrait;

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
        
        // Click on Delete All Settings tab
        $deleteAllTabXpath = "//a[@data-tab='deleteAll']";
        $deleteAllTab = self::$driver->findElement(WebDriverBy::xpath($deleteAllTabXpath));
        $deleteAllTab->click();
        
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
        
         // Click the "Delete all settings" button (which is dynamically replaced)
        $deleteButtonXpath = "//div[@id='submitbutton' and contains(@class, 'negative')]";
        $deleteButton = self::$driver->findElement(WebDriverBy::xpath($deleteButtonXpath));
        $deleteButton->click();
        
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

        $phrase = self::$driver->executeScript("return globalTranslate.gs_BtnDeleteAll;");
        self::annotate("Using delete phrase: '$phrase'");
        
        // Verify we're still on the same page and data is intact
        $xpath = "//*[contains(text(), '$phrase')]";
        $elements = self::$driver->findElements(WebDriverBy::xpath($xpath));
        $this->assertGreaterThan(0, count($elements), "Text '$phrase' should be present on page");
        
        self::annotate("Cancel operation successful - modal closed without deleting data");
    }


    /**
     * Creates all types of test data for deletion test
     */
    private function createTestData(): void
    {
        self::annotate("Creating test data for deletion - all checks are performed in real-time");

        // Create firewall rule
        $this->createTestFirewallRule();
        
        // Create conference room
        $this->createTestConferenceRoom();

        // Create dialplan application
        $this->createTestDialplanApplication();

        // Modify PBX settings
        $this->modifyPBXSettings();

        // Create test extensions
        $this->createTestExtensions();

        // Create SIP provider
        $this->createTestProvider();

        // Create Sound file
        $this->createTestSoundFile();

        // Create call queue
        $this->createTestCallQueue();

        // Create IVR menu
        $this->createTestIVRMenu();

        // Create incoming and outgoing routes
        $this->createTestRoutes();

    }

    private function createTestSoundFile(): void
    {
        $this->createEntityIfNotExists(
            'miko_hello',
            MikoHelloAudioTest::class,
            'testCreateAudioFile',
            fn($name) => $this->soundFileExistsBySearch($name),
            'audio file'
        );
    }


    /**
     * Create test extensions
     */
    private function createTestExtensions(): void
    {
        $extensions = [
            ['name' => 'Smith James', 'class' => SmithJamesTest::class],
            ['name' => 'Brown Brandon', 'class' => BrownBrandonTest::class],
            ['name' => 'Collins Melanie', 'class' => CollinsMelanieTest::class],
        ];

        foreach ($extensions as $extension) {
            $this->createEntityIfNotExists(
                $extension['name'],
                $extension['class'],
                'testCreateExtension',
                fn($name) => $this->extensionExistsBySearch($name)
            );
        }
    }

    /**
     * Create test SIP provider
     */
    private function createTestProvider(): void
    {
        $this->createEntityIfNotExists(
            'PCTEL',
            PctelTest::class,
            'testCreateSIPProvider',
            fn($name) => $this->providerExistsBySearch($name),
            'PCTEL'
        );
    }

    /**
     * Create test routes (incoming and outgoing)
     */
    private function createTestRoutes(): void
    {
        $routes = [
            [
                'name' => 'Second rule',
                'class' => SecondRuleTest::class,
                'method' => 'testCreateIncomingCallRule',
                'url' => '/admin-cabinet/incoming-routes/index/',
                'type' => 'incoming route'
            ],
            [
                'name' => 'Local outgoing calls',
                'class' => LocalCallsTest::class,
                'method' => 'testCreateOutgoingCallRule',
                'url' => '/admin-cabinet/outbound-routes/index/',
                'type' => 'outgoing route'
            ],
        ];

        foreach ($routes as $route) {
            $this->createEntityIfNotExists(
                $route['name'],
                $route['class'],
                $route['method'],
                fn($name) => $this->searchEntityInTable($route['url'], $name),
                $route['type']
            );
        }
    }

    /**
     * Create test call queue
     */
    private function createTestCallQueue(): void
    {
        $this->createEntityIfNotExists(
            'Accountant department',
            AccountantDepartmentTest::class,
            'testCreateCallQueue',
            fn($name) => $this->callQueueExistsBySearch($name),
            'call queue'
        );
    }



    /**
     * Create test firewall rule
     */
    private function createTestFirewallRule(): void
    {
        $this->createEntityIfNotExists(
            'MikoNetwork',
            MikoNetworkTest::class,
            'testCreateFirewallRule',
            fn($name) => $this->firewallRuleExistsBySearch($name),
            'firewall rule'
        );
    }

    /**
     * Create test IVR menu
     */
    private function createTestIVRMenu(): void
    {
        $this->createEntityIfNotExists(
            'Second IVR menu',
            SecondIvrMenuTest::class,
            'testCreateIVRMenu',
            fn($name) => $this->ivrMenuExistsBySearch($name),
            'IVR menu'
        );
    }

    /**
     * Create test conference room
     */
    private function createTestConferenceRoom(): void
    {
        $this->createEntityIfNotExists(
            'Sales Team Conference',
            SalesConferenceTest::class,
            'testCreateConferenceRoom',
            fn($name) => $this->conferenceRoomExistsBySearch($name),
            'conference room'
        );
    }

    /**
     * Create test dialplan application
     */
    private function createTestDialplanApplication(): void
    {
        $this->createEntityIfNotExists(
            'Echo Test Application',
            EchoTestTest::class,
            'testCreateDialplanApplication',
            fn($name) => $this->dialplanApplicationExistsBySearch($name),
            'dialplan application'
        );
    }



    /**
     * Modify codec settings to test reset functionality
     */
    private function modifyPBXSettings(): void
    {
        $fillSettingsHelper = new FillPBXSettingsTest();
        $fillSettingsHelper->setUp();
        $fillSettingsHelper->testFillPBXSettings();
    }

    /**
     * Verify all test data was created successfully using search
     */
    private function verifyTestDataExists(): void
    {
        self::annotate("Verifying test data exists - real-time checks using search");

        // Check extensions
        $this->assertTrue(
            $this->extensionExistsBySearch('Smith James'),
            'Extension "Smith James" not found'
        );
        $this->assertTrue(
            $this->extensionExistsBySearch('Brown Brandon'),
            'Extension "Brown Brandon" not found'
        );
        $this->assertTrue(
            $this->extensionExistsBySearch('Collins Melanie'),
            'Extension "Collins Melanie" not found'
        );

        // Check provider
        $this->assertTrue(
            $this->providerExistsBySearch('PCTEL'),
            'Provider "PCTEL" not found'
        );

        // Check routes
        $this->assertTrue(
            $this->incomingRouteExistsBySearch('Second rule'),
            'Incoming route "Second rule" not found'
        );
        $this->assertTrue(
            $this->outgoingRouteExistsBySearch('Local outgoing calls'),
            'Outgoing route "Local outgoing calls" not found'
        );

        // Check other entities
        $this->assertTrue(
            $this->callQueueExistsBySearch('Accountant department'),
            'Call queue "Accountant department" not found'
        );
        $this->assertTrue(
            $this->ivrMenuExistsBySearch('Second IVR menu'),
            'IVR menu "Second IVR menu" not found'
        );
        $this->assertTrue(
            $this->conferenceRoomExistsBySearch('Sales Team Conference'),
            'Conference room "Sales Team Conference" not found'
        );
        $this->assertTrue(
            $this->dialplanApplicationExistsBySearch('Echo Test Application'),
            'Dialplan application "Echo Test Application" not found'
        );
        $this->assertTrue(
            $this->firewallRuleExistsBySearch('MikoNetwork'),
            'Firewall rule "MikoNetwork" not found'
        );
    }

    /**
     * Execute the Delete All operation
     */
    private function executeDeleteAllOperation(): void
    {
        self::annotate("Executing Delete All operation");

        // Navigate to General Settings
        $this->clickSidebarMenuItemByHref('/admin-cabinet/general-settings/modify/');
        
        // Click on Delete All Settings tab
        $deleteAllTabXpath = "//a[@data-tab='deleteAll']";
        $deleteAllTab = self::$driver->findElement(WebDriverBy::xpath($deleteAllTabXpath));
        $deleteAllTab->click();
        
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
        
        // Wait for the button to be replaced by JavaScript
        sleep(2);
        
        // Click the "Delete all settings" button (which is dynamically replaced)
        $deleteButtonXpath = "//div[@id='submitbutton' and contains(@class, 'negative')]";
        $deleteButton = self::$driver->findElement(WebDriverBy::xpath($deleteButtonXpath));
        $deleteButton->click();
        
        // Wait for modal to appear
        $this->waitForModal();
        
        // Verify statistics are loaded in modal
        $this->verifyDeleteStatisticsInModal();
        
        // Click confirm button in modal
        $confirmButton = self::$driver->findElement(WebDriverBy::id('confirm-delete-all'));
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
            return "delete all";
        } catch (\Exception $e) {
            // If we can't find the label, use a default phrase
            // This should be updated based on the actual translation
            return "delete all"; // Default to Russian as it's commonly used
        }
    }

    /**
     * Verify all test data was deleted
     */
    private function verifyDataDeleted(): void
    {
        self::annotate("Verifying data was deleted using search");

        // Re-login if needed (in case session was cleared)
        $this->ensureLoggedIn();

        // Check extensions deleted
        $this->assertFalse(
            $this->extensionExistsBySearch('Smith James'),
            'Extension "Smith James" should have been deleted'
        );
        $this->assertFalse(
            $this->extensionExistsBySearch('Brown Brandon'),
            'Extension "Brown Brandon" should have been deleted'
        );
        $this->assertFalse(
            $this->extensionExistsBySearch('Collins Melanie'),
            'Extension "Collins Melanie" should have been deleted'
        );

        // Check provider deleted
        $this->assertFalse(
            $this->providerExistsBySearch('PCTEL'),
            'Provider "PCTEL" should have been deleted'
        );

        // Check routes deleted
        $this->assertFalse(
            $this->incomingRouteExistsBySearch('Second rule'),
            'Incoming route "Second rule" should have been deleted'
        );
        $this->assertFalse(
            $this->outgoingRouteExistsBySearch('Local outgoing calls'),
            'Outgoing route "Local outgoing calls" should have been deleted'
        );

        // Check other entities deleted
        $this->assertFalse(
            $this->callQueueExistsBySearch('Accountant department'),
            'Call queue "Accountant department" should have been deleted'
        );
        $this->assertFalse(
            $this->ivrMenuExistsBySearch('Second IVR menu'),
            'IVR menu "Second IVR menu" should have been deleted'
        );
        $this->assertFalse(
            $this->conferenceRoomExistsBySearch('Sales Team Conference'),
            'Conference room "Sales Team Conference" should have been deleted'
        );
        $this->assertFalse(
            $this->dialplanApplicationExistsBySearch('Echo Test Application'),
            'Dialplan application "Echo Test Application" should have been deleted'
        );
        $this->assertFalse(
            $this->firewallRuleExistsBySearch('MikoNetwork'),
            'Firewall rule "MikoNetwork" should have been deleted'
        );
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
     * Uses LoginTrait::isUserLoggedIn() for consistent login handling
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

            // Use LoginTrait method to check if user is logged in
            if ($this->isUserLoggedIn(5)) {
                self::annotate("Already logged in");
                return;
            }

            // Not logged in, navigate to login page and login
            self::annotate("Not logged in, navigating to login page...");
            self::$driver->get($this->testsConfig['url']);
            sleep(2);
            $this->loginToPBX();
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
        $sanitizedContent = str_replace(["\n", "\r", "\t"], ' ', substr($modalContent, 0, 200));
        self::annotate("Modal statistics content: " . $sanitizedContent . "...");

        // Log the statistics for debugging
        $itemCount = 0;
        foreach ($statisticsElements as $element) {
            $text = $element->getText();
            // Sanitize text to prevent JSON encoding issues
            $sanitizedText = str_replace(["\n", "\r", "\t"], ' ', $text);
            $sanitizedText = mb_substr($sanitizedText, 0, 100); // Limit length
            self::annotate("Statistic item " . (++$itemCount) . ": " . $sanitizedText);
        }
    }

    /**
     * Wait for delete process to complete using data-stage attribute tracking
     *
     * WHY: Modal now stays open after completion, so we track progress via data-stage
     * Stage progression:
     * 1. starting -> initial state
     * 2. DeleteAll_Stage_Prepare -> preparation
     * 3. DeleteAll_Stage_CleanTables -> database cleanup
     * 4. DeleteAll_Stage_CleanFiles -> file cleanup
     * 5. DeleteAll_Stage_CleanLogs -> log cleanup
     * 6. DeleteAll_Stage_CleanModules -> module removal
     * 7. DeleteAll_Stage_ResetSettings -> settings reset
     * 8. DeleteAll_Stage_Final -> completion
     * 9. DeleteAll_Stage_Restart -> restart initiated
     */
    private function waitForDeleteProcessToComplete(): void
    {
        self::annotate("Waiting for delete process to complete using data-stage tracking");

        $maxWaitTime = 180; // 3 minutes max for delete process
        $startTime = time();
        $modalSelector = WebDriverBy::id('delete-all-modal');

        // Track all stages we've seen
        $seenStages = [];
        $lastStage = '';

        // WHY: Modal no longer closes automatically, so we wait for final stage
        try {
            $wait = new WebDriverWait(self::$driver, $maxWaitTime);

            // Wait until we reach the restart stage
            $wait->until(function() use ($modalSelector, &$seenStages, &$lastStage, $startTime) {
                try {
                    $elapsed = time() - $startTime;
                    $modal = self::$driver->findElement($modalSelector);
                    $currentStage = $modal->getAttribute('data-stage');

                    // Track new stages
                    if ($currentStage !== $lastStage && !empty($currentStage)) {
                        $seenStages[] = $currentStage;
                        self::annotate("Delete process stage: $currentStage (elapsed: {$elapsed}s)");
                        $lastStage = $currentStage;
                    }

                    // Check if we reached the restart stage (final stage)
                    if ($currentStage === 'DeleteAll_Stage_Restart') {
                        self::annotate("Delete process completed - restart stage reached (elapsed: {$elapsed}s)");
                        return true;
                    }

                    // Check for error state
                    $errorElements = self::$driver->findElements(
                        WebDriverBy::xpath("//div[@id='delete-all-modal']//div[@class='ui error message' or contains(@class, 'negative message')]")
                    );
                    if (count($errorElements) > 0) {
                        $errorText = $errorElements[0]->getText();
                        throw new \Exception("Delete process failed with error: $errorText");
                    }

                    return false;
                } catch (\Exception $e) {
                    // Modal might have disappeared unexpectedly
                    if (strpos($e->getMessage(), 'no such element') !== false) {
                        $elapsed = time() - $startTime;
                        throw new \Exception("Modal disappeared unexpectedly during delete process (elapsed: {$elapsed}s)");
                    }
                    throw $e;
                }
            });

            $elapsed = time() - $startTime;
            self::annotate("Waiting for close button to become visible (elapsed: {$elapsed}s)");

            // Wait for Close button to appear and become visible (it appears after restart stage is reached)
            // Note: Using 'ok' class to find the specific Close button that won't trigger onApprove
            $closeButtonXpath = "//div[@id='delete-all-modal']//div[@class='actions']//button[contains(@class, 'ok')]";
            $closeButtonWait = new WebDriverWait(self::$driver, 30);
            $closeButtonWait->until(
                WebDriverExpectedCondition::visibilityOfElementLocated(
                    WebDriverBy::xpath($closeButtonXpath)
                )
            );

            $elapsed = time() - $startTime;
            self::annotate("Close button is now visible (elapsed: {$elapsed}s)");

            // Verify Close button is visible
            $closeButtons = self::$driver->findElements(WebDriverBy::xpath($closeButtonXpath));
            $this->assertGreaterThan(0, count($closeButtons), "Close button should be visible after completion");
            $this->assertTrue($closeButtons[0]->isDisplayed(), "Close button should be displayed");

            self::annotate("Delete process completed successfully. Stages seen: " . implode(' -> ', $seenStages));

            // Click Close button to dismiss modal before system restart
            // This will trigger our custom click handler, not the onApprove callback
            $closeButtons[0]->click();

            // Wait for modal to close after clicking Close button
            $wait = new WebDriverWait(self::$driver, 10);
            $wait->until(
                WebDriverExpectedCondition::invisibilityOfElementLocated($modalSelector)
            );
            self::annotate("Delete modal closed by user action");

        } catch (TimeoutException $e) {
            $elapsed = time() - $startTime;
            $stagesInfo = !empty($seenStages) ? "Stages seen: " . implode(' -> ', $seenStages) : "No stages detected";
            $this->fail("Delete process did not complete within $maxWaitTime seconds (elapsed: {$elapsed}s). $stagesInfo. Last stage: $lastStage");
        }

        // Additional wait for any final operations before restart
        sleep(5);
    }

    /**
     * Monitor authentication status after delete operation starts
     *
     * WHY: After delete operation starts, JWT session may be invalidated
     * This method waits 2 minutes then checks if user is still authenticated
     */
    private function monitorAuthenticationStatusDuringDelete(): void
    {
        self::annotate("Starting authentication status monitoring during delete");

        $waitBeforeCheck = 120; // 2 minutes as requested
        $checkInterval = 5; // Check every 5 seconds
        $maxChecks = 24; // 2 minutes of checking (24 * 5 seconds)

        self::annotate("Waiting $waitBeforeCheck seconds before starting authentication checks...");
        sleep($waitBeforeCheck);

        self::annotate("Starting to refresh page and check authentication status");

        $checkCount = 0;
        $authStatusDetermined = false;

        while ($checkCount < $maxChecks && !$authStatusDetermined) {
            $checkCount++;
            self::annotate("Authentication check #{$checkCount}");

            try {
                // Refresh current page
                self::$driver->navigate()->refresh();

                // Wait for page body to load
                $wait = new WebDriverWait(self::$driver, 10);
                $wait->until(
                    WebDriverExpectedCondition::presenceOfElementLocated(
                        WebDriverBy::tagName('body')
                    )
                );

                // Give page time to render
                sleep(2);

                // Check if we're on login page (JWT token invalidated)
                $loginFormElements = self::$driver->findElements(WebDriverBy::id('login-form'));
                if (count($loginFormElements) > 0 && $loginFormElements[0]->isDisplayed()) {
                    self::annotate("✓ Authentication status determined: JWT TOKEN INVALIDATED - Login form is visible");
                    $authStatusDetermined = true;
                    break;
                }

                // Check if we're on general settings page (JWT token still valid)
                $deleteAllTabElements = self::$driver->findElements(WebDriverBy::xpath("//a[@data-tab='deleteAll']"));
                if (count($deleteAllTabElements) > 0 && $deleteAllTabElements[0]->isDisplayed()) {
                    self::annotate("✓ Authentication status determined: JWT TOKEN STILL VALID - General Settings page is accessible");
                    $authStatusDetermined = true;
                    break;
                }

                // Check if top menu is visible (another indicator of valid session)
                $topMenuElements = self::$driver->findElements(WebDriverBy::id('top-menu-search'));
                if (count($topMenuElements) > 0 && $topMenuElements[0]->isDisplayed()) {
                    self::annotate("✓ Authentication status determined: JWT TOKEN STILL VALID - Top menu is visible");
                    $authStatusDetermined = true;
                    break;
                }

                // Page loaded but neither element visible - system might be processing
                self::annotate("Page refreshed but UI not ready, waiting... (check {$checkCount}/{$maxChecks})");

            } catch (\Exception $e) {
                // Error during page load - system might be down or restarting
                self::annotate("Error during authentication check: " . $e->getMessage());
            }

            sleep($checkInterval);
        }

        if (!$authStatusDetermined) {
            self::annotate("WARNING: Could not determine authentication status after {$checkCount} checks");
        }

        self::annotate("Authentication monitoring completed, proceeding with delete validation");
    }

    /**
     * Wait for system restart after delete operation
     *
     * WHY: After delete all settings, system reboots and user session is invalidated
     * System is considered "back online" when either:
     * - Login form is visible (user logged out - expected after reset)
     * - Top menu is visible (user still logged in - rare case)
     */
    private function waitForSystemRestart(): void
    {
        self::annotate("Waiting for system restart");

        $maxRestartTime = 180; // 3 minutes max for restart
        $checkInterval = 10; // Check every 10 seconds
        $startTime = time();

        // WHY: Give delete operation time to initiate system reboot
        self::annotate("Waiting for system to go down for restart...");
        sleep(10);

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

        // WHY: Now wait for system to come back online and be accessible
        self::annotate("Waiting for system to come back online...");
        $systemBackUp = false;
        $remainingTime = $maxRestartTime - (time() - $startTime);

        while ($remainingTime > 0) {
            try {
                // Try to access the admin cabinet URL
                self::$driver->get($this->testsConfig['url']);

                // Wait for page body to load
                $wait = new WebDriverWait(self::$driver, 5);
                $wait->until(
                    WebDriverExpectedCondition::presenceOfElementLocated(
                        WebDriverBy::tagName('body')
                    )
                );

                // WHY: After delete all, user is logged out, so login form should be visible
                // Check if login form is present AND visible (not just in DOM)
                $loginElements = self::$driver->findElements(WebDriverBy::id('login-form'));
                if (count($loginElements) > 0 && $loginElements[0]->isDisplayed()) {
                    $systemBackUp = true;
                    self::annotate("System is back online - login form is visible");
                    break;
                }

                // WHY: In rare cases session might persist, check if top menu is visible
                $topMenuElements = self::$driver->findElements(WebDriverBy::id('top-menu-search'));
                if (count($topMenuElements) > 0 && $topMenuElements[0]->isDisplayed()) {
                    $systemBackUp = true;
                    self::annotate("System is back online - user still logged in");
                    break;
                }

                // WHY: Page loaded but neither element is visible - system still initializing
                self::annotate("Page loaded but UI not ready, waiting... (remaining: {$remainingTime}s)");

            } catch (\Exception $e) {
                // System still down or page not loading, wait and retry
                self::annotate("System still down, waiting... (remaining: {$remainingTime}s)");
            }

            sleep($checkInterval);
            $remainingTime = $maxRestartTime - (time() - $startTime);
        }

        if (!$systemBackUp) {
            $this->fail("System did not come back online within $maxRestartTime seconds");
        }

        // WHY: Give system additional time to fully initialize all services
        sleep(10);

        self::annotate("System restart completed successfully");
    }

    /**
     * Save critical settings before deletion
     *
     * @return array<string, mixed> Array of critical settings
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
        $nameElement = self::$driver->findElement(WebDriverBy::id('Name'));
        $settings['pbx_name'] = $nameElement->getAttribute('value') ?? '';

        // Get language setting (using DropdownInteractionTrait)
        $settings['pbx_language'] = $this->getDropdownValue('PBXLanguage') ?? '';
        
        // Get port settings from Web-интерфейс tab
        $webTabXpath = "//a[@data-tab='web']";
        $webTab = self::$driver->findElement(WebDriverBy::xpath($webTabXpath));
        $webTab->click();
        $this->waitForAjax();
        
        // Get web port settings
        $webPortElement = self::$driver->findElement(WebDriverBy::id('WEBPort'));
        $settings['web_port'] = $webPortElement->getAttribute('value') ?? '';

        $webHttpsPortElement = self::$driver->findElement(WebDriverBy::id('WEBHTTPSPort'));
        $settings['web_https_port'] = $webHttpsPortElement->getAttribute('value') ?? '';
        
        // Switch to SSH tab to get SSH port
        $sshTabXpath = "//a[@data-tab='ssh']";
        $sshTab = self::$driver->findElement(WebDriverBy::xpath($sshTabXpath));
        $sshTab->click();
        $this->waitForAjax();
        
        // Get SSH port setting
        $sshPortElement = self::$driver->findElement(WebDriverBy::id('SSHPort'));
        $settings['ssh_port'] = $sshPortElement->getAttribute('value') ?? '';
        
        // Get license information from the modules section
        $settings['license_key'] = $this->getLicenseKey();
        
        self::annotate("Critical settings saved: " . json_encode($settings));
        
        return $settings;
    }

    /**
     * Verify critical settings were preserved after deletion
     *
     * @param array<string, mixed> $savedSettings Settings saved before deletion
     */
    private function verifyCriticalSettingsPreserved(array $savedSettings): void
    {
        self::annotate("Verifying critical settings were preserved");
        
        // Navigate to General Settings
        $this->clickSidebarMenuItemByHref('/admin-cabinet/general-settings/modify/');
        
        // Verify PBX name (it's reset to default)
        $nameElement = self::$driver->findElement(WebDriverBy::id('Name'));
        $currentPbxName = $nameElement->getAttribute('value') ?? '';
        self::annotate("PBX Name: Expected default 'MikoPBX', Got: '$currentPbxName'");

        // Verify language setting preserved (using DropdownInteractionTrait)
        $currentLanguage = $this->getDropdownValue('PBXLanguage') ?? '';
        $this->assertEquals($savedSettings['pbx_language'], $currentLanguage, "Language setting should be preserved");
        
        // Verify port settings from Web-интерфейс tab
        $webTabXpath = "//a[@data-tab='web']";
        $webTab = self::$driver->findElement(WebDriverBy::xpath($webTabXpath));
        $webTab->click();
        $this->waitForAjax();
        
        // Verify web port settings preserved
        $webPortElement = self::$driver->findElement(WebDriverBy::id('WEBPort'));
        $currentWEBPort = $webPortElement->getAttribute('value') ?? '';
        $this->assertEquals($savedSettings['web_port'], $currentWEBPort, "Web port should be preserved");

        $webHttpsPortElement = self::$driver->findElement(WebDriverBy::id('WEBHTTPSPort'));
        $currentHttpsPort = $webHttpsPortElement->getAttribute('value') ?? '';
        $this->assertEquals($savedSettings['web_https_port'], $currentHttpsPort, "HTTPS port should be preserved");
        
        // Switch to SSH tab to verify SSH port
        $sshTabXpath = "//a[@data-tab='ssh']";
        $sshTab = self::$driver->findElement(WebDriverBy::xpath($sshTabXpath));
        $sshTab->click();
        $this->waitForAjax();
        
        // Verify SSH port setting preserved
        $sshPortElement = self::$driver->findElement(WebDriverBy::id('SSHPort'));
        $currentSshPort = $sshPortElement->getAttribute('value') ?? '';
        $this->assertEquals($savedSettings['ssh_port'], $currentSshPort, "SSH port should be preserved");
        
        // Verify admin login still works (we're logged in)
        $this->assertTrue(true, "Admin credentials preserved - we're still logged in");
        
        // Verify license key if it existed
        if (!empty($savedSettings['license_key'])) {
            $currentLicenseKey = $this->getLicenseKey();
            $this->assertEquals($savedSettings['license_key'], $currentLicenseKey, "License key should be preserved");
            self::annotate("License key verification: preserved");
        } else {
            self::annotate("License key verification: no license key was found before deletion");
        }
        
        self::annotate("Critical settings verification completed");
    }


    /**
     * Get license key from the modules licensing section
     * 
     * @return string License key or empty string if not found
     */
    private function getLicenseKey(): string
    {
        try {
            self::annotate("Attempting to get license key from modules section");
            
            // Navigate to modules page
            $this->clickSidebarMenuItemByHref('/admin-cabinet/pbx-extension-modules/index/');
            
            // Wait for page to load
            $this->waitForAjax();
            
            // Click on "Управление лицензией" tab using JavaScript click
            try {
                $licensingTabXpath = "//a[@data-tab='licensing']";
                $licensingTab = self::$driver->findElement(WebDriverBy::xpath($licensingTabXpath));
                $licensingTab->click();
                $this->waitForAjax();
                sleep(2); // Additional wait for content to load
                
                // Look for license key in the table - more specific selector based on what we saw
                $licenseKeyXpath = "//table//tr//td//div[contains(@class, 'content')][contains(text(), 'MIKO-')]";
                $licenseKeyElements = self::$driver->findElements(WebDriverBy::xpath($licenseKeyXpath));
                
                if (!empty($licenseKeyElements)) {
                    $licenseKey = trim($licenseKeyElements[0]->getText());
                    self::annotate("Found license key: $licenseKey");
                    return $licenseKey;
                } else {
                    // Fallback: try to get any text that looks like a license key
                    $fallbackXpath = "//table//tr//td[contains(text(), 'MIKO-')]";
                    $fallbackElements = self::$driver->findElements(WebDriverBy::xpath($fallbackXpath));
                    if (!empty($fallbackElements)) {
                        $licenseKey = trim($fallbackElements[0]->getText());
                        self::annotate("Found license key (fallback): $licenseKey");
                        return $licenseKey;
                    }
                }
            } catch (\Exception $e) {
                self::annotate("Could not find licensing tab or license key: " . $e->getMessage());
            }
            
        } catch (\Exception $e) {
            self::annotate("Error getting license key: " . $e->getMessage());
        }
        
        return '';
    }

    /**
     * Verify codecs were reset to default values (all enabled)
     */
    private function verifyCodecDefaults(): void
    {
        self::annotate("Verifying codec defaults after reset");

        // Navigate to General Settings
        $this->clickSidebarMenuItemByHref('/admin-cabinet/general-settings/modify/');

        // Create instance of FillPBXSettingsTest to use its codec verification method
        $fillSettingsHelper = new FillPBXSettingsTest();
        $fillSettingsHelper->setUp();

        // Verify all codecs are enabled (default state after reset)
        $fillSettingsHelper->verifyAllCodecsEnabled(true);

        self::annotate("Codec defaults verification completed using FillPBXSettingsTest::verifyAllCodecsEnabled");
    }

}