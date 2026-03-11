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
use Facebook\WebDriver\WebDriverExpectedCondition;
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Class CreateDefaultIncomingCallRule
 *
 * This class contains tests for changing the default incoming call rule.
 */
class CreateDefaultIncomingCallRuleTest extends MikoPBXTestsBase
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
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the default rule.
     */
    public function testChangeDefaultRule(array $params): void
    {
        // Navigate to the incoming routes page
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');

        // Wait for async data loading to complete.
        // The extension dropdown is created by ExtensionSelector.init() inside the loadData() callback.
        // Without this wait, a race condition can occur: the test interacts with dropdowns (enabling
        // the submit button), then loadData() callback fires and re-disables it via initializeDirrity(),
        // causing submitForm() to fail because Fomantic UI applies pointer-events:none to disabled buttons.
        self::$driver->wait(self::WAIT_TIMEOUT)->until(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::id('extension-dropdown')
            )
        );

        // First set a different value to ensure the form becomes dirty,
        // in case the current values already match the target
        $this->selectDropdownItem('action', 'hangup');
        usleep(500000);

        // Now select the specified action from the dropdown
        $this->selectDropdownItem('action', $params['action']);

        // If the action is 'extension', select the extension from the dropdown
        if ($params['action'] === 'extension') {
            $this->selectDropdownItem('extension', $params['extension']);
        }

        // Submit the form to change the default rule
        $this->submitForm('default-rule-form');

        // Navigate back to the incoming routes page
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');

        // Wait for async data loading before assertions
        self::$driver->wait(self::WAIT_TIMEOUT)->until(
            WebDriverExpectedCondition::presenceOfElementLocated(
                WebDriverBy::id('extension-dropdown')
            )
        );

        // Assert that the selected action matches the expected action
        $this->assertMenuItemSelected('action', $params['action']);

        // If the action is 'extension', assert that the selected extension matches the expected extension
        if ($params['action'] === 'extension') {
            $this->assertMenuItemSelected('extension', $params['extension']);
        }

        $this->assertTrue(true);
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
                'action' => 'extension',
                'extension' => 'busy',
            ]
        ];

        $params[] = [
            [
                'action' => 'extension',
                'extension' => 'hangup',
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
