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

/**
 * Class to test the deletion of an extension in the admin cabinet.
 */
class DeleteExtensionTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Delete extensions");
    }

    /**
     * Test the deletion of an extension.
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the test.
     */
    public function testDeleteExtension(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

        // Fill search field
        $this->fillDataTableSearchInput('global-search', $params['username']);
        $this->clickModifyButtonOnRowWithText($params['username']);

        // TESTS
        $xpath = "//input[@name = 'id']";
        $input_ExtensionUniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $elementID = $input_ExtensionUniqueID->getAttribute('value');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');

        // Fill search field
        $this->fillDataTableSearchInput('global-search', $params['username']);
        $this->clickDeleteButtonOnRowWithText($params['username']);
        $this->waitForAjax();

        // Try to find element with ID on page
        $this->fillDataTableSearchInput('global-search', $params['username']);
        $xpath = "//table[@id='extensions-table']//tr[@id='{$elementID}']";
        $els = self::$driver->findElements(WebDriverBy::xpath($xpath));

        if ($params['possibleToDelete']) {
            if (count($els) > 0) {
                $this->fail("Unexpectedly element was found by " . $xpath . PHP_EOL);
            }
        } else {
            if (count($els) === 0) {
                $this->fail("Unexpectedly element was not found by " . $xpath . PHP_EOL);
            }
            // Check warning message on page top
            $xpath = "//div[contains(@class,'message') and contains(@class,'error')]";
            $errorMessage = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $this->assertTrue($errorMessage->isDisplayed());
        }

        // Increment assertion counter
        $this->assertTrue(true);
    }

    /**
     * Dataset provider for extension deletion parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['Alexandra Pushina'] = [
            [
                'username' => 'Alexandra Pushina',
                'possibleToDelete' => true
            ]
        ];
        $params['Smith James'] = [
            [
                'username' => 'Smith James',
                'possibleToDelete' => false
            ]
        ];
        return $params;
    }
}
