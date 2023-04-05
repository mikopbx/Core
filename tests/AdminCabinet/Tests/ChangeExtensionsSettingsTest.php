<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

class ChangeExtensionsSettingsTest extends MikoPBXTestsBase
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params;
     */
    public function testChangeExtension($params):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

        $this->clickModifyButtonOnRowWithText($params['username']);
        $this->changeInputField('number', $params['number']);
        self::$driver->executeScript('$("#number").trigger("change")');
        self::$driver->executeScript('extension.cbOnCompleteNumber()');
        $this->changeTabOnCurrentPage('routing');
        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($params['username']);
        $this->assertInputFieldValueEqual('number',  $params['number']);
    }


    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params;
     */
    public function testChangeMobile($params):void
    {

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

        $this->clickModifyButtonOnRowWithText($params['username']);
        $this->changeInputField('mobile_number', $params['mobile']);
        self::$driver->executeScript('$("#mobile_number").trigger("change")');
        self::$driver->executeScript('extension.cbOnCompleteMobileNumber()');
        $this->changeTabOnCurrentPage('routing');
        $this->changeInputField('fwd_ringlength', $params['fwd_ringlength']);
        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($params['username']);
        $this->changeTabOnCurrentPage('routing');
        $this->assertInputFieldValueEqual('fwd_ringlength', $params['fwd_ringlength']);
        $this->assertMenuItemSelected('fwd_forwardingonbusy', $params['mobile']);
        $this->assertMenuItemSelected('fwd_forwarding', $params['mobile']);
        $this->assertMenuItemSelected('fwd_forwardingonunavailable', $params['mobile']);

        $this->changeTabOnCurrentPage('general');
        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();
        $this->assertInputFieldValueEqual('mobile_dialstring',  $params['mobile']);
    }

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params;
     */
    public function testClearMobile($params):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

        $this->clickModifyButtonOnRowWithText($params['username']);
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
        $this->clickModifyButtonOnRowWithText($params['username']);

        $this->changeTabOnCurrentPage('routing');
        $this->assertInputFieldValueEqual('fwd_ringlength', '');
        $this->assertMenuItemSelected('fwd_forwardingonbusy', '');
        $this->assertMenuItemSelected('fwd_forwarding', '');
        $this->assertMenuItemSelected('fwd_forwardingonunavailable', '');

        // Раскрываем расширенные опции
        $this->changeTabOnCurrentPage('general');
        $this->openAccordionOnThePage();
        $this->assertInputFieldValueEqual('mobile_dialstring',  '');
    }

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params;
     */
    public function testChangeEmail($params):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

        $this->clickModifyButtonOnRowWithText($params['username']);

        $this->changeInputField('user_email', $params['email']);
        self::$driver->executeScript('$("#user_email").trigger("change")');
        self::$driver->executeScript('extension.cbOnCompleteEmail()');
        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($params['username']);
        $this->assertInputFieldValueEqual('user_email',  $params['email']);
    }

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params;
     */
    public function testClearEmail($params):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

        $this->clickModifyButtonOnRowWithText($params['username']);

        $this->changeInputField('user_email', '');
        self::$driver->executeScript('$("#user_email").trigger("change")');
        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($params['username']);
        $this->assertInputFieldValueEqual('user_email',  '');
    }

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params;
     */
    public function testChangeForwarding($params):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

        $this->clickModifyButtonOnRowWithText($params['username']);

        $this->changeTabOnCurrentPage('routing');
        $this->changeInputField('fwd_ringlength', $params['fwd_ringlength']);
        $this->selectDropdownItem('fwd_forwardingonbusy', $params['fwd_forwardingonbusy']);
        $this->selectDropdownItem('fwd_forwarding', $params['fwd_forwarding']);
        $this->selectDropdownItem('fwd_forwardingonunavailable', $params['fwd_forwardingonunavailable']);

        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($params['username']);
        $this->changeTabOnCurrentPage('routing');
        $this->assertInputFieldValueEqual('fwd_ringlength', $params['fwd_ringlength']);
        $this->assertMenuItemSelected('fwd_forwardingonbusy', $params['fwd_forwardingonbusy']);
        $this->assertMenuItemSelected('fwd_forwarding', $params['fwd_forwarding']);
        $this->assertMenuItemSelected('fwd_forwardingonunavailable', $params['fwd_forwardingonunavailable']);

    }


    /**
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param $params
     *
     */
    public function testChangeExtensions($params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

        $this->clickModifyButtonOnRowWithText($params['username']);

        $this->changeInputField('user_username', $params['username']);
        $this->changeInputField('number', $params['number']);
        self::$driver->executeScript('$("#number").trigger("change")');
        self::$driver->executeScript('extension.cbOnCompleteNumber()');
        $this->changeInputField('mobile_number', $params['mobile']);
        self::$driver->executeScript('$("#mobile_number").trigger("change")');
        self::$driver->executeScript('extension.cbOnCompleteMobileNumber()');
        $this->changeInputField('user_email', $params['email']);
        $this->changeInputField('sip_secret', $params['secret']);

        $this->changeTabOnCurrentPage('routing');
        $this->changeInputField('fwd_ringlength', $params['fwd_ringlength']);
        $this->selectDropdownItem('fwd_forwardingonbusy', $params['fwd_forwardingonbusy']);
        $this->selectDropdownItem('fwd_forwarding', $params['fwd_forwarding']);
        $this->selectDropdownItem('fwd_forwardingonunavailable', $params['fwd_forwardingonunavailable']);
        $this->changeTabOnCurrentPage('general');

        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();
        $this->selectDropdownItem('sip_networkfilterid', $params['sip_networkfilterid']);

        $this->changeTextAreaValue('sip_manualattributes', $params['manualattributes']);

        //$filePath           =  __DIR__."/../assets/{$params['number']}.png";
        $filePath = 'C:\Users\hello\Documents\images\person.jpg';
        $this->changeFileField('file-select', $filePath);

        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($params['username']);
        $this->assertInputFieldValueEqual('user_username',  $params['username']);
        $this->assertInputFieldValueEqual('number',  $params['number']);
        $this->assertInputFieldValueEqual('user_email',  $params['email']);
        // $this->assertInputFieldValueEqual('mobile_number',  $params['mobile']);

        $this->changeTabOnCurrentPage('routing');
        $this->assertInputFieldValueEqual('fwd_ringlength', $params['fwd_ringlength']);
        $this->assertMenuItemSelected('fwd_forwardingonbusy', $params['fwd_forwardingonbusy']);
        $this->assertMenuItemSelected('fwd_forwarding', $params['fwd_forwarding']);
        $this->assertMenuItemSelected('fwd_forwardingonunavailable', $params['fwd_forwardingonunavailable']);
        $this->changeTabOnCurrentPage('general');
        $this->assertInputFieldValueEqual('sip_secret',  $params['secret']);


        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();
        $this->assertInputFieldValueEqual('mobile_dialstring',  $params['mobile']);
        $this->assertMenuItemSelected('sip_networkfilterid', $params['sip_networkfilterid']);


        $this->assertTextAreaValueIsEqual('sip_manualattributes', $params['manualattributes']);
    }


    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {

        $params = [];
        $params[] = [
            [
                'number'   => 289,
                'email'    => 'mask@miko.ru',
                'username' => 'Alexandra Pushina',
                'mobile'   => '79123125410',
                'secret'   => '23542354wet2',
                'sip_dtmfmode'=>'inband',
                'sip_networkfilterid'=>'4',
                'fwd_ringlength'=>'30',
                'fwd_forwardingonbusy'=>'203',
                'fwd_forwarding'=>'89251111111',
                'fwd_forwardingonunavailable'=>'201',
                'manualattributes'=>'[endpoint]
callerid=2546456<235>',
            ]];
        return $params;
    }
}