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

class FillPBXSettingsTest extends MikoPBXTestsBase
{
    /**
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param array $dataSet
     */
    public function testFillPBXSettings($dataSet): void
    {
        $this->clickSidebarMenuItemByHref("/admin-cabinet/general-settings/modify/");

        foreach ($dataSet as $key => $value) {
            $this->findElementOnPageAndFillValue($key, $value);
        }

        $this->submitForm('general-settings-form');

        $this->clickSidebarMenuItemByHref("/admin-cabinet/general-settings/modify/");

        foreach ($dataSet as $key => $value) {
            $this->findElementOnPageAndCheckValue($key, $value);
        }
    }


    private function findElementOnPageAndFillValue(string $key, $value): void
    {
        $xpath = '//input[@name="' . $key . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"tab")]';

        $inputItemPages = self::$driver->findElements(WebDriverBy::xpath($xpath));

        foreach ($inputItemPages as $inputItemPage) {
            $elementPage = $inputItemPage->getAttribute('data-tab');
            //self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/{$elementPage}");
            $this->clickOnLeftTabByDataTab($elementPage);
            $this->changeInputField($key, $value, true);
            $this->changeCheckBoxState($key, $value, true);
        }

        $xpath             = '//textarea[@name="' . $key . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"tab")]';
        $textAreaItemPages = self::$driver->findElements(WebDriverBy::xpath($xpath));

        foreach ($textAreaItemPages as $textAreaItemPage) {
            $elementPage = $textAreaItemPage->getAttribute('data-tab');
            //self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/{$elementPage}");
            $this->clickOnLeftTabByDataTab($elementPage);
            $this->changeTextAreaValue($key, $value, true);
        }

        $xpath           = '//select[@name="' . $key . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"tab")]';
        $selectItemPages = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($selectItemPages as $selectItemPage) {
            $elementPage = $selectItemPage->getAttribute('data-tab');
            //self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/{$elementPage}");
            $this->clickOnLeftTabByDataTab($elementPage);
            $this->selectDropdownItem($key, $value);
        }
    }

    private function findElementOnPageAndCheckValue(string $key, $value): void
    {
        $xpath          = '//input[@name="' . $key . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"tab")]';
        $inputItemPages = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($inputItemPages as $inputItemPage) {
            $elementPage = $inputItemPage->getAttribute('data-tab');
            //self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/{$elementPage}");
            $this->clickOnLeftTabByDataTab($elementPage);
            $this->assertInputFieldValueEqual($key, $value, true);
            $this->assertCheckBoxStageIsEqual($key, $value, true);
        }

        $xpath             = '//textarea[@name="' . $key . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"tab")]';
        $textAreaItemPages = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($textAreaItemPages as $textAreaItemPage) {
            $elementPage = $textAreaItemPage->getAttribute('data-tab');
            //self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/{$elementPage}");
            $this->clickOnLeftTabByDataTab($elementPage);
            $this->assertTextAreaValueIsEqual($key, $value);
        }

        $xpath           = '//select[@name="' . $key . '"]/ancestor::div[contains(@class, "ui") and contains(@class ,"tab")]';
        $selectItemPages = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($selectItemPages as $selectItemPage) {
            $elementPage = $selectItemPage->getAttribute('data-tab');
            //self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/{$elementPage}");
            $this->clickOnLeftTabByDataTab($elementPage);
            $this->assertMenuItemSelected($key, $value);
        }
    }

    /**
     * Change page
     * @param string $identifier
     *
     * @return void
     */
    private function clickOnLeftTabByDataTab(string $identifier):void
    {
        $xpath = "//div[@id='general-settings-menu']//ancestor::a[@data-tab='{$identifier}']";
        $tab = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $tab->click();
    }

    /**
     * Dataset provider
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params            = [];
        $SSHAuthorizedKeys = 'ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAuzhViulNR4CXHvTfz8XVdrHq/Hmb3tZP9tFvwzEPtUmSK9ZihL2w45GhEkgXROKM4fY4Ii/KmZq+K2raWFUM54r7A83WseaAZpQM649WbJFVXPOwK6gDJtU/DaL4aSCsZwqhd6eE07ELVLnvjtQMvHqGd3lHI1zn/JnXZ55VDSTPqxDIApgCa5z8yNNXf3JGx5O+teHkG2pgh1Cnki7CE/aYzNWJW6ybq9rXQa6hGna53TuNfS1DwQ2LgF3bGG+Pl7PKCbU2CesqFw6uyGlWvdtF//GmZXEuy1FZNP1f5dHqyIxxanJOcd6rI1tkIZjtckrpIyfytC2coKZKJgX2aQ== nbek@miko.ru
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAAgQDZ3hd6/gqPxMMCqFytFdVznYD3Debp2LKTRiJEaS2SSIRHtE9jMNJjCfMR3CnScjKFh19Hfg/SJf2/rmXIJOHNjZvZZ7GgPTMBYllj3okniCA4/vQQRd6FMVPa9Rhu+N2kyMoQcuDEhzL5kEw0ge5BJJcmNjzW+an3fKqB7QwfMQ== jorikfon@MacBook-Pro-Nikolay.local';

        $params[] = [
            [
                'Name'                   => 'Тестовая 72',
                'Description'            => 'log: admin  pass: 123456789MikoPBX#1 last test:' . date("Y-m-d H:i:s"),
                'PBXLanguage'            => 'en-en',
                'PBXRecordCalls'         => true,
                'SendMetrics'            => false,
                'SSHAuthorizedKeys'      => $SSHAuthorizedKeys,
                'codec_alaw'             => true,
                'codec_ulaw'             => false,
                'codec_g726'             => true,
                'codec_gsm'              => false,
                'codec_adpcm'            => true,
                'codec_g722'             => false,
                'codec_ilbc'             => true,
                'codec_opus'             => false,
                'codec_h264'             => true,
                'codec_h263'             => false,
                'codec_h263p'            => true,
            ],
        ];

        return $params;
    }
}




