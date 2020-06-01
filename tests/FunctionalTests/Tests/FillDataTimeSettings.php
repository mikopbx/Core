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
            self::$driver->executeScript("$('div#CalendarBlock div.input.calendar').calendar('set startDate', new Date())");
        } else {
            $this->changeInputField('SetNtpServerBlock', $params['SetNtpServerBlock']);
        }
        // Сохраняем правило
        $this->submitForm('time-settings-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/time-settings/modify/');

        $this->assertMenuItemSelected('PBXTimezone',$params['PBXTimezone']);

        if ($params['PBXManualTimeSettings']){
            $setupDate = self::$driver->executeScript("$('div#CalendarBlock div.input.calendar').calendar('get date')");
        } else {
            $this->assertInputFieldValueEqual('SetNtpServerBlock', $params['SetNtpServerBlock']);
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
            'PBXManualTimeSettings'    => false,
            'CurrentDateTime'    => '',
            'SetNtpServerBlock'    => 'ntp5.stratum1.ru',
        ]];
        $params[] = [[
            'PBXTimezone' => 'Europe/Riga',
            'PBXManualTimeSettings'    => true,
            'CurrentDateTime'    => '',
            'SetNtpServerBlock'    => '',
        ]];
        return $params;
    }
}