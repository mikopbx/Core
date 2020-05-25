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
     * @param array $conferenceRecord
     */
    public function testAddConference(array $conferenceRecord):void{

        $this->clickSidebarMenuItemByHref('/admin-cabinet/conference-rooms/index/');
        $this->clickDeleteButtonOnRowWithText($conferenceRecord['name']);

        $this->clickAddNewButtonByHref('/admin-cabinet/conference-rooms/modify');
        $this->changeInputField('name', $conferenceRecord['name']);
        $this->changeInputField('extension', $conferenceRecord['extension']);

        // Сохраняем конференцию
        $this->submitForm('conference-room-form');

        $this->clickModifyButtonOnRowWithText($conferenceRecord['name']);
        $this->assertInputFieldValueEqual('name', $conferenceRecord['name']);
        $this->assertInputFieldValueEqual('extension', $conferenceRecord['extension']);
    }


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