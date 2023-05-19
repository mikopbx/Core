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

class CreateConferenceRoomsTest extends MikoPBXTestsBase
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testAddConference(array $params):void{

        $this->clickSidebarMenuItemByHref('/admin-cabinet/conference-rooms/index/');
        $this->clickDeleteButtonOnRowWithText($params['name']);

        $this->clickButtonByHref('/admin-cabinet/conference-rooms/modify');
        $this->changeInputField('name', $params['name']);
        $this->changeInputField('extension', $params['extension']);

        // Сохраняем конференцию
        $this->submitForm('conference-room-form');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/conference-rooms/index/');
        $this->clickModifyButtonOnRowWithText($params['name']);
        $this->assertInputFieldValueEqual('name', $params['name']);
        $this->assertInputFieldValueEqual('extension', $params['extension']);
    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [[
            'name' => 'The first conference room',
            'extension'    => '11112',
        ]];
        $params[] = [[
            'name' => 'The second conference room',
            'extension'    => '11113',
        ]];
        $params[] = [[
            'name' => 'The third conference room',
            'extension'    => '11114',
        ]];


        return $params;
    }

}