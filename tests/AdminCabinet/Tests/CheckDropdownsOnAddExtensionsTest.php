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
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Data\EmployeeDataFactory;

/**
 * Test class for checking dropdowns behavior before and after extension creation
 */
class CheckDropdownsOnAddExtensionsTest extends MikoPBXTestsBase
{
    private array $employeeData;

    /**
     * Set up before each test
     *
     * @throws GuzzleException
     * @throws \Exception
     */
    protected function setUp(): void
    {
        parent::setUp();
        $this->employeeData = EmployeeDataFactory::getEmployeeData('nikita.telegrafov');
        $this->setSessionName("Test: Check extension selection dropdown menus");
    }

    /**
     * Test checking dropdown menus before extension creation
     *
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    public function testDropdownsBeforeCreation(): void
    {
        $extensionTPL = sprintf('%s <%s>', $this->employeeData['username'], $this->employeeData['number']);

        // Check Incoming Routes dropdown
        if (self::$driver->executeScript('return sessionStorage.hasOwnProperty("/pbxcore/api/extensions/getForSelect?type=routing")')) {
            $this->annotate("sessionStorage has Item before click on Incoming routes dropdown", 'info');
        } else {
            $this->annotate("sessionStorage not has Item before click on Incoming routes dropdown", 'info');
        }

        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');

        $elementFound = $this->checkIfElementExistOnDropdownMenu('extension', $extensionTPL);
        if ($elementFound) {
            $this->fail('Found menuitem ' . $extensionTPL . ' before creating it on Incoming routes modify');
        }

        // Check Extensions dropdown
        if (self::$driver->executeScript('return sessionStorage.hasOwnProperty("/pbxcore/api/extensions/getForSelect?type=all")')) {
            $this->annotate("sessionStorage has Item before click on Extensions dropdown", 'info');
        } else {
            $this->annotate("sessionStorage not has Item before click on Extensions dropdown", 'info');
        }

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickButtonByHref('/admin-cabinet/extensions/modify');

        $this->changeTabOnCurrentPage('routing');
        $elementFound = $this->checkIfElementExistOnDropdownMenu('fwd_forwarding', $extensionTPL);
        if ($elementFound) {
            $this->fail('Found menuitem ' . $extensionTPL . ' before creating it on Extension routing tab');
        }
    }

    /**
     * Test creating the extension
     *
     * @depends testDropdownsBeforeCreation
     */
    public function testCreateExtension(): void
    {
        // Navigate to the extensions page
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

        // Fill search field and delete if exists
        $this->fillDataTableSearchInput('extensions-table', 'global-search', $this->employeeData['username']);
        $this->clickDeleteButtonOnRowWithText($this->employeeData['username']);

        // Create new extension
        $this->clickButtonByHref('/admin-cabinet/extensions/modify');
        $this->fillEmployeeForm($this->employeeData);
        $this->submitForm('extensions-form');

        // Verify creation
        $this->verifyExtensionCreation($this->employeeData);

        self::annotate("Successfully created extension for: {$this->employeeData['username']}", 'success');
    }

    /**
     * Test checking dropdown menus after extension creation
     *
     * @depends testCreateExtension
     */
    public function testDropdownsAfterCreation(): void
    {
        if (self::$driver->executeScript('return sessionStorage.hasOwnProperty("/pbxcore/api/extensions/getForSelect?type=routing")')) {
            $this->annotate("sessionStorage has Item after creation extension on Incoming routes dropdown", 'info');
        } else {
            $this->annotate("sessionStorage not has Item after creation extension on Incoming routes dropdown", 'info');
        }

        if (self::$driver->executeScript('return sessionStorage.hasOwnProperty("/pbxcore/api/extensions/getForSelect?type=all")')) {
            $this->annotate("sessionStorage has Item after creation extension on Extensions dropdown", 'info');
        } else {
            $this->annotate("sessionStorage not has Item after creation extension on Extensions dropdown", 'info');
        }

        $extensionTPL = sprintf('%s <%s>', $this->employeeData['username'], $this->employeeData['number']);

        // Check Incoming Routes dropdown
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');

        $elementFound = $this->checkIfElementExistOnDropdownMenu('extension', $extensionTPL);
        if (!$elementFound) {
            $debug = self::$driver->executeScript('return sessionStorage.getItem("/pbxcore/api/extensions/getForSelect?type=routing")');
            $this->annotate("sessionStorage Item after creation extension on Incoming routes dropdown: " . $debug, 'info');
            $this->fail('Not found menuitem ' . $extensionTPL . ' after creating it on Incoming routes modify');
        }

        // Check Extensions dropdown
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickButtonByHref('/admin-cabinet/extensions/modify');

        $this->changeTabOnCurrentPage('routing');
        $elementFound = $this->checkIfElementExistOnDropdownMenu('fwd_forwarding', $extensionTPL);
        if (!$elementFound) {
            $debug = self::$driver->executeScript('return sessionStorage.getItem("/pbxcore/api/extensions/getForSelect?type=all")');
            $this->annotate("sessionStorage Item after creation extension on Extensions dropdown: " . $debug, 'info');
            $this->fail('Not found menuitem ' . $extensionTPL . ' after creating it on Extension routing tab');
        }
    }

    /**
     * Fill employee form
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

        // Navigate back and verify fields
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->fillDataTableSearchInput('extensions-table', 'global-search', $params['username']);
        $this->clickModifyButtonOnRowWithText($params['username']);

        // Verify basic fields
        $this->assertInputFieldValueEqual('user_username', $params['username']);
        $this->assertInputFieldValueEqual('number', $params['number']);
        $this->assertInputFieldValueEqual('user_email', $params['email']);

        // Verify routing tab
        $this->changeTabOnCurrentPage('routing');
        $this->assertInputFieldValueEqual('fwd_ringlength', '45');
        $this->assertMenuItemSelected('fwd_forwardingonbusy', $params['mobile']);
        $this->assertMenuItemSelected('fwd_forwarding', $params['mobile']);
        $this->assertMenuItemSelected('fwd_forwardingonunavailable', $params['mobile']);

        // Verify general tab and advanced options
        $this->changeTabOnCurrentPage('general');
        $this->assertInputFieldValueEqual('sip_secret', $params['secret']);

        $this->openAccordionOnThePage();
        $this->assertInputFieldValueEqual('mobile_dialstring', $params['mobile']);
        $this->assertMenuItemSelected('sip_networkfilterid', $params['sip_networkfilterid']);
        $this->assertMenuItemSelected('sip_transport', $params['sip_transport']);
        $this->assertTextAreaValueIsEqual('sip_manualattributes', $params['sip_manualattributes']);
    }
}
