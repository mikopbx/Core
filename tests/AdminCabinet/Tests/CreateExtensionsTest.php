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

abstract class CreateExtensionsTest extends MikoPBXTestsBase
{
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
            // Navigate to the extensions page
            $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

            // Fill search field and delete if exists
            $this->fillDataTableSearchInput('extensions-table', 'global-search', $params['username']);


            // Delete any existing application with the same extension
            try {
                $this->clickDeleteButtonOnRowWithText($params['username']);
            } catch (\Exception $e) {
                // Log the error as information instead of failing the test
                self::annotate(
                    sprintf('Extension "%s" not found for deletion (this is expected if Extension does not exist): %s', $params['username'], $e->getMessage()),
                    'info'
                );
            }
         

            // Create new extension
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
        $this->selectDropdownItem('sip_networkfilterid', $params['sip_networkfilterid']);
        $this->selectDropdownItem('sip_transport', $params['sip_transport']);
        $this->changeTextAreaValue('sip_manualattributes', $params['sip_manualattributes']);
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
        $this->assertInputFieldValueEqual('fwd_ringlength', '45');
        $this->assertMenuItemSelected('fwd_forwardingonbusy', $params['mobile']);
        $this->assertMenuItemSelected('fwd_forwarding', $params['mobile']);
        $this->assertMenuItemSelected('fwd_forwardingonunavailable', $params['mobile']);

        $this->changeTabOnCurrentPage('general');
        // Extension passwords are not masked
        $this->assertInputFieldValueEqual('sip_secret', $params['secret']);

        $this->openAccordionOnThePage();
        $this->assertInputFieldValueEqual('mobile_dialstring', $params['mobile']);
        $this->assertMenuItemSelected('sip_networkfilterid', $params['sip_networkfilterid']);
        $this->assertMenuItemSelected('sip_transport', $params['sip_transport']);
        $this->assertTextAreaValueIsEqual('sip_manualattributes', $params['sip_manualattributes']);
    }
}
