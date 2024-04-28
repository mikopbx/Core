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
 * Class CreateDefaultIncomingCallRule
 *
 * This class contains tests for changing the default incoming call rule.
 */
class CreateDefaultIncomingCallRule extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Changing incoming routes rule (by default)");
    }

    /**
     * Test changing the default incoming call rule.
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the default rule.
     */
    public function testChangeDefaultRule(array $params): void
    {
        // Navigate to the incoming routes page
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');

        // Select the specified action from the dropdown
        $this->selectDropdownItem('action', $params['action']);

        // If the action is 'extension', select the extension from the dropdown
        if ($params['action'] === 'extension') {
            $this->selectDropdownItem('extension', $params['extension']);
        }

        // Submit the form to change the default rule
        $this->submitForm('default-rule-form');

        // Navigate back to the incoming routes page
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');

        // Assert that the selected action matches the expected action
        $this->assertMenuItemSelected('action', $params['action']);

        // If the action is 'extension', assert that the selected extension matches the expected extension
        if ($params['action'] === 'extension') {
            $this->assertMenuItemSelected('extension', $params['extension']);
        }
    }

    /**
     * Dataset provider for default rule parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [
            [
                'action' => 'busy',
            ]
        ];

        $params[] = [
            [
                'action' => 'hangup',
            ]
        ];

        $params[] = [
            [
                'action' => 'extension',
                'extension' => 202,
            ]
        ];

        return $params;
    }
}
