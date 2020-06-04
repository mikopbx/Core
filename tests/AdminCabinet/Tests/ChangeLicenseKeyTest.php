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

class ChangeLicenseKeyTest extends MikoPBXTestsBase
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param string $licenseKey;
     */
    public function testFillLicenseKey($licenseKey):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/licensing/modify/');
        $this->changeTabOnCurrentPage('management');

        // Сбрасываем привязку к ключу
        $xpath         = "id('reset-license')";
        $tab = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $tab->click();

        $licKey = str_ireplace('MIKO-','', $licenseKey);
        $this->changeInputField('licKey', $licKey);

        $this->submitForm('licencing-modify-form');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/licensing/modify/');
        $this->changeTabOnCurrentPage('management');
        $this->assertInputFieldValueEqual('licKey', $licenseKey);

    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {
        return [
            [$GLOBALS['MIKO_LICENSE_KEY']]
        ];
    }

}