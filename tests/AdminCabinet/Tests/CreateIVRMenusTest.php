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
 * Class to test the creation and modification of IVR menus in the admin cabinet.
 */
class CreateIVRMenusTest extends MikoPBXTestsBase
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
        $this->setSessionName("Test: Create IVR menu");
    }


    /**
     * Test the creation and modification of IVR menus.
     *
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for creating the IVR menu.
     */
    public function teatCreateIVRMenu(array $params):void {

        $this->clickSidebarMenuItemByHref('/admin-cabinet/ivr-menu/index/');
        $this->clickDeleteButtonOnRowWithText($params['name']);

        $this->clickButtonByHref('/admin-cabinet/ivr-menu/modify');
        $this->changeTextAreaValue('description', $params['description']);
        $this->changeInputField('name', $params['name']);
        $this->selectDropdownItem('audio_message_id', $params['audio_message_id']);


        $currentMenuItem = 0;

        foreach ($params['menuItems'] as $key=>$value){
            if ($currentMenuItem > 0){
                // Нажмем на кнопку добавления нового элемента меню
                $xpath        = '//button[@id="add-new-ivr-action"]';
                $addNewMenuItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
                $addNewMenuItem->click();
            }
            $currentMenuItem++;
            $this->changeInputField('digits-' . $currentMenuItem, $key);
            $this->selectDropdownItem('extension-' . $currentMenuItem, $value);
        }

        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();
        $this->changeInputField('number_of_repeat', $params['number_of_repeat']);
        $this->changeInputField('timeout', $params['timeout']);
        $this->selectDropdownItem('timeout_extension', $params['timeout_extension']);
        $this->changeInputField('extension', $params['extension']);
        $this->changeCheckBoxState('allow_enter_any_internal_extension', $params['allow_enter_any_internal_extension']);


        $this->submitForm('ivr-menu-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/ivr-menu/index/');
        $this->clickModifyButtonOnRowWithText($params['name']);

        $this->assertTextAreaValueIsEqual('description', $params['description']);
        $this->assertInputFieldValueEqual('name', $params['name']);
        $this->assertMenuItemSelected('audio_message_id', $params['audio_message_id']);

        $currentMenuItem = 0;

        foreach ($params['menuItems'] as $key=>$value){
            $currentMenuItem++;
            $this->assertInputFieldValueEqual('digits-' . $currentMenuItem, $key);
            $this->assertMenuItemSelected('extension-' . $currentMenuItem, $value);
        }

        $this->assertInputFieldValueEqual('number_of_repeat', $params['number_of_repeat']);
        $this->assertInputFieldValueEqual('timeout', $params['timeout']);
        $this->assertMenuItemSelected('timeout_extension', $params['timeout_extension']);
        $this->assertCheckBoxStageIsEqual('allow_enter_any_internal_extension', $params['allow_enter_any_internal_extension']);
        $this->assertInputFieldValueEqual('extension', $params['extension']);

    }

    /**
     * Dataset provider for IVR menu creation parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['Second IVR menu 20021'] = [
            [
                'description' => 'Second level IVR menu, with extra menu items',
                'name'        => 'Second IVR menu',
                'audio_message_id' => '2',
                'menuItems' => [
                    '1'=>'10003246',
                    '2'=>'000063',
                    '3'=>'000064',
                ],
                'number_of_repeat'=> 2,
                'timeout'=> 15,
                'timeout_extension'=>'202',
                'allow_enter_any_internal_extension'=>true,
                'extension'   => 20021
            ]
        ];

        $params['Main IVR menu 20020'] = [
            [
                'description' => 'First level IVR menu, with agents numbers and another IVR menu included',
                'name'        => 'Main IVR menu',
                'audio_message_id' => '1',
                'menuItems' => [
                    '1'=>'20021',
                    '2'=>'202',
                    '3'=>'203',
                ],
                'number_of_repeat'=>3,
                'timeout'=>20,
                'timeout_extension'=>'201',
                'allow_enter_any_internal_extension'=>false,
                'extension'   => 20020
            ]
        ];

        return $params;
    }

}