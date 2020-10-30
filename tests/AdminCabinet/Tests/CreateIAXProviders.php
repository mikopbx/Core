<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Tests\AdminCabinet\Tests;

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase as MikoPBXTestsBaseAlias;

class CreateIAXProviders extends MikoPBXTestsBaseAlias
{
    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testCreateIaxProvider($params):void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->clickDeleteButtonOnRowWithText($params['description']);

        $this->clickButtonByHref('/admin-cabinet/providers/modifyiax');
        $this->changeInputField('description', $params['description']);
        $this->changeInputField('host', $params['host']);
        $this->changeInputField('username', $params['username']);
        $this->changeInputField('secret', $params['password']);

        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();
        $this->changeCheckBoxState('qualify', $params['qualify']);

        $this->changeCheckBoxState('noregister', $params['noregister']);
        $this->changeTextAreaValue('manualattributes', $params['manualattributes']);

        $this->submitForm('save-provider-form');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');

        $this->clickModifyButtonOnRowWithText($params['description']);

        // Asserts
        $this->assertInputFieldValueEqual('description', $params['description']);
        $this->assertInputFieldValueEqual('host', $params['host']);
        $this->assertInputFieldValueEqual('username', $params['username']);
        $this->assertInputFieldValueEqual('secret', $params['password']);

        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();


        $this->assertCheckBoxStageIsEqual('qualify', $params['qualify']);

        $this->assertCheckBoxStageIsEqual('noregister', $params['noregister']);
        $this->assertTextAreaValueIsEqual('manualattributes', $params['manualattributes']);
    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider():array
    {
        $params = [];
        $params[] = [[
            'type'=>'iax',
            'description' => 'VoxlinkIAX',
            'host' => 'vox.link.ru',
            'username'        => 'line1',
            'password'        => 'voxvoxSecret',
            'qualify'         => true,
            'noregister'=>true,
            'manualattributes'=>'',
        ]];

        return $params;
    }

}