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
use MikoPBX\Tests\AdminCabinet\Tests\Data\EmployeeDataFactory;

/**
 * Class ChangeExtensionsSettingsTest
 * This class contains test cases related to changing extension settings.
 *
 * @package MikoPBX\Tests\AdminCabinet\Lib
 */
class ChangeExtensionsSettingsTest extends MikoPBXTestsBase
{
    private array $employeeData;

    /**
     * Set up before each test
     *
     * @throws GuzzleException
     * @throws \Exception
     */
    public function setUp(): void
    {
        parent::setUp();
        $this->employeeData = EmployeeDataFactory::getEmployeeData('alexandra.pushina.289');
        $this->setSessionName("Test: Change extension settings");
    }

    /**
     * Test changing extension settings.
     *
     */
    public function testChangeExtension(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        // Fill search field
        $this->fillDataTableSearchInput('extensions-table', 'global-search', $this->employeeData['username']);

        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);
        $this->changeInputField('number', $this->employeeData['number']);
        self::$driver->executeScript('$("#number").trigger("change")');
        self::$driver->executeScript('extension.cbOnCompleteNumber()');
        $this->changeTabOnCurrentPage('routing');
        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);
        $this->assertInputFieldValueEqual('number', $this->employeeData['number']);
    }


    /**
     * Test changing mobile settings for an extension.
     *
     * @depends testChangeExtension
     */
    public function testChangeMobile(): void
    {

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        // Fill search field
        $this->fillDataTableSearchInput('extensions-table', 'global-search', $this->employeeData['username']);

        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);
        $this->changeInputField('mobile_number', $this->employeeData['mobile']);
        self::$driver->executeScript('$("#mobile_number").trigger("change")');
        self::$driver->executeScript('extension.cbOnCompleteMobileNumber()');
        $this->changeTabOnCurrentPage('routing');
        $this->changeInputField('fwd_ringlength', $this->employeeData['fwd_ringlength']);
        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);
        $this->changeTabOnCurrentPage('routing');
        $this->assertInputFieldValueEqual('fwd_ringlength', $this->employeeData['fwd_ringlength']);
        $this->assertMenuItemSelected('fwd_forwardingonbusy', $this->employeeData['mobile']);
        $this->assertMenuItemSelected('fwd_forwarding', $this->employeeData['mobile']);
        $this->assertMenuItemSelected('fwd_forwardingonunavailable', $this->employeeData['mobile']);

        $this->changeTabOnCurrentPage('general');
        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();
        $this->assertInputFieldValueEqual('mobile_dialstring', $this->employeeData['mobile']);
    }

    /**
     * Test clearing mobile settings for an extension.
     *
     * @depends testChangeMobile
     *
     */
    public function testClearMobile(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        // Fill search field
        $this->fillDataTableSearchInput('extensions-table', 'global-search', $this->employeeData['username']);


        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);
        $this->changeInputField('mobile_number', '');
        self::$driver->executeScript('$("#mobile_number").trigger("change")');
        self::$driver->executeScript('extension.cbOnClearedMobileNumber()');
        $this->changeTabOnCurrentPage('routing');
        $this->changeInputField('fwd_ringlength', '');
        $this->submitForm('extensions-form');
        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);

        $this->changeTabOnCurrentPage('routing');
        $this->assertInputFieldValueEqual('fwd_ringlength', '0');
        $this->assertMenuItemSelected('fwd_forwardingonbusy', '');
        $this->assertMenuItemSelected('fwd_forwarding', '');
        $this->assertMenuItemSelected('fwd_forwardingonunavailable', '');

        // Раскрываем расширенные опции
        $this->changeTabOnCurrentPage('general');
        $this->openAccordionOnThePage();
        $this->assertInputFieldValueEqual('mobile_dialstring', '');
    }

    /**
     * Test changing email settings for an extension.
     *
     * @depends testClearMobile
     *
     */
    public function testChangeEmail(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        // Fill search field
        $this->fillDataTableSearchInput('extensions-table', 'global-search', $this->employeeData['username']);

        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);

        $this->changeInputField('user_email', $this->employeeData['email']);
        self::$driver->executeScript('$("#user_email").trigger("change")');
        self::$driver->executeScript('extension.cbOnCompleteEmail()');
        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);
        $this->assertInputFieldValueEqual('user_email', $this->employeeData['email']);
    }

    /**
     * Test clearing email settings for an extension.
     *
     * @depends testChangeEmail
     */
    public function testClearEmail(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        // Fill search field
        $this->fillDataTableSearchInput('extensions-table', 'global-search', $this->employeeData['username']);

        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);

        $this->changeInputField('user_email', '');
        self::$driver->executeScript('$("#user_email").trigger("change")');
        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);
        $this->assertInputFieldValueEqual('user_email', '');
    }

    /**
     * Test changing forwarding settings for an extension.
     *
     * @depends testClearEmail
     *
     */
    public function testChangeForwarding(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        // Fill search field
        $this->fillDataTableSearchInput('extensions-table', 'global-search', $this->employeeData['username']);

        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);

        $this->changeTabOnCurrentPage('routing');
        $this->changeInputField('fwd_ringlength', $this->employeeData['fwd_ringlength']);
        $this->selectDropdownItem('fwd_forwardingonbusy', $this->employeeData['fwd_forwardingonbusy']);
        $this->selectDropdownItem('fwd_forwarding', $this->employeeData['fwd_forwarding']);
        $this->selectDropdownItem('fwd_forwardingonunavailable', $this->employeeData['fwd_forwardingonunavailable']);

        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);
        $this->changeTabOnCurrentPage('routing');
        $this->assertInputFieldValueEqual('fwd_ringlength', $this->employeeData['fwd_ringlength']);
        $this->assertMenuItemSelected('fwd_forwardingonbusy', $this->employeeData['fwd_forwardingonbusy']);
        $this->assertMenuItemSelected('fwd_forwarding', $this->employeeData['fwd_forwarding']);
        $this->assertMenuItemSelected('fwd_forwardingonunavailable', $this->employeeData['fwd_forwardingonunavailable']);
    }


    /**
     * Test changing various extension settings.
     *
     * @depends testChangeForwarding
     */
    public function testChangeExtensions(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        // Fill search field
        $this->fillDataTableSearchInput('extensions-table', 'global-search', $this->employeeData['username']);

        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);

        $this->changeInputField('user_username', $this->employeeData['username']);
        $this->changeInputField('number', $this->employeeData['number']);
        self::$driver->executeScript('$("#number").trigger("change")');
        self::$driver->executeScript('extension.cbOnCompleteNumber()');
        $this->changeInputField('mobile_number', $this->employeeData['mobile']);
        self::$driver->executeScript('$("#mobile_number").trigger("change")');
        self::$driver->executeScript('extension.cbOnCompleteMobileNumber()');
        $this->changeInputField('user_email', $this->employeeData['email']);
        $this->changeInputField('sip_secret', $this->employeeData['secret']);

        $this->changeTabOnCurrentPage('routing');
        $this->changeInputField('fwd_ringlength', $this->employeeData['fwd_ringlength']);
        $this->selectDropdownItem('fwd_forwardingonbusy', $this->employeeData['fwd_forwardingonbusy']);
        $this->selectDropdownItem('fwd_forwarding', $this->employeeData['fwd_forwarding']);
        $this->selectDropdownItem('fwd_forwardingonunavailable', $this->employeeData['fwd_forwardingonunavailable']);
        $this->changeTabOnCurrentPage('general');

        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();

        // Try to select specified network filter, fall back to 'none' if not available
        $networkFilterId = $this->employeeData['sip_networkfilterid'];
        if ($networkFilterId !== 'none' && !$this->dropdownHasValue('sip_networkfilterid', $networkFilterId)) {
            self::annotate("Network filter ID '{$networkFilterId}' not found, falling back to 'none'", 'warning');
            $networkFilterId = 'none';
        }
        $this->selectDropdownItem('sip_networkfilterid', $networkFilterId);

        $this->changeTextAreaValue('sip_manualattributes', $this->employeeData['sip_manualattributes']);

        //$filePath           =  __DIR__."/../assets/{$params['number']}.png";
        $filePath = 'C:\Users\hello\Documents\images\person.jpg';
        $this->changeFileField('file-select', $filePath);

        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($this->employeeData['username']);
        $this->assertInputFieldValueEqual('user_username', $this->employeeData['username']);
        $this->assertInputFieldValueEqual('number', $this->employeeData['number']);
        $this->assertInputFieldValueEqual('user_email', $this->employeeData['email']);
        // $this->assertInputFieldValueEqual('mobile_number',  $this->employeeData['mobile']);

        $this->changeTabOnCurrentPage('routing');
        $this->assertInputFieldValueEqual('fwd_ringlength', $this->employeeData['fwd_ringlength']);
        $this->assertMenuItemSelected('fwd_forwardingonbusy', $this->employeeData['fwd_forwardingonbusy']);
        $this->assertMenuItemSelected('fwd_forwarding', $this->employeeData['fwd_forwarding']);
        $this->assertMenuItemSelected('fwd_forwardingonunavailable', $this->employeeData['fwd_forwardingonunavailable']);
        $this->changeTabOnCurrentPage('general');
        // Extension passwords are not masked
        $this->assertInputFieldValueEqual('sip_secret', $this->employeeData['secret']);


        // Expand advanced options
        $this->openAccordionOnThePage();
        $this->assertInputFieldValueEqual('mobile_dialstring', $this->employeeData['mobile']);

        // Verify network filter - check for either specified value or 'none' fallback
        $expectedNetworkFilter = $this->employeeData['sip_networkfilterid'];
        if ($expectedNetworkFilter !== 'none' && !$this->dropdownHasValue('sip_networkfilterid', $expectedNetworkFilter)) {
            $expectedNetworkFilter = 'none';
        }
        $this->assertMenuItemSelected('sip_networkfilterid', $expectedNetworkFilter);


        $this->assertTextAreaValueIsEqual('sip_manualattributes', $this->employeeData['sip_manualattributes']);
    }
}
