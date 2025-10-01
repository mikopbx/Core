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

use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Base class for Call Queue creation tests
 */
abstract class CreateCallQueueTest extends MikoPBXTestsBase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: Create Call Queue - " . $this->getCallQueueData()['name']);
    }

    /**
     * Get Call Queue data
     */
    abstract protected function getCallQueueData(): array;

    /**
     * Test creating Call Queue
     */
    public function testCreateCallQueue(): void
    {
        $params = $this->getCallQueueData();
        self::annotate("Creating Call Queue: {$params['name']}");

        try {
            $this->createCallQueue($params);
            $this->verifyCallQueue($params);
            self::annotate("Successfully created Call Queue: {$params['name']}", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to create Call Queue: {$params['name']}", 'error');
            throw $e;
        }
    }

    /**
     * Create Call Queue
     */
    public function createCallQueue(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');
      
        $this->clickDeleteButtonOnRowWithText($params['name']);
       
        $this->clickButtonByHref('/admin-cabinet/call-queues/modify');

        $this->fillBasicFields($params);
        $this->fillAdvancedOptions($params);
        $this->addAgents($params['agents']);

        $this->submitForm('queue-form');
        $this->waitForAjax();
    }

    /**
     * Fill basic fields
     */
    protected function fillBasicFields(array $params): void
    {
        self::$driver->executeScript(
            "$('#queue-form').form('set value','uniqid','{$params['uniqid']}');"
        );

        $this->changeTextAreaValue('description', $params['description']);
        $this->changeInputField('extension', $params['extension']);
        $this->changeInputField('name', $params['name']);
        $this->selectDropdownItem('strategy', $params['strategy']);
    }

    /**
     * Add agents to queue
     */
    protected function addAgents(array $agents): void
    {
        foreach ($agents as $agent) {
            $this->selectDropdownItem('extensionselect', $agent);
        }
    }

    /**
     * Fill advanced options
     */
    protected function fillAdvancedOptions(array $params): void
    {
        $this->openAccordionOnThePage();

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
    }

    /**
     * Verify Call Queue creation
     */
    protected function verifyCallQueue(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');
        $this->clickModifyButtonOnRowWithText($params['name']);

        $this->verifyBasicFields($params);
        $this->verifyAgents($params['agents']);
        $this->verifyAdvancedOptions($params);
    }

    /**
     * Verify basic fields
     */
    protected function verifyBasicFields(array $params): void
    {
        $this->assertInputFieldValueEqual('name', $params['name']);
        $this->assertInputFieldValueEqual('extension', $params['extension']);
        $this->assertTextAreaValueIsEqual('description', $params['description']);
        $this->assertMenuItemSelected('strategy', $params['strategy']);
    }

    /**
     * Verify agents
     */
    protected function verifyAgents(array $agents): void
    {
        foreach ($agents as $agent) {
            $xpath = '//table[@id="extensionsTable"]//td[contains(text(), "' . $agent . '")]';
            $members = self::$driver->findElements(WebDriverBy::xpath($xpath));
            if (count($members) === 0) {
                $this->fail('Not found agent ' . $agent . ' in queue agents list');
            }
        }
    }

    /**
     * Verify advanced options
     */
    protected function verifyAdvancedOptions(array $params): void
    {
        $this->openAccordionOnThePage();

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
}
