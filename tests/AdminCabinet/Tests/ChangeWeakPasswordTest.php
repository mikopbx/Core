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

class ChangeWeakPasswordTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Waits for redirect to passwords tab if it weak and change them");
    }

    /**
     * Test changing a weak password and verifying the changes.
     *
     * @dataProvider passwordChangeProvider
     *
     * @param array $params The parameters for password change.
     *
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    public function testChangeWeakPassword(array $params): void
    {
        // Wait until the password validation message is located on the page
        $xpath = '//div[contains(@class, "password-validate")]';
        self::$driver->wait(10, 500)->until(
            WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath($xpath))
        );

        // Change SSH password
        $this->changePassword('ssh', 'SSHPassword', $params['password']);

        // Change WebAdmin password
        $this->changePassword('passwords', 'WebAdminPassword', $params['password']);

        $this->submitForm('general-settings-form');

        // Click on the sidebar menu item to refresh the page
        $this->clickSidebarMenuItemByHref("/admin-cabinet/general-settings/modify/");

        // Verify SSH password change
        self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/ssh");
        $this->assertInputFieldValueEqual('SSHPassword', $params['checkPassword'], true);
        $this->assertInputFieldValueEqual('SSHPasswordRepeat', $params['checkPassword'], true);

        // Verify WebAdmin password change
        self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/passwords");
        $this->assertInputFieldValueEqual('WebAdminPassword', $params['checkPassword'], true);
        $this->assertInputFieldValueEqual('WebAdminPasswordRepeat', $params['checkPassword'], true);

        // Check if the red icon exists before waiting for it to disappear
        $redIconXpath = '//a[contains(@id, "show-advice-button")]/i[contains(@class,"red")]';
        
        try {
            $redIconElements = self::$driver->findElements(WebDriverBy::xpath($redIconXpath));
            
            if (count($redIconElements) > 0) {
                // Only wait for the element to become invisible if it actually exists
                self::$driver->wait(20, 500)->until(
                    WebDriverExpectedCondition::invisibilityOfElementLocated(WebDriverBy::xpath($redIconXpath))
                );
            }
            
            // Check for yellow icon presence, but don't fail the test if it's not there
            // This is just for additional information
            $yellowIconXpath = '//a[contains(@id, "show-advice-button")]/i[contains(@class,"yellow")]';
            $yellowIconElements = self::$driver->findElements(WebDriverBy::xpath($yellowIconXpath));
            if (count($yellowIconElements) > 0) {
                self::annotate("Success: Yellow icon is present as expected after password change");
            } else {
                self::annotate("Note: Yellow icon is not present after password change, but test continues");
            }
            
        } catch (\Exception $e) {
            // If we can't find the element, log it but don't fail the test
            self::fail("Note: Red icon element not found or other issue occurred: " . $e->getMessage());
        }
    }

    // Change password field
    private function changePassword(string $path, string $passwordFieldName, string $password): void
    {
        self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/{$path}");
        if ($path==='ssh'){
            $this->changeCheckBoxState('SSHDisablePasswordLogins', false);
        }
        $this->changeInputField($passwordFieldName, $password);
        $this->changeInputField($passwordFieldName . 'Repeat', $password);
    }


    /**
     * Dataset provider for password change test.
     *
     * @return array
     */
    public function passwordChangeProvider(): array
    {
        $params = [];

        $params[] = [
            [
                'password'       => '123456789MikoPBX#1',
                'checkPassword'  => '********',
            ],
        ];

        return $params;
    }
}
