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

use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Class CreateConferenceRoomsTest
 *
 * This class contains tests for adding conference rooms.
 */
abstract class CreateConferenceRoomsTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Creating conferences");
    }
    /**
     * Test adding a conference room.
     */
    public function testCreateConferenceRoom(): void
    {
        $this->createConferenceRoom($this->getConferenceRoomData());
    }

    /**
     * Get conference room test data
     * Must be implemented by child classes
     *
     * @return array
     */
    abstract protected function getConferenceRoomData(): array;

    /**
     * Create a conference room with given parameters
     *
     * @param array $params The parameters for the conference room.
     */
    protected function createConferenceRoom(array $params): void
    {
        // Navigate to the conference rooms page and delete any existing rooms with the same name
        $this->clickSidebarMenuItemByHref('/admin-cabinet/conference-rooms/index/');
    
        $this->clickDeleteButtonOnRowWithText($params['name']);

        // Click the "Modify" button to add a new conference room
        $this->clickButtonByHref('/admin-cabinet/conference-rooms/modify');

        // Set the extension and name for the conference room
        $this->changeInputField('extension', $params['extension']);
        $this->changeInputField('name', $params['name']);
        
        // Set PIN code if provided
        if (isset($params['pinCode'])) {
            $this->changeInputField('pinCode', $params['pinCode']);
        }

        // Save the conference room
        $this->submitForm('conference-room-form');

        // Navigate back to the conference rooms page
        $this->clickSidebarMenuItemByHref('/admin-cabinet/conference-rooms/index/');

        // Click the "Modify" button on the newly added conference room
        $this->clickModifyButtonOnRowWithText($params['name']);

        // Verify that the name and extension fields match the expected values
        $this->assertInputFieldValueEqual('name', $params['name']);
        $this->assertInputFieldValueEqual('extension', $params['extension']);
        
        // Verify PIN code if it was set
        if (isset($params['pinCode'])) {
            $this->assertInputFieldValueEqual('pinCode', $params['pinCode']);
        }
    }
}