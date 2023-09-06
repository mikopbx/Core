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


use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class CreateOutgoingCallRules extends MikoPBXTestsBase
{
    /**
     * @depends testLogin
     */
    public function testDeleteAllRules():void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/outbound-routes/index/');
        $tableId = 'routingTable';
        $this->deleteAllRecordsOnTable($tableId);
        $xpath         = "//table[@id='{$tableId}']//a[contains(@href,'delete') and not(contains(@class,'disabled'))]";
        $this->assertElementNotFound(WebDriverBy::xpath($xpath));
    }

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testCreateOutgoingCallRule($params):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/outbound-routes/index/');
        $this->clickDeleteButtonOnRowWithText($params['rulename']);

        $this->clickButtonByHref('/admin-cabinet/outbound-routes/modify');
        $this->changeInputField('rulename', $params['rulename']);
        $this->changeTextAreaValue('note', $params['note']);
        $this->changeInputField('numberbeginswith', $params['numberbeginswith']);
        $this->changeInputField('restnumbers', $params['restnumbers']);
        $this->changeInputField('trimfrombegin', $params['trimfrombegin']);
        $this->changeInputField('prepend', $params['prepend']);

        if ( ! empty($params['providerName'])) {
            $params['providerid'] = $this->selectDropdownItemByName('providerid', $params['providerName']);
        } else {
            $this->selectDropdownItem('providerid', $params['providerid']);
        }


        $this->submitForm('outbound-route-form');
        $id = $this->getCurrentRecordID();

        $this->clickSidebarMenuItemByHref('/admin-cabinet/outbound-routes/index/');

        $this->clickModifyButtonOnRowWithID($id);
        //Asserts
        $this->assertInputFieldValueEqual('rulename', $params['rulename']);
        $this->assertTextAreaValueIsEqual('note', $params['note']);
        $this->assertInputFieldValueEqual('numberbeginswith', $params['numberbeginswith']);
        $this->assertInputFieldValueEqual('restnumbers', $params['restnumbers']);
        $this->assertInputFieldValueEqual('trimfrombegin', $params['trimfrombegin']);
        $this->assertInputFieldValueEqual('prepend', $params['prepend']);
        $this->assertMenuItemSelected('providerid', $params['providerid']);
    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {
        $params=[];
        $params[] = [[
            'rulename'=>'Local outgoing calls',
            'note' => 'Calls only at local landlines',
            'numberbeginswith' => '(7|8)',
            'restnumbers'        => '10',
            'trimfrombegin'        => '1',
            'prepend'         => '8',
            'providerid'=>'SIP-PROVIDER-34F7CCFE873B9DABD91CC8D75342CB43',
            'providerName'=>''
        ]];
        $params[] = [[
            'rulename'=>'International outgoing calls',
            'note' => 'Calls to everywhere',
            'numberbeginswith' => '00',
            'restnumbers'        => '10',
            'trimfrombegin'        => '2',
            'prepend'         => '777',
            'providerid'=>'SIP-PROVIDER-34F7CCFE873B9DABD91CC8D75342CB43',
            'providerName'=>''
        ]];

        $params[] = [[
            'rulename'=>'Outgoing calls for CTI tests 1',
            'note' => '',
            'numberbeginswith' => '',
            'restnumbers'        => '10',
            'trimfrombegin'        => '0',
            'prepend'         => '7',
            'providerid'=>'',
            'providerName' => 'Provider for CTI tests',
        ]];

        $params[] = [[
            'rulename'=>'Outgoing calls for CTI tests 2',
            'note' => '1. The client calls in the company
2. The client hears a voice message
3. The client dials any extension which exists on PBX (201, 202, 203, 2001, 2002). This setup is called "Resolve extension dialing of any extension".
4. There is waiting of 7 seconds. 
5. The client dials digit 1 from phone. The call goes to sales department. (Call queue with extension 2001).
6. The client dials digit 2 from phone. The call goes to technical support department (Call queue with extension 2002).
7. The client gathers nothing or incorrectly dials number. The repeated voice notification is lost. The client enters number again. 
8. The maximum number of attempts of input of number is equal to 5. Attempts come to the end. The call goes to number by default.',
            'numberbeginswith' => '(7|8)',
            'restnumbers'        => '10',
            'trimfrombegin'        => '0',
            'prepend'         => '',
            'providerid'=>'',
            'providerName' => 'Provider for CTI tests',
        ]];

        return $params;
    }
}