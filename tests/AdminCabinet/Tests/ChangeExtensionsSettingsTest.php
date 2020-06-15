<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
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
        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($params['username']);
        $this->changeTabOnCurrentPage('routing');
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
        $this->submitForm('extensions-form');

        // TESTS
        $xpath                   = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $this->assertNotEmpty($input_ExtensionUniqueID->getAttribute('value'));

        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickModifyButtonOnRowWithText($params['username']);
        $this->changeTabOnCurrentPage('routing');
        $this->assertMenuItemSelected('fwd_ringlength', '');
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
        $this->selectDropdownItem('fwd_ringlength', $params['fwd_ringlength']);
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
        $this->assertMenuItemSelected('fwd_ringlength', $params['fwd_ringlength']);
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
        $this->changeInputField('mobile_number', $params['mobile']);
        $this->changeInputField('user_email', $params['email']);
        $this->selectDropdownItem('user_language', $params['user_language']);
        $this->changeInputField('sip_secret', $params['secret']);

        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();

        $this->changeInputField('sip_busylevel', $params['sip_busylevel']);
        $this->selectDropdownItem('sip_networkfilterid', $params['sip_networkfilterid']);

        $this->changeInputField('sip_busylevel', $params['sip_busylevel']);
        foreach ($params['codecs'] as $key=>$value){
            $this->changeCheckBoxState('codec_'.$key, $value);
        }
        $this->changeTextAreaValue('sip_manualattributes', $params['manualattributes']);

        //$filePath           =  __DIR__."/../assets/{$params['number']}.png";
        $filePath = 'C:\Users\hello\Documents\images\person.jpg';
        $this->changeFileField('file-select', $filePath);

        $this->changeTabOnCurrentPage('routing');
        $this->changeInputField('fwd_ringlength', $params['fwd_ringlength']);
        $this->selectDropdownItem('fwd_forwardingonbusy', $params['fwd_forwardingonbusy']);
        $this->selectDropdownItem('fwd_forwarding', $params['fwd_forwarding']);
        $this->selectDropdownItem('fwd_forwardingonunavailable', $params['fwd_forwardingonunavailable']);
        $this->changeTabOnCurrentPage('general');

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
        $this->assertMenuItemSelected('user_language', $params['user_language']);
        $this->assertInputFieldValueEqual('sip_secret',  $params['secret']);


        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();
        $this->assertInputFieldValueEqual('mobile_dialstring',  $params['mobile']);
        $this->assertInputFieldValueEqual('sip_busylevel', $params['sip_busylevel']);
        $this->assertMenuItemSelected('sip_networkfilterid', $params['sip_networkfilterid']);

        foreach ($params['codecs'] as $key=>$value){
            $this->assertCheckBoxStageIsEqual('codec_'.$key, $value);
        }
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
                'sip_busylevel'=>2,
                'user_language'=>'en-en',
                'sip_dtmfmode'=>'inband',
                'sip_networkfilterid'=>'4',
                'fwd_ringlength'=>'30',
                'fwd_forwardingonbusy'=>'203',
                'fwd_forwarding'=>'89251111111',
                'fwd_forwardingonunavailable'=>'201',
                'manualattributes'=>'[endpoint]
callerid=2546456<235>',
                'codecs'     =>[
                    'alaw'=>false,
                    'ulaw'=>true,
                    'g729'=>false,
                    'g723.1'=>true,
                    'g726'=>false,
                    'gsm'=>true,
                    'adpcm'=>false,
                    'g722'=>true,
                    'ilbc'=>false,
                    'opus'=>true,
                    'h264'=>false,
                    'h263'=>true,
                    'h263p'=>false
                ],
            ]];
        return $params;
    }
}