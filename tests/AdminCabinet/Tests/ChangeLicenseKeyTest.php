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

class ChangeLicenseKeyTest extends MikoPBXTestsBase
{

    /**
     * Set up before each test
     *
     * @throws GuzzleException
     * @throws \Exception
     */
    public function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Change license key");
    }

    /**
     * Test filling and verifying the license key.
     *
     * @depends testLogin
     * @dataProvider licenseKeyProvider
     *
     * @param string $licenseKey The license key to test.
     */
    public function testFillLicenseKey(string $licenseKey): void
    {
        // Navigate to the PBX extension modules section
        $this->clickSidebarMenuItemByHref('/admin-cabinet/pbx-extension-modules/index/');
        $this->changeTabOnCurrentPage('licensing');

        // Remove "MIKO-" prefix from the license key
        $licKey = str_ireplace('MIKO-', '', $licenseKey);

        // Fill the license key input field
        $this->changeInputField('licKey', $licKey);

        // Save the license key
        $saveButton = self::$driver->findElement(WebDriverBy::id('save-license-key-button'));
        $saveButton->click();
        $this->waitForAjax();

        // Verify that the saved license key matches the original
        $this->clickSidebarMenuItemByHref('/admin-cabinet/pbx-extension-modules/index/');
        $this->changeTabOnCurrentPage('licensing');
        $this->assertInputFieldValueEqual('licKey', $licenseKey);
    }

    /**
     * Provides test data for the license key test.
     *
     * @return array
     */
    public function licenseKeyProvider(): array
    {
        return [
            [$GLOBALS['MIKO_LICENSE_KEY']]
        ];
    }
}