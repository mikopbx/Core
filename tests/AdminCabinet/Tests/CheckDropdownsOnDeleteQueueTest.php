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

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class CheckDropdownsOnDeleteQueueTest extends MikoPBXTestsBase
{
    /**
     * Test checking dropdown menus when adding extensions.
     *
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the extension.
     *
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    public function testDropdowns(array $params): void
    {
        // Routing
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');

        $elementFound = $this->checkIfElementExistOnDropdownMenu('extension', $params['number']);

        // Asserts
        if ($elementFound) {
            $this->fail('Found menuitem ' . $params['number'] .' before creating it on Incoming routes modify ' . PHP_EOL);
        }

        // Extensions
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickButtonByHref('/admin-cabinet/extensions/modify');

        $this->changeTabOnCurrentPage('routing');
        $elementFound = $this->checkIfElementExistOnDropdownMenu('fwd_forwarding', $params['number']);

        // Asserts
        if ($elementFound) {
            $this->fail('Found menuitem ' . $params['number'] .' before creating it on Extension routing tab ' . PHP_EOL);
        }

        // Create Call queue
        $createCallQueue = new CreateCallQueueTest();
        $createCallQueue->testCreateCallQueue($this->additionProvider());

        // Routing
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');

        $elementFound = $this->checkIfElementExistOnDropdownMenu('extension', $params['number']);

        // Asserts
        if (!$elementFound) {
            $this->fail('Not found menuitem ' . $params['number'] .' after creating it on Incoming routes modify ' . PHP_EOL);
        }

        // Extensions
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickButtonByHref('/admin-cabinet/extensions/modify');

        $this->changeTabOnCurrentPage('routing');
        $elementFound = $this->checkIfElementExistOnDropdownMenu('fwd_forwarding', $params['number']);

        // Asserts
        if (!$elementFound) {
            $this->fail('Not found menuitem ' . $params['number'] .' after creating it on Extension routing tab ' . PHP_EOL);
        }


        // Delete Call queue
        $deleteCallQueue = new DeleteCallQueueTest();
        $deleteCallQueue->testDeleteCallQueue($this->additionProvider());

        // Check again

        // Routing
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');

        $elementFound = $this->checkIfElementExistOnDropdownMenu('extension', $params['number']);

        // Asserts
        if ($elementFound) {
            $this->fail('Found menuitem ' . $params['number'] .' before creating it on Incoming routes modify ' . PHP_EOL);
        }

        // Extensions
        $this->clickSidebarMenuItemByHref('/admin-cabinet/extensions/index/');
        $this->clickButtonByHref('/admin-cabinet/extensions/modify');

        $this->changeTabOnCurrentPage('routing');
        $elementFound = $this->checkIfElementExistOnDropdownMenu('fwd_forwarding', $params['number']);

        // Asserts
        if ($elementFound) {
            $this->fail('Found menuitem ' . $params['number'] .' before creating it on Extension routing tab ' . PHP_EOL);
        }
    }

    /**
     * Dataset provider for call queue parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        return [
                'description' => 'Accountant department for test dropdown',
                'name' => 'Accountant department for test dropdown',
                'uniqid' => 'QUEUE-C02B7C0BBE8F0A48DE1CDF21DBADC29',
                'extension' => 20029,
                'seconds_to_ring_each_member' => 14,
                'seconds_for_wrapup' => 13,
                'recive_calls_while_on_a_call' => false,
                'caller_hear' => 'moh',
                'announce_position' => false,
                'announce_hold_time' => true,
                'periodic_announce_sound_id' => '2',
                'periodic_announce_frequency' => 24,
                'timeout_to_redirect_to_extension' => 18,
                'timeout_extension' => '202',
                'redirect_to_extension_if_empty' => '201',
                'agents' => [
                    '202',
                    '203',
                ],
                'strategy' => 'leastrecent'
        ];
    }
}