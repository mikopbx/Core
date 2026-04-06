<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Lib\Traits\TableSearchTrait;

abstract class CreateExtensionsTest extends MikoPBXTestsBase
{
    use TableSearchTrait;
    /**
     * Set up before each test
     *
     * @throws \Exception
     */
    protected function setUp(): void
    {
        parent::setUp();
        $params = $this->getEmployeeData();
        $this->setSessionName("Test: Creating extension for {$params['username']}");
    }

    /**
     * Employee data must be defined in child class
     */
    abstract protected function getEmployeeData(): array;

    /**
     * Test creating employee extension
     */
    public function testCreateExtension(): void
    {
        $params = $this->getEmployeeData();
        self::annotate("Creating extension for user: {$params['username']}");

        try {
            // Check if extension already exists
            if ($this->extensionExistsBySearch($params['username'])) {
                self::annotate("Extension '{$params['username']}' already exists - skipping creation");

                // Verify existing extension has correct data
                $this->verifyExistingExtension($params);
                return;
            }

            // Create new extension
            $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
            $this->clickButtonByHref('/admin-cabinet/extensions/modify');
            $this->fillEmployeeForm($params);
            $this->submitForm('extensions-form');
            $this->waitForAjax();

            // Verify creation
            $this->verifyExtensionCreation($params);

            self::annotate("Successfully created extension for: {$params['username']}", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to create extension for: {$params['username']}", 'error');
            throw $e;
        }
    }

    /**
     * Fill employee form with data
     *
     * @param array $params
     */
    private function fillEmployeeForm(array $params): void
    {
        $this->changeInputField('user_username', $params['username']);
        $this->changeInputField('number', $params['number']);
        $this->changeInputField('mobile_number', $params['mobile']);
        self::$driver->executeScript('$("#mobile_number").trigger("change")');
        $this->changeInputField('user_email', $params['email']);
        $this->changeInputField('sip_secret', $params['secret']);

        // Expand advanced options
        $this->openAccordionOnThePage();

        // Set advanced options
        $this->changeCheckBoxState('sip_enableRecording', $params['sip_enableRecording']);

        // Try to select specified network filter, fall back to 'none' if not available
        $networkFilterId = $params['sip_networkfilterid'];
        if ($networkFilterId !== 'none' && !$this->dropdownHasValue('sip_networkfilterid', $networkFilterId)) {
            self::annotate("Network filter ID '{$networkFilterId}' not found, falling back to 'none'", 'warning');
            $networkFilterId = 'none';
        }
        $this->selectDropdownItem('sip_networkfilterid', $networkFilterId);

        $this->selectDropdownItem('sip_transport', $params['sip_transport']);
        $this->changeTextAreaValue('sip_manualattributes', $params['sip_manualattributes']);


        $this->changeTabOnCurrentPage('routing');
        if (isset($params['fwd_ringlength'])) {
            $this->changeInputField('fwd_ringlength', $params['fwd_ringlength']);
        }
        if (isset($params['fwd_forwardingonbusy'])) {
            $this->changeInputField('fwd_forwardingonbusy', $params['fwd_forwardingonbusy']);
        }
        if (isset($params['fwd_forwarding'])) {
            $this->changeInputField('fwd_forwarding', $params['fwd_forwarding']);
        }
        if (isset($params['fwd_forwardingonunavailable'])) {
            $this->changeInputField('fwd_forwardingonunavailable', $params['fwd_forwardingonunavailable']);
        }
    }

    /**
     * Verify extension creation
     *
     * @param array $params
     */
    private function verifyExtensionCreation(array $params): void
    {
        // Wait for extension creation
        self::$driver->wait(10, 500)->until(
            function () {
                $xpath = "//input[@name = 'id']";
                $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
                return $input_ExtensionUniqueID->getAttribute('value') !== '';
            }
        );

        // Navigate back to verify
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->fillDataTableSearchInput('extensions-table', 'global-search', $params['username']);
        $this->clickModifyButtonOnRowWithText($params['username']);

        // Verify fields
        $this->verifyExtensionFields($params);
    }

    /**
     * Verify extension fields
     *
     * @param array $params
     */
    private function verifyExtensionFields(array $params): void
    {
        $this->assertInputFieldValueEqual('user_username', $params['username']);
        $this->assertInputFieldValueEqual('number', $params['number']);
        $this->assertInputFieldValueEqual('user_email', $params['email']);

        $this->changeTabOnCurrentPage('routing');

        if (isset($params['fwd_ringlength'])) {
            $this->assertInputFieldValueEqual('fwd_ringlength', $params['fwd_ringlength']);
        } else {
            $this->assertInputFieldValueEqual('fwd_ringlength', '45');
        }
        if (isset($params['fwd_forwardingonbusy'])) {
            $this->assertMenuItemSelected('fwd_forwardingonbusy', $params['fwd_forwardingonbusy']);
        } else {
            $this->assertMenuItemSelected('fwd_forwardingonbusy', $params['mobile']);
        }
        if (isset($params['fwd_forwarding'])) {
            $this->assertMenuItemSelected('fwd_forwarding', $params['fwd_forwarding']);
        } else {
            $this->assertMenuItemSelected('fwd_forwarding', $params['mobile']);
        }
        if (isset($params['fwd_forwardingonunavailable'])) {
            $this->assertMenuItemSelected('fwd_forwardingonunavailable', $params['fwd_forwardingonunavailable']);
        } else {
            $this->assertMenuItemSelected('fwd_forwardingonunavailable', $params['mobile']);
        }       
       
        $this->changeTabOnCurrentPage('general');
        // Extension passwords are not masked
        $this->assertInputFieldValueEqual('sip_secret', $params['secret']);

        $this->openAccordionOnThePage();
        $this->assertInputFieldValueEqual('mobile_dialstring', $params['mobile']);

        // Verify network filter - check for either specified value or 'none' fallback
        $expectedNetworkFilter = $params['sip_networkfilterid'];
        if ($expectedNetworkFilter !== 'none' && !$this->dropdownHasValue('sip_networkfilterid', $expectedNetworkFilter)) {
            $expectedNetworkFilter = 'none';
        }
        $this->assertMenuItemSelected('sip_networkfilterid', $expectedNetworkFilter);

        $this->assertMenuItemSelected('sip_transport', $params['sip_transport']);
        $this->assertTextAreaValueIsEqual('sip_manualattributes', $params['sip_manualattributes']);


    }

    /**
     * Verify existing extension has correct data
     *
     * @param array $params
     */
    private function verifyExistingExtension(array $params): void
    {
        self::annotate("Verifying existing extension: {$params['username']}");

        // Navigate to extension and verify
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->fillDataTableSearchInput('extensions-table', 'global-search', $params['username']);
        $this->clickModifyButtonOnRowWithText($params['username']);

        // Verify all fields
        $this->verifyExtensionFields($params);

        self::annotate("Extension '{$params['username']}' verification completed");
    }
}
