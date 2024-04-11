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
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

/**
 * Class to test the creation and modification of incoming call rules in the admin cabinet.
 */
class CreateIncomingCallRules extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Create and delete incoming routes");
    }

    /**
     * Test the deletion of all incoming call rules.
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
     * Test the creation and modification of incoming call rules.
     *
     * @depends      testDeleteCallRules
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for creating the incoming call rule.
     */
    public function testCreateIncomingCallRule(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/incoming-routes/index/');
        //$this->clickDeleteButtonOnRowWithText($params['note']);

        $this->clickButtonByHref('/admin-cabinet/incoming-routes/modify');
        $this->changeTextAreaValue('note', $params['note']);
        if (!empty($params['providerName'])) {
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
     * Dataset provider for incoming call rule creation parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['First rule'] = [
            [
                'rulename' => 'First rule',
                'note' => '',
                'provider' => 'none',
                'providerName' => '',
                'number' => 74952293042,
                'extension' => 201,
                'timeout' => 14,
            ],
        ];

        $params['Second rule'] = [
            [
                'rulename' => 'Second rule',
                'note' => '',
                'provider' => 'SIP-PROVIDER-34F7CCFE873B9DABD91CC8D75342CB43',
                'providerName' => '',
                'number' => 74952293043,
                'extension' => 202,
                'timeout' => 16,
            ],
        ];

        $params['Rule for test provider'] = [
            [
                'rulename' => 'Rule for test provider',
                'note' => '1. The client calls in the company
2. The client hears a voice message
3. The client dials any extension which exists on PBX (201, 202, 203, 2001, 2002). This setup is called "Resolve extension dialing of any extension".
4. There is waiting of 7 seconds. 
5. The client dials digit 1 from phone. The call goes to sales department. (Call queue with extension 2001).
6. The client dials digit 2 from phone. The call goes to technical support department (Call queue with extension 2002).
7. The client gathers nothing or incorrectly dials number. The repeated voice notification is lost. The client enters number again. 
8. The maximum number of attempts of input of number is equal to 5. Attempts come to the end. The call goes to number by default.',
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