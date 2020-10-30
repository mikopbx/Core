<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Tests\AdminCabinet\Tests;


use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class FillDataTimeSettings extends MikoPBXTestsBase
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testChangeDataTimeSettings(array $params):void{

        $this->clickSidebarMenuItemByHref('/admin-cabinet/time-settings/modify/');
        $this->selectDropdownItem('PBXTimezone', $params['PBXTimezone']);
        $this->changeCheckBoxState('PBXManualTimeSettings', $params['PBXManualTimeSettings']);
        if ($params['PBXManualTimeSettings']){
            $this->changeInputField('ManualDateTime', $params['ManualDateTime']);
        } else {
            $this->changeTextAreaValue('NTPServer', $params['NTPServer']);
        }
        // Сохраняем правило
        $this->submitForm('time-settings-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/time-settings/modify/');

        $this->assertMenuItemSelected('PBXTimezone',$params['PBXTimezone']);

        if ($params['PBXManualTimeSettings']){
            // $this->assertInputFieldValueEqual('ManualDateTime', $params['ManualDateTime']);
        } else {
            $this->assertTextAreaValueIsEqual('NTPServer', $params['NTPServer']);
        }
    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [[
            'PBXTimezone' => 'Europe/Riga',
            'PBXManualTimeSettings'    => true,
            'ManualDateTime'    => '01/01/2020, 1:01:01 PM',
            'NTPServer'    => '',
        ]];
        $params[] = [[
            'PBXTimezone' => 'Europe/Riga',
            'PBXManualTimeSettings'    => false,
            'ManualDateTime'    => '',
            'NTPServer'    => 'ntp5.stratum1.ru',
        ]];
        return $params;
    }
}