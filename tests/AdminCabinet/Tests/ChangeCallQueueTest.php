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
 * Class ChangeCallQueueTest
 * This class contains test cases related to changing call queue settings.
 *
 * @package MikoPBX\Tests\AdminCabinet\Lib
 */
class ChangeCallQueueTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Change parameters of the existing call queue");
    }

    /**
     * Test changing call queue extension settings.
     *
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the test case.
     */
    public function testChangeCallQueueExtension(array $params): void
    {

        // Click on the call queue menu item in the sidebar
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');

        // Click the modify button for the call queue with the specified extension
        $this->clickModifyButtonOnRowWithText($params['OldExtension']);

        // Change the description and name of the call queue
        $this->changeTextAreaValue('description', $params['description']);
        $this->changeInputField('name', $params['name']);

        // Delete existing agents from the call queue
        $xpath         = ('//tr[@class="member-row"]//div[contains(@class,"delete-row-button")]');
        $deleteButtons = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($deleteButtons as $deleteButton) {
            $deleteButton->click();
            sleep(2);
        }

        // Add new agents to the call queue
        foreach ($params['agents'] as $agent) {
            $this->selectDropdownItem('extensionselect', $agent);
        }

        // Select the call queue strategy
        $this->selectDropdownItem('strategy', $params['strategy']);

        // Expand advanced options
        $this->openAccordionOnThePage();

        // Set various call queue settings
        $this->changeInputField('extension', $params['extension']);
        $this->changeInputField('seconds_to_ring_each_member', $params['seconds_to_ring_each_member']);
        $this->changeInputField('seconds_for_wrapup', $params['seconds_for_wrapup']);
        $this->changeCheckBoxState('recive_calls_while_on_a_call', $params['recive_calls_while_on_a_call']);

        $this->selectDropdownItem('caller_hear', $params['caller_hear']);
        $this->changeCheckBoxState('announce_position', $params['announce_position']);
        $this->changeCheckBoxState('announce_hold_time', $params['announce_hold_time']);

        $this->selectDropdownItem('periodic_announce_sound_id', $params['periodic_announce_sound_id']);

        $this->changeInputField('periodic_announce_frequency', $params['periodic_announce_frequency']);
        $this->changeInputField('timeout_to_redirect_to_extension', $params['timeout_to_redirect_to_extension']);

        $this->selectDropdownItem('timeout_extension', $params['timeout_extension']);
        $this->selectDropdownItem('redirect_to_extension_if_empty', $params['redirect_to_extension_if_empty']);

        // Submit the form
        $this->submitForm('queue-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');

        // Click the modify button for the updated call queue
        $this->clickModifyButtonOnRowWithText($params['name']);

        // Assert that the settings were saved correctly
        $this->assertInputFieldValueEqual('name', $params['name']);
        $this->assertInputFieldValueEqual('extension', $params['extension']);
        $this->assertTextAreaValueIsEqual('description', $params['description']);

        // Check if all agents are in the queue
        foreach ($params['agents'] as $agent) {
            $xpath   = '//table[@id="extensionsTable"]//td[contains(text(), "' . $agent . '")]';
            $members = self::$driver->findElements(WebDriverBy::xpath($xpath));
            if (count($members) === 0) {
                $this->assertTrue(false, 'Not found agent ' . $agent . ' in queue agents list');
            }
        }
        $this->assertMenuItemSelected('strategy', $params['strategy']);

        // Expand advanced options again
        $this->openAccordionOnThePage();


        // Check advanced settings
        $this->assertInputFieldValueEqual('seconds_to_ring_each_member', $params['seconds_to_ring_each_member']);
        $this->assertInputFieldValueEqual('seconds_for_wrapup', $params['seconds_for_wrapup']);
        $this->assertCheckBoxStageIsEqual('recive_calls_while_on_a_call', $params['recive_calls_while_on_a_call']);

        $this->assertMenuItemSelected('caller_hear', $params['caller_hear']);
        $this->assertCheckBoxStageIsEqual('announce_position', $params['announce_position']);
        $this->assertCheckBoxStageIsEqual('announce_hold_time', $params['announce_hold_time']);

        $this->assertMenuItemSelected('periodic_announce_sound_id', $params['periodic_announce_sound_id']);

        $this->assertInputFieldValueEqual('periodic_announce_frequency', $params['periodic_announce_frequency']);
        $this->assertInputFieldValueEqual(
            'timeout_to_redirect_to_extension',
            $params['timeout_to_redirect_to_extension']
        );

        $this->assertMenuItemSelected('timeout_extension', $params['timeout_extension']);
        $this->assertMenuItemSelected('redirect_to_extension_if_empty', $params['redirect_to_extension_if_empty']);
    }

    /**
     * Dataset provider for the test case.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params   = [];
        $params['Sales department2 <20025>'] = [
            [
                'description'                      => 'Sales department queue, the first line of agents2',
                'name'                             => 'Sales department2',
                'OldExtension'                     => 20020,
                'extension'                        => 20025,
                'seconds_to_ring_each_member'      => 15,
                'seconds_for_wrapup'               => 14,
                'recive_calls_while_on_a_call'     => false,
                'caller_hear'                      => 'moh',
                'announce_position'                => false,
                'announce_hold_time'               => true,
                'periodic_announce_sound_id'       => '1',
                'periodic_announce_frequency'      => 25,
                'timeout_to_redirect_to_extension' => 19,
                'timeout_extension'                => '202',
                'redirect_to_extension_if_empty'   => '201',
                'agents'                           => [
                    '202',
                    '203',
                ],
                'strategy'                         => 'random',
            ],
        ];

        return $params;
    }
}