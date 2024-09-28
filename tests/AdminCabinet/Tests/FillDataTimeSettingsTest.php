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

use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Class to test the filling and changing of date and time settings in the admin cabinet.
 */
class FillDataTimeSettingsTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Fill date time settings");
    }

    /**
     * Test the change of date and time settings.
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for the test.
     */
    public function testChangeDataTimeSettings(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/time-settings/modify/');
        $this->selectDropdownItem(PbxSettings::PBX_TIMEZONE, $params[PbxSettings::PBX_TIMEZONE]);
        $this->changeCheckBoxState(PbxSettings::PBX_MANUAL_TIME_SETTINGS, $params[PbxSettings::PBX_MANUAL_TIME_SETTINGS]);
        sleep(2);
        if ($params[PbxSettings::PBX_MANUAL_TIME_SETTINGS]) {
            $this->changeInputField('ManualDateTime', $params['ManualDateTime']);
        } else {
            $this->changeTextAreaValue(PbxSettings::NTP_SERVER, $params['NTPServer']);
        }

        // Save the settings
        $this->submitForm('time-settings-form');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/time-settings/modify/');

        $this->assertMenuItemSelected(PbxSettings::PBX_TIMEZONE, $params['PBXTimezone']);

        if ($params[PbxSettings::PBX_MANUAL_TIME_SETTINGS]) {
            // $this->assertInputFieldValueEqual('ManualDateTime', $params['ManualDateTime']);
        } else {
            $this->assertTextAreaValueIsEqual(PbxSettings::NTP_SERVER, $params['NTPServer']);
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
                PbxSettings::PBX_TIMEZONE => 'Europe/Riga',
                PbxSettings::PBX_MANUAL_TIME_SETTINGS => true,
                'ManualDateTime' => date('d/m/Y, h:i:s A', strtotime('+2 hours')),
                PbxSettings::NTP_SERVER => '',
            ],
        ];
        $params[] = [
            [
                PbxSettings::PBX_TIMEZONE => 'Europe/Riga',
                PbxSettings::PBX_MANUAL_TIME_SETTINGS => false,
                'ManualDateTime' => '',
                PbxSettings::NTP_SERVER => '0.pool.ntp.org',
            ],
        ];
        return $params;
    }
}