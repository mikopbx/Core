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

        // Fix uniqid to compare reference data in /etc folder for every build
        self::$driver->executeScript(
            "$('#save-provider-form').form('set value','uniqid','{$params['uniqid']}');"
        );

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
            'uniqid'=>'IAX-1683372799',
            'description' => 'VoxlinkIAX',
            'host' => 'vox.link.ru',
            'username'        => 'line1',
            'password'        => 'voxvoxSecret',
            'qualify'         => true,
            'noregister'=>true,
            'manualattributes'=>'',
        ]];
        $params[] = [[
            'type'=>'iax',
            'uniqid'=>'IAX-1683372823',
            'description' => 'VoxlinkIAX for delete',
            'host' => 'vox.link2.ru',
            'username'        => 'line1',
            'password'        => 'voxvoxSecret',
            'qualify'         => true,
            'noregister'=>true,
            'manualattributes'=>'',
        ]];

        return $params;
    }

}