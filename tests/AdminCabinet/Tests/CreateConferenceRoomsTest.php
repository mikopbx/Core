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
class CreateConferenceRoomsTest extends MikoPBXTestsBase
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
     *
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the conference room.
     */
    public function testAddConference(array $params): void
    {
        // Navigate to the conference rooms page and delete any existing rooms with the same name
        $this->clickSidebarMenuItemByHref('/admin-cabinet/conference-rooms/index/');
        $this->clickDeleteButtonOnRowWithText($params['name']);

        // Click the "Modify" button to add a new conference room
        $this->clickButtonByHref('/admin-cabinet/conference-rooms/modify');

        // Set the extension and name for the conference room
        $this->changeInputField('extension', $params['extension']);
        $this->changeInputField('name', $params['name']);

        // Save the conference room
        $this->submitForm('conference-room-form');

        // Navigate back to the conference rooms page
        $this->clickSidebarMenuItemByHref('/admin-cabinet/conference-rooms/index/');

        // Click the "Modify" button on the newly added conference room
        $this->clickModifyButtonOnRowWithText($params['name']);

        // Verify that the name and extension fields match the expected values
        $this->assertInputFieldValueEqual('name', $params['name']);
        $this->assertInputFieldValueEqual('extension', $params['extension']);
    }

    /**
     * Dataset provider for conference room parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['The first conference room <11112>'] = [
            [
                'name' => 'The first conference room',
                'extension' => '11112',
            ]
        ];
        $params['The second conference room <11113>'] = [
            [
                'name' => 'The second conference room',
                'extension' => '11113',
            ]
        ];
        $params['The third conference room <11114>'] = [
            [
                'name' => 'The third conference room',
                'extension' => '11114',
            ]
        ];

        return $params;
    }
}