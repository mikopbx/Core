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
use MikoPBX\Tests\AdminCabinet\Tests\Data\CallQueueDataFactory;

/**
 * Class ChangeCallQueueTest
 * This class contains test cases related to changing call queue settings.
 *
 * @package MikoPBX\Tests\AdminCabinet\Lib
 */
class ChangeCallQueueTest extends MikoPBXTestsBase
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
        $this->queueData = CallQueueDataFactory::getCallQueueData('sales.department.to.change.extension');
        $this->setSessionName("Test: Change parameters of the existing call queue");
    }

    /**
     * Test changing call queue extension settings.
     *
     */
    public function testChangeCallQueueExtension(): void
    {

        // Click on the call queue menu item in the sidebar
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');

        // Click the modify button for the call queue with the specified extension
        $this->clickModifyButtonOnRowWithText($this->queueData['OldExtension']);

        // Change the description and name of the call queue
        $this->changeTextAreaValue('description', $this->queueData['description']);
        $this->changeInputField('name', $this->queueData['name']);

        // Delete existing agents from the call queue
        $xpath         = ('//tr[@class="member-row"]//div[contains(@class,"delete-row-button")]');
        $deleteButtons = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($deleteButtons as $deleteButton) {
            $deleteButton->click();
            sleep(2);
        }

        // Add new agents to the call queue
        foreach ($this->queueData['agents'] as $agent) {
            $this->selectDropdownItem('extensionselect', $agent);
        }

        // Select the call queue strategy
        $this->selectDropdownItem('strategy', $this->queueData['strategy']);

        // Expand advanced options
        $this->openAccordionOnThePage();

        // Set various call queue settings
        $this->changeInputField('extension', $this->queueData['extension']);
        $this->changeInputField('seconds_to_ring_each_member', $this->queueData['seconds_to_ring_each_member']);
        $this->changeInputField('seconds_for_wrapup', $this->queueData['seconds_for_wrapup']);
        $this->changeCheckBoxState('recive_calls_while_on_a_call', $this->queueData['recive_calls_while_on_a_call']);

        $this->selectDropdownItem('caller_hear', $this->queueData['caller_hear']);
        $this->changeCheckBoxState('announce_position', $this->queueData['announce_position']);
        $this->changeCheckBoxState('announce_hold_time', $this->queueData['announce_hold_time']);

        $this->selectDropdownItem('periodic_announce_sound_id', $this->queueData['periodic_announce_sound_id']);

        $this->changeInputField('periodic_announce_frequency', $this->queueData['periodic_announce_frequency']);
        $this->changeInputField('timeout_to_redirect_to_extension', $this->queueData['timeout_to_redirect_to_extension']);

        $this->selectDropdownItem('timeout_extension', $this->queueData['timeout_extension']);
        $this->selectDropdownItem('redirect_to_extension_if_empty', $this->queueData['redirect_to_extension_if_empty']);

        // Submit the form
        $this->submitForm('queue-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');

        // Click the modify button for the updated call queue
        $this->clickModifyButtonOnRowWithText($this->queueData['name']);

        // Assert that the settings were saved correctly
        $this->assertInputFieldValueEqual('name', $this->queueData['name']);
        $this->assertInputFieldValueEqual('extension', $this->queueData['extension']);
        $this->assertTextAreaValueIsEqual('description', $this->queueData['description']);

        // Check if all agents are in the queue
        foreach ($this->queueData['agents'] as $agent) {
            $xpath   = '//table[@id="extensionsTable"]//td[contains(text(), "' . $agent . '")]';
            $members = self::$driver->findElements(WebDriverBy::xpath($xpath));
            if (count($members) === 0) {
                $this->assertTrue(false, 'Not found agent ' . $agent . ' in queue agents list');
            }
        }
        $this->assertMenuItemSelected('strategy', $this->queueData['strategy']);

        // Expand advanced options again
        $this->openAccordionOnThePage();


        // Check advanced settings
        $this->assertInputFieldValueEqual('seconds_to_ring_each_member', $this->queueData['seconds_to_ring_each_member']);
        $this->assertInputFieldValueEqual('seconds_for_wrapup', $this->queueData['seconds_for_wrapup']);
        $this->assertCheckBoxStageIsEqual('recive_calls_while_on_a_call', $this->queueData['recive_calls_while_on_a_call']);

        $this->assertMenuItemSelected('caller_hear', $this->queueData['caller_hear']);
        $this->assertCheckBoxStageIsEqual('announce_position', $this->queueData['announce_position']);
        $this->assertCheckBoxStageIsEqual('announce_hold_time', $this->queueData['announce_hold_time']);

        $this->assertMenuItemSelected('periodic_announce_sound_id', $this->queueData['periodic_announce_sound_id']);

        $this->assertInputFieldValueEqual('periodic_announce_frequency', $this->queueData['periodic_announce_frequency']);
        $this->assertInputFieldValueEqual(
            'timeout_to_redirect_to_extension',
            $this->queueData['timeout_to_redirect_to_extension']
        );

        $this->assertMenuItemSelected('timeout_extension', $this->queueData['timeout_extension']);
        $this->assertMenuItemSelected('redirect_to_extension_if_empty', $this->queueData['redirect_to_extension_if_empty']);
    }

}
