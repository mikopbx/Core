<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\FunctionalTests\Tests;


use MikoPBX\FunctionalTests\Lib\MikoPBXTestsBase;

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