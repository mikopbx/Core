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

/**
 * Class to test the filling and changing of date and time settings in the admin cabinet.
 */
class FillDataTimeSettingsTest extends MikoPBXTestsBase
{
    /**
     * Test the change of date and time settings.
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the test.
     */
    public function testChangeDataTimeSettings(array $params): void
    {
        $this->setSessionName("Test: Fill date time settings");

        $this->clickSidebarMenuItemByHref('/admin-cabinet/time-settings/modify/');
        $this->selectDropdownItem('PBXTimezone', $params['PBXTimezone']);
        $this->changeCheckBoxState('PBXManualTimeSettings', $params['PBXManualTimeSettings']);

        if ($params['PBXManualTimeSettings']) {
            $this->changeInputField('ManualDateTime', $params['ManualDateTime']);
        } else {
            $this->changeTextAreaValue('NTPServer', $params['NTPServer']);
        }

        // Save the settings
        $this->submitForm('time-settings-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/time-settings/modify/');

        $this->assertMenuItemSelected('PBXTimezone', $params['PBXTimezone']);

        if ($params['PBXManualTimeSettings']) {
            // $this->assertInputFieldValueEqual('ManualDateTime', $params['ManualDateTime']);
        } else {
            $this->assertTextAreaValueIsEqual('NTPServer', $params['NTPServer']);
        }
    }

    /**
     * Dataset provider for date and time settings.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [
            [
                'PBXTimezone' => 'Europe/Riga',
                'PBXManualTimeSettings' => true,
                'ManualDateTime' => '01/01/2020, 1:01:01 PM',
                'NTPServer' => '',
            ],
        ];
        $params[] = [
            [
                'PBXTimezone' => 'Europe/Riga',
                'PBXManualTimeSettings' => false,
                'ManualDateTime' => '',
                'NTPServer' => '0.pool.ntp.org',
            ],
        ];
        return $params;
    }
}