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


use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class CreateFail2BanRules extends MikoPBXTestsBase
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testRule(array $params):void{

        $this->clickSidebarMenuItemByHref('/admin-cabinet/fail2-ban/index/');

        $this->changeInputField('maxretry', '');
        $this->changeInputField('findtime', '');
        $this->changeInputField('bantime', '');
        $this->changeTextAreaValue('whitelist', '');
        $this->submitForm('fail2ban-settings-form');

        $this->changeInputField('maxretry', $params['maxretry']);
        $this->changeInputField('findtime', $params['findtime']);
        $this->changeInputField('bantime', $params['bantime']);
        $this->changeTextAreaValue('whitelist', $params['whitelist']);

        // Сохраняем правило
        $this->submitForm('fail2ban-settings-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/fail2-ban/index/');

        $this->assertInputFieldValueEqual('maxretry', $params['maxretry']);
        $this->assertInputFieldValueEqual('findtime', $params['findtime']);
        $this->assertInputFieldValueEqual('bantime', $params['bantime']);
        $this->assertTextAreaValueIsEqual('whitelist', $params['whitelist']);
    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [[
            'maxretry' => '5',
            'findtime'    => '1800',
            'bantime'    => '86400',
            'whitelist'    => '93.188.40.99 80.90.117.7 149.11.34.27 149.11.44.91 69.167.178.98 192.99.200.177 38.88.16.66 38.88.16.70 38.88.16.74 38.88.16.78 38.88.16.82 38.88.16.86 38.88.16.90 38.88.16.94 188.120.235.64',
        ]];
        return $params;
    }
}