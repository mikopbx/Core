<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class ChangeWeakPasswordTest extends MikoPBXTestsBase
{
    /**
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     *
     * @throws \Facebook\WebDriver\Exception\NoSuchElementException
     * @throws \Facebook\WebDriver\Exception\TimeoutException
     */
    public function testChangeWeakPassword(array $params): void
    {
        // Wait until password validate message will locate on page
        $xpath    = '//div[contains(@class, "password-validate")]';
        self::$driver->wait()->until(
            WebDriverExpectedCondition::presenceOfElementLocated(WebDriverBy::xpath($xpath))
        );

        self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/ssh");
        $this->changeInputField('SSHPassword', $params['SSHPassword']);
        $this->changeInputField('SSHPasswordRepeat', $params['SSHPassword']);

        self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/password");
        $this->changeInputField('WebAdminPassword', $params['WebAdminPassword']);
        $this->changeInputField('WebAdminPasswordRepeat', $params['WebAdminPassword']);

        $this->submitForm('general-settings-form');

        $this->clickSidebarMenuItemByHref("/admin-cabinet/general-settings/modify/");

        self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/ssh");
        $this->assertInputFieldValueEqual('SSHPassword', $params['SSHPassword'], true);
        $this->assertInputFieldValueEqual('SSHPasswordRepeat', $params['SSHPassword'], true);

        self::$driver->get("{$GLOBALS['SERVER_PBX']}/admin-cabinet/general-settings/modify/#/password");
        $this->assertInputFieldValueEqual('WebAdminPassword', $params['WebAdminPassword'], true);
        $this->assertInputFieldValueEqual('WebAdminPasswordRepeat', $params['WebAdminPassword'], true);

    }

    /**
     * Dataset provider
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params            = [];

        $params[] = [
            [
                'SSHPassword'            => '123456789MikoPBX#2',
                'WebAdminPassword'       => '123456789MikoPBX#2',
            ],
        ];

        return $params;
    }
}




