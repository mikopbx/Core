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
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase as MikoPBXTestsBaseAlias;

/**
 * Class CreateCallQueue
 *
 * This class contains tests for creating and managing call queues.
 */
class CreateCallQueueTest extends MikoPBXTestsBaseAlias
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
        $this->setSessionName("Test: Creating Call queues");
    }

    /**
     * Test creating a call queue.
     *
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the call queue.
     */
    public function testCreateCallQueue(array $params): void
    {
        // Navigate to the call queues page and delete any existing queues with the same name
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');
        $this->clickDeleteButtonOnRowWithText($params['name']);

        // Click the "Modify" button to create a new call queue
        $this->clickButtonByHref('/admin-cabinet/call-queues/modify');

        // Set the unique ID using JavaScript to ensure consistency across builds
        self::$driver->executeScript(
            "$('#queue-form').form('set value','uniqid','{$params['uniqid']}');"
        );

        // Fill in basic information for the call queue
        $this->changeTextAreaValue('description', $params['description']);
        $this->changeInputField('name', $params['name']);

        // Add agents to the queue
        foreach ($params['agents'] as $agent) {
            $this->selectDropdownItem('extensionselect', $agent);
        }

        $this->selectDropdownItem('strategy', $params['strategy']);

        // Expand advanced options
        $this->openAccordionOnThePage();

        // Fill in advanced options from the database with initial data
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

        // Submit the form to create the call queue
        $this->submitForm('queue-form');

        // Navigate back to the call queues page
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');

        // Click the "Modify" button on the newly created call queue
        $this->clickModifyButtonOnRowWithText($params['name']);

        // Verify that the name input field matches the expected name
        $this->assertInputFieldValueEqual('name', $params['name']);
        $this->assertInputFieldValueEqual('extension', $params['extension']);
        $this->assertTextAreaValueIsEqual('description', $params['description']);

        // Check that all agents in the queue are present
        foreach ($params['agents'] as $agent) {
            $xpath = '//table[@id="extensionsTable"]//td[contains(text(), "'.$agent.'")]';
            $members = self::$driver->findElements(WebDriverBy::xpath($xpath));
            if (count($members) === 0) {
                $this->assertTrue(false, 'Not found agent '.$agent.' in queue agents list');
            }
        }

        // Check that selected strategy matches
        $this->assertMenuItemSelected('strategy', $params['strategy']);

        // Expand advanced options
        $this->openAccordionOnThePage();

        // Check that advanced option fields match expected values
        $this->assertInputFieldValueEqual('seconds_to_ring_each_member', $params['seconds_to_ring_each_member']);
        $this->assertInputFieldValueEqual('seconds_for_wrapup', $params['seconds_for_wrapup']);
        $this->assertCheckBoxStageIsEqual('recive_calls_while_on_a_call', $params['recive_calls_while_on_a_call']);

        $this->assertMenuItemSelected('caller_hear', $params['caller_hear']);
        $this->assertCheckBoxStageIsEqual('announce_position', $params['announce_position']);
        $this->assertCheckBoxStageIsEqual('announce_hold_time', $params['announce_hold_time']);

        $this->assertMenuItemSelected('periodic_announce_sound_id', $params['periodic_announce_sound_id']);

        $this->assertInputFieldValueEqual('periodic_announce_frequency', $params['periodic_announce_frequency']);
        $this->assertInputFieldValueEqual('timeout_to_redirect_to_extension', $params['timeout_to_redirect_to_extension']);

        $this->assertMenuItemSelected('timeout_extension', $params['timeout_extension']);
        $this->assertMenuItemSelected('redirect_to_extension_if_empty', $params['redirect_to_extension_if_empty']);
    }

    /**
     * Dataset provider for call queue parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['Sales department <20020>'] = [
            [
                'description' => 'Sales department queue, the first line of agents',
                'name' => 'Sales department',
                'uniqid' => 'QUEUE-AFDE5973B8115C2B9743C68BF51BFD26',
                'extension' => 20020,
                'seconds_to_ring_each_member' => 14,
                'seconds_for_wrapup' => 12,
                'recive_calls_while_on_a_call' => true,
                'caller_hear' => 'ringing',
                'announce_position' => true,
                'announce_hold_time' => false,
                'periodic_announce_sound_id' => '2',
                'periodic_announce_frequency' => 24,
                'timeout_to_redirect_to_extension' => 18,
                'timeout_extension' => '201',
                'redirect_to_extension_if_empty' => '202',
                'agents' => [
                    '201',
                    '202',
                    '203',
                ],
                'strategy' => 'linear'
            ]
        ];
        $params['Accountant department <20021>'] = [
            [
                'description' => 'Accountant department queue, the second line of agents',
                'name' => 'Accountant department',
                'uniqid' => 'QUEUE-C02B7C0BBE8F0A48DE1CDF21DBADC25',
                'extension' => 20021,
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
            ]
        ];

        return $params;
    }
}
