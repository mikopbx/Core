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
        $this->clickSidebarMenuItemByHref('/admin-cabinet/pbx-extension-modules/index/');
        $this->changeTabOnCurrentPage('licensing');

        // Сбрасываем привязку к ключу
        $xpath = "id('reset-license')";
        $resetButton = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $resetButton->click();
        $this->waitForAjax();

        $this->clickSidebarMenuItemByHref('/admin-cabinet/pbx-extension-modules/index/');
        $this->changeTabOnCurrentPage('licensing');
        $licKey = str_ireplace('MIKO-','', $licenseKey);
        $this->changeInputField('licKey', $licKey);

        $this->submitForm('licencing-modify-form');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/pbx-extension-modules/index/');
        $this->changeTabOnCurrentPage('licensing');
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