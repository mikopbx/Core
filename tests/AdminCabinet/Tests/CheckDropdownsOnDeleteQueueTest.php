<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Data\CallQueueDataFactory;
use MikoPBX\Tests\AdminCabinet\Tests\Special\AccountantDepartmentForDropDownTest;

class CheckDropdownsOnDeleteQueueTest extends MikoPBXTestsBase
{
    private array $queueData;
    /**
     * Set up before each test
     *
     * @throws GuzzleException
     * @throws \Exception
     */
    public function setUp(): void
    {
        parent::setUp();
        $this->queueData = CallQueueDataFactory::getCallQueueData('accountant.department.for.test.dropdown');
        $this->setSessionName("Test: Checking dropdown menus after deleting call queue.");
    }

    /**
     * Test checking dropdown menus after deleting queue.
     *
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException|\Exception
     */
    public function testDropdownsOnCreateDeleteQueue(): void
    {
        // Look at the current call queue content
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');
        sleep(5);

        // Routing
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');

        $elementFound = $this->checkIfElementExistOnDropdownMenu('extension', $this->queueData['extension']);

        // Asserts
        if ($elementFound) {
            $this->fail('Found menuitem ' . $this->queueData['extension'] . ' before creating it on Incoming routes modify ' . PHP_EOL);
        }

        // Extensions
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickButtonByHref('/admin-cabinet/extensions/modify');

        $this->changeTabOnCurrentPage('routing');
        $elementFound = $this->checkIfElementExistOnDropdownMenu('fwd_forwarding', $this->queueData['extension']);

        // Asserts
        if ($elementFound) {
            $this->fail('Found menuitem ' . $this->queueData['extension'] . ' before creating it on Extension routing tab ' . PHP_EOL);
        }

        // Create Call queue
        $createCallQueue = new AccountantDepartmentForDropDownTest();
        $createCallQueue->testCreateCallQueue();
        sleep(5); //Wait intil system process the creation

        // Look at the current call queue content after creating
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');
        sleep(5);

        // Routing
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');

        $elementFound = $this->checkIfElementExistOnDropdownMenu('extension', $this->queueData['extension']);

        // Asserts
        if (!$elementFound) {
            $this->fail('Not found menuitem ' . $this->queueData['extension'] . ' after creating it on Incoming routes modify ' . PHP_EOL);
        }

        // Extensions
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickButtonByHref('/admin-cabinet/extensions/modify');

        $this->changeTabOnCurrentPage('routing');
        $elementFound = $this->checkIfElementExistOnDropdownMenu('fwd_forwarding', $this->queueData['extension']);

        // Asserts
        if (!$elementFound) {
            $this->fail('Not found menuitem ' . $this->queueData['extension'] . ' after creating it on Extension routing tab ' . PHP_EOL);
        }


        // Delete Call queue
        $deleteCallQueue = new DeleteCallQueueTest();
        $deleteCallQueue->testDeleteCallQueue($this->queueData);

        // Check again

        // Routing
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');

        $elementFound = $this->checkIfElementExistOnDropdownMenu('extension', $this->queueData['extension']);

        // Asserts
        if ($elementFound) {
            $this->fail('Found menuitem ' . $this->queueData['extension'] . ' before creating it on Incoming routes modify ' . PHP_EOL);
        }

        // Extensions
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickButtonByHref('/admin-cabinet/extensions/modify');

        $this->changeTabOnCurrentPage('routing');
        $elementFound = $this->checkIfElementExistOnDropdownMenu('fwd_forwarding', $this->queueData['extension']);

        // Asserts
        if ($elementFound) {
            $this->fail('Found menuitem ' . $this->queueData['extension'] . ' before creating it on Extension routing tab ' . PHP_EOL);
        }
    }
}
