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
 * Class to test the deletion of a provider in the admin cabinet.
 */
class DeleteProviderTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Delete providers");
    }

    /**
     * Test the deletion of a provider.
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the test.
     */
    public function testDeleteProvider(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->clickModifyButtonOnRowWithText($params['description']);

        // TESTS
        $xpath = "//input[@name = 'uniqid']";
        $input_UniqueID = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $elementID = $input_UniqueID->getAttribute('value');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');

        $this->clickDeleteButtonOnRowWithText($params['description']);
        $this->waitForAjax();

        // Try to find element with ID on the page

        $xpath = "//table[@id='providers-table']//tr[@id='{$elementID}']";
        $els = self::$driver->findElements(WebDriverBy::xpath($xpath));

        if ($params['possibleToDelete']) {
            if (count($els) > 0) {
                $this->fail("Unexpectedly element was found by " . $xpath . PHP_EOL);
            }
        } else {
            if (count($els) === 0) {
                $this->fail("Unexpectedly element was not found by " . $xpath . PHP_EOL);
            }
            // Check warning message on the page top
            $xpath = "//div[contains(@class,'message') and contains(@class,'negative')]";
            $errorMessage = self::$driver->findElement(WebDriverBy::xpath($xpath));
            $this->assertTrue($errorMessage->isDisplayed());
        }

        // Increment the assertion counter
        $this->assertTrue(true);
    }

    /**
     * Dataset provider for provider deletion parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['Mango office for delete'] = [
            [
                'description' => 'Mango office for delete',
                'possibleToDelete' => true
            ]
        ];
        $params['VoxlinkIAX for delete'] = [
            [
                'description' => 'VoxlinkIAX for delete',
                'possibleToDelete' => true
            ]
        ];
        return $params;
    }
}
