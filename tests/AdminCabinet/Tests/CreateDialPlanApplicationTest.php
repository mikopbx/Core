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

class CreateDialPlanApplicationTest extends MikoPBXTestsBase
{

    /**
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param $params
     */
    public function testCreateNewApplication($params): void
    {
        $this->clickSidebarMenuItemByHref("/admin-cabinet/dialplan-applications/index/");
        $this->clickDeleteButtonOnRowWithText($params['extension']);

        $this->clickButtonByHref('/admin-cabinet/dialplan-applications/modify');

        // Fix uniqid to compare reference data in /etc folder for every build
        self::$driver->executeScript(
            "$('#dialplan-application-form').form('set value','uniqid','{$params['uniqid']}');"
        );
        $this->changeInputField('name', $params['name']);
        $this->changeTextAreaValue('description', $params['description']);
        $this->changeInputField('extension', $params['extension']);
        $this->selectDropdownItem('type', $params['type']);

        $this->changeTabOnCurrentPage('code');
        $textAreaACEContent = self::$driver->findElement(WebDriverBy::xpath('id("application-code")//textarea'));
        $textAreaACEContent->clear();
        $textAreaACEContent->sendKeys($params['applicationlogic']);

        // Сохраняем
        $this->submitForm('dialplan-application-form');

        $this->clickSidebarMenuItemByHref("/admin-cabinet/dialplan-applications/index/");
        $this->clickModifyButtonOnRowWithText($params['extension']);
        $this->assertInputFieldValueEqual('name', $params['name']);
        $this->assertTextAreaValueIsEqual('description', $params['description']);
        $this->assertInputFieldValueEqual('extension', $params['extension']);
        $this->assertMenuItemSelected('type', $params['type']);
        $this->assertInputFieldValueEqual('applicationlogic', $params['applicationlogic']);

        }
        
    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params[] = [[
            'extension'=>'132456789',
            'uniqid'=>'DIALPLAN-APP-146CBFBBF6EB4237EA15B2EC3E67B787',
            'name'=>'Проговорить IP адрес системы2',
            'description'=>"Test Dialplan application with plain text",
            'type'=>"plaintext",
            'applicationlogic'=>'1,Answer()
2,Set(CHANNEL(language)=en-us)
3,Set(IPOUTPUT=${SHELL(/etc/scripts/parseip.sh)})
4,NoOp(IPOUTPUT: ${IPOUTPUT})
5,Playback(beep)
n,SayDigits(${CUT(IPOUTPUT,\.,1)})
n,Playback(silence/1)
n,SayDigits(${CUT(IPOUTPUT,\.,2)})
n,Playback(silence/1)
n,SayDigits(${CUT(IPOUTPUT,\.,3)})
n,Playback(silence/1)
n,SayDigits(${CUT(IPOUTPUT,\.,4)})
n,Playback(silence/1)
n,Playback(silence/1)
n,Goto(5)',
        ]];
        $params[] = [[
            'extension'=>'10000123',
            'uniqid'=>'DIALPLAN-APP-146CBFBBF6EB4237EA15B2EC3E67B784',
            'name'=>'1C MIKO SMART IVR',
            'description'=>"Генерация IVR меню на основе данных CRM системы",
            'type'=>"php",
            'applicationlogic'=>'<?php
require_once \'Globals.php\';

$ivr    = new SmartIVR();
$result = $ivr->startIVR();',
        ]];
        return $params;
    }
}