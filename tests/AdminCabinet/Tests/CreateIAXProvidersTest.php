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
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase as MikoPBXTestsBaseAlias;

/**
 * Class to test the creation and modification of IAX providers in the admin cabinet.
 */
class CreateIAXProvidersTest extends MikoPBXTestsBaseAlias
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
        $this->setSessionName("Test: Create IAX providers");
    }

    /**
     * Test the creation and modification of IAX providers.
     *
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params The parameters for creating the IAX provider.
     */
    public function testCreateIaxProvider(array $params): void
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

        // Expand advanced options
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

        // Expand advanced options
        $this->openAccordionOnThePage();

        $this->assertCheckBoxStageIsEqual('qualify', $params['qualify']);

        $this->assertCheckBoxStageIsEqual('noregister', $params['noregister']);
        $this->assertTextAreaValueIsEqual('manualattributes', $params['manualattributes']);
    }

    /**
     * Dataset provider for IAX provider creation parameters.
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params = [];
        $params['VoxlinkIAX'] = [
            [
                'type' => 'iax',
                'uniqid' => 'IAX-1683372799',
                'description' => 'VoxlinkIAX',
                'host' => 'vox.link.ru',
                'username' => 'line1',
                'password' => 'voxvoxSecret',
                'qualify' => true,
                'noregister' => true,
                'manualattributes' => '',
            ]
        ];
        $params['VoxlinkIAX for delete'] = [
            [
                'type' => 'iax',
                'uniqid' => 'IAX-1683372823',
                'description' => 'VoxlinkIAX for delete',
                'host' => 'vox.link2.ru',
                'username' => 'line1',
                'password' => 'voxvoxSecret',
                'qualify' => true,
                'noregister' => true,
                'manualattributes' => '',
            ]
        ];

        return $params;
    }
}
