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
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase as MikoPBXTestsBaseAlias;

class CreateCallQueue extends MikoPBXTestsBaseAlias
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testCreateCallQueue($params):void
    {

        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');
        $this->clickDeleteButtonOnRowWithText($params['name']);

        $this->clickButtonByHref('/admin-cabinet/call-queues/modify');
        $this->changeTextAreaValue('description', $params['description']);
        $this->changeInputField('name', $params['name']);
        
        // Добавляем агентов очереди
        foreach ($params['agents'] as $agent) {
            $this->selectDropdownItem('extensionselect', $agent);
        }

        $this->selectDropdownItem('strategy', $params['strategy']);

        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();

        // Заполняем поля из базы данных с исходными данными
        $this->changeInputField('extension', $params['extension']);
        $this->changeInputField('seconds_to_ring_each_member', $params['seconds_to_ring_each_member']);
        $this->changeInputField('seconds_for_wrapup', $params['seconds_for_wrapup']);
        $this->changeCheckBoxState('recive_calls_while_on_a_call', $params['recive_calls_while_on_a_call']);

        $this->selectDropdownItem('caller_hear', $params['caller_hear']);
        $this->changeCheckBoxState('announce_position', $params['announce_position']);
        $this->changeCheckBoxState('announce_hold_time', $params['announce_hold_time']);

        $this->selectDropdownItem('periodic_announce_sound_id', $params['periodic_announce_sound_id']);

        $this->changeInputField('periodic_announce_frequency', $params['periodic_announce_frequency']);
        $this->changeInputField('timeout_to_redirect_to_extension', $params['timeout_to_redirect_to_extension']);

        $this->selectDropdownItem('timeout_extension', $params['timeout_extension']);
        $this->selectDropdownItem('redirect_to_extension_if_empty', $params['redirect_to_extension_if_empty']);

        $this->submitForm('queue-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');

        $this->clickModifyButtonOnRowWithText($params['name']);
        $this->assertInputFieldValueEqual('name', $params['name']);
        $this->assertInputFieldValueEqual('extension', $params['extension']);
        $this->assertTextAreaValueIsEqual('description', $params['description']);

        // Обойдем всех членов очереди, проверим что они есть
        foreach ($params['agents'] as $agent) {
            $xpath = '//table[@id="extensionsTable"]//td[contains(text(), "'.$agent.'")]';
            $members = self::$driver->findElements(WebDriverBy::xpath($xpath));
            if (count($members)===0){
                $this->assertTrue(false, 'Not found agent '.$agent.' in queue agents list');
            }

        }
        $this->assertMenuItemSelected('strategy', $params['strategy']);

        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();

        $this->assertInputFieldValueEqual('seconds_to_ring_each_member', $params['seconds_to_ring_each_member']);
        $this->assertInputFieldValueEqual('seconds_for_wrapup', $params['seconds_for_wrapup']);
        $this->assertCheckBoxStageIsEqual('recive_calls_while_on_a_call', $params['recive_calls_while_on_a_call']);

        $this->assertMenuItemSelected('caller_hear', $params['caller_hear']);
        $this->assertCheckBoxStageIsEqual('announce_position', $params['announce_position']);
        $this->assertCheckBoxStageIsEqual('announce_hold_time', $params['announce_hold_time']);

        $this->assertMenuItemSelected('periodic_announce_sound_id', $params['periodic_announce_sound_id']);

        $this->assertInputFieldValueEqual('periodic_announce_frequency', $params['periodic_announce_frequency']);
        $this->assertInputFieldValueEqual('timeout_to_redirect_to_extension', $params['timeout_to_redirect_to_extension']);

        $this->assertMenuItemSelected('timeout_extension', $params['timeout_extension']);
        $this->assertMenuItemSelected('redirect_to_extension_if_empty', $params['redirect_to_extension_if_empty']);

    }

    /**
     * Dataset provider
     * @return array
     */
     public function additionProvider(): array
     {
         $params = [];
         $params[] = [[
             'description' => 'Sales department queue, the first line of agents',
             'name'        => 'Sales department',
             'extension'   => 20020,
             'seconds_to_ring_each_member'=>14,
             'seconds_for_wrapup'=>12,
             'recive_calls_while_on_a_call'=> true,
             'caller_hear'=>'ringing', //'moh'
             'announce_position'=> true,
             'announce_hold_time'=>false,
             'periodic_announce_sound_id'=>'2',
             'periodic_announce_frequency'=>24,
             'timeout_to_redirect_to_extension'=>18,
             'timeout_extension'=>'201',
             'redirect_to_extension_if_empty'=>'202',
             'agents'      => [
                 '201',
                 '202',
                 '203',
             ],
             'strategy'=>'linear'

         ]];
         $params[] = [[
             'description' => 'Accountant department queue, the second line of agents',
             'name'        => 'Accountant department',
             'extension'   => 20021,
             'seconds_to_ring_each_member'=>14,
             'seconds_for_wrapup'=>13,
             'recive_calls_while_on_a_call'=> false,
             'caller_hear'=>'moh',
             'announce_position'=> false,
             'announce_hold_time'=>true,
             'periodic_announce_sound_id'=>'2',
             'periodic_announce_frequency'=>24,
             'timeout_to_redirect_to_extension'=>18,
             'timeout_extension'=>'202',
             'redirect_to_extension_if_empty'=>'201',
             'agents'      => [
                 '202',
                 '203',
             ],
             'strategy'=>'leastrecent'

         ]];

         return $params;
     }
}