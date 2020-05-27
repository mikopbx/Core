<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\FunctionalTests\Tests;


use Facebook\WebDriver\WebDriverBy;
use MikoPBX\FunctionalTests\Lib\MikoPBXTestsBase;

class CreateIVRMenusTest extends MikoPBXTestsBase
{

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function teatCreateIVRMenu($params):void {

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
     * Dataset provider
     * @return array
     */
     public function additionProvider(): array
     {
         $params = [];
         $params[] = [[
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
         ]];

         $params[] = [[
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
         ]];



         return $params;
     }

}