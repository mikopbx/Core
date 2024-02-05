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
 * Class to test the deletion of en call queues in the admin cabinet.
 */
class DeleteCallQueueTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Delete Call Queues");
    }

    /**
     * Test the deletion of an extension.
     *
     * @depends testLogin
     * @param array $params The parameters for the test.
     */
    public function testDeleteCallQueue(array $params): void
    {

        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');
        $this->clickDeleteButtonOnRowWithText($params['name']);

        $this->waitForAjax();

        // Try to find an element with name on page
        $xpath = "//table[@id='queues-table']//tr[@id='{$params['uniqid']}']";
        $els = self::$driver->findElements(WebDriverBy::xpath($xpath));

        if (count($els) > 0) {
                $this->fail("Unexpectedly element was found by " . $xpath . PHP_EOL);
        }

        // Increment assertion counter
        $this->assertTrue(true);
    }

}
