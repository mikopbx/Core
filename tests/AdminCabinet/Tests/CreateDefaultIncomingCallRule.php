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

class CreateDefaultIncomingCallRule extends MikoPBXTestsBase
{

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testChangeDefaultRule($params):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');

        $this->selectDropdownItem('action', $params['action']);
        if ($params['action'] === 'extension'){
            $this->selectDropdownItem('extension', $params['extension']);
        }

        $this->submitForm('default-rule-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');

        //Asserts
        $this->assertMenuItemSelected('action', $params['action']);
        if ($params['action'] === 'extension'){
            $this->assertMenuItemSelected('extension', $params['extension']);
        }

    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider() :array
    {
        $params = [];
        $params[] = [[
            'action' => 'busy'
        ]];

        $params[] = [[
            'action' => 'hangup'
        ]];

        $params[] = [[
            'action' => 'extension',
            'extension'   => 202
        ]];

        return $params;
    }
}