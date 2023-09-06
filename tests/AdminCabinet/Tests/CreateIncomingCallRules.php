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
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class CreateIncomingCallRules extends MikoPBXTestsBase
{
    /**
     * @depends testLogin
     */
    public function testDeleteCallRules(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $tableId = 'routingTable';
        $this->deleteAllRecordsOnTable($tableId);
        $xpath = "//table[@id='{$tableId}']//a[contains(@href,'delete') and not(contains(@class,'disabled'))]";
        $this->assertElementNotFound(WebDriverBy::xpath($xpath));
    }

    /**
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testCreateIncomingCallRule($params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickDeleteButtonOnRowWithText($params['note']);

        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');
        $this->changeTextAreaValue('note', $params['note']);
        if ( ! empty($params['providerName'])) {
            $params['provider'] = $this->selectDropdownItemByName('provider', $params['providerName']);
        } else {
            $this->selectDropdownItem('provider', $params['provider']);
        }
        $this->changeInputField('number', $params['number']);
        $this->selectDropdownItem('extension', $params['extension']);
        $this->changeInputField('timeout', $params['timeout']);


        $this->submitForm('incoming-route-form');

        //Remember ID
        $id = $this->getCurrentRecordID();
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        $this->clickModifyButtonOnRowWithID($id);

        //Asserts
        $this->assertTextAreaValueIsEqual('note', $params['note']);
        $this->assertMenuItemSelected('provider', $params['provider']);
        $this->assertInputFieldValueEqual('number', $params['number']);
        $this->assertMenuItemSelected('extension', $params['extension']);
        $this->assertInputFieldValueEqual('timeout', $params['timeout']);
    }

    /**
     * Dataset provider
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params   = [];
        $params[] = [
            [
                'note'         => 'First rule',
                'provider'     => 'none',
                'providerName' => '',
                'number'       => 74952293042,
                'extension'    => 201,
                'timeout'      => 14,
            ],
        ];

        $params[] = [
            [
                'note'         => 'Second rule',
                'provider'     => 'SIP-PROVIDER-34F7CCFE873B9DABD91CC8D75342CB43',
                'providerName' => '',
                'number'       => 74952293043,
                'extension'    => 202,
                'timeout'      => 16,
            ],
        ];

        $params[] = [
            [
                'note'         => 'Rule for test provider',
                'provider'     => '',
                'providerName' => 'Provider for CTI tests',
                'number'       => '',
                'extension'    => 202,
                'timeout'      => 50,
            ],
        ];

        return $params;
    }
}