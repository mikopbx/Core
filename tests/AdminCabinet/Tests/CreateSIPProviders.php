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

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase as MikoPBXTestsBaseAlias;

class CreateSIPProviders extends MikoPBXTestsBaseAlias
{
    /**
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testCreateSIPProvider($params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->clickDeleteButtonOnRowWithText($params['description']);

        $this->clickButtonByHref('/admin-cabinet/providers/modifysip');
        $this->selectDropdownItem('registration_type', $params['registration_type']);
        $this->changeInputField('description', $params['description']);
        if ($params['registration_type']==='outbound') {
            $this->changeInputField('host', $params['host']);
            $this->changeInputField('username', $params['username']);
        }
        if ($params['registration_type']==='none') {
            $this->changeInputField('host', $params['host']);
        } else {
            $this->changeInputField('secret', $params['password']);
        }
        $this->selectDropdownItem('dtmfmode', $params['dtmfmode']);

        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();
        $this->changeInputField('port', $params['port']);
        $this->changeCheckBoxState('qualify', $params['qualify']);
        if ($params['qualify']) {
            $this->changeInputField('qualifyfreq', $params['qualifyfreq']);
        }
        $this->changeInputField('outbound_proxy', $params['outbound_proxy']);
        if ($params['disablefromuser']!==false) {
            $this->changeInputField('fromuser', $params['fromuser']);
        }
        $this->changeInputField('fromdomain', $params['fromdomain']);
        $this->changeCheckBoxState('disablefromuser', $params['disablefromuser']);

        $this->changeTextAreaValue('manualattributes', $params['manualattributes']);

        $this->submitForm('save-provider-form');

        $this->clickSidebarMenuItemByHref('/admin-cabinet/providers/index/');
        $this->clickModifyButtonOnRowWithText($params['description']);

        // Asserts
        $this->assertMenuItemSelected('registration_type', $params['registration_type']);
        $this->assertInputFieldValueEqual('description', $params['description']);

        if ($params['registration_type']==='outbound') {
            $this->assertInputFieldValueEqual('host', $params['host']);
            $this->assertInputFieldValueEqual('username', $params['username']);
        }
        if ($params['registration_type']==='none') {
            $this->assertInputFieldValueEqual('host', $params['host']);
        }  else {
            $this->assertInputFieldValueEqual('secret', $params['password']);
        }
        $this->assertMenuItemSelected('dtmfmode', $params['dtmfmode']);
        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();

        $this->assertInputFieldValueEqual('port', $params['port']);
        $this->assertCheckBoxStageIsEqual('qualify', $params['qualify']);
        if ($params['qualify']) {
            $this->assertInputFieldValueEqual('qualifyfreq', $params['qualifyfreq']);
        }
        $this->assertInputFieldValueEqual('outbound_proxy', $params['outbound_proxy']);
        if ($params['disablefromuser']!==false) {
            $this->assertInputFieldValueEqual('fromuser', $params['fromuser']);
        }
        $this->assertInputFieldValueEqual('fromdomain', $params['fromdomain']);
        $this->assertCheckBoxStageIsEqual('disablefromuser', $params['disablefromuser']);

        $this->assertTextAreaValueIsEqual('manualattributes', $params['manualattributes']);
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
                'type'              => 'sip',
                'registration_type' => 'outbound',
                'description'       => 'PCTEL',
                'host'              => 'pctel.ru',
                'username'          => 'pctel',
                'password'          => 'asdfasdfas',
                'dtmfmode'          => 'auto',
                'port'              => 5062,
                'qualify'           => false,
                'qualifyfreq'       => 62,
                'outbound_proxy'    => 'proxy.miko.ru:5080',
                'fromuser'          => 'testFromUser',
                'fromdomain'        => 'TestFromDomain',
                'disablefromuser'   => false,
                'manualattributes'  => '',
            ],
        ];

        $params[] = [
            [
                'type'              => 'sip',
                'registration_type' => 'inbound',
                'description'       => 'Mango office',
                'host'              => 'mango.office.ru',
                'username'          => 'mango',
                'password'          => 'office',
                'dtmfmode'          => 'inband',
                'port'              => 5061,
                'qualify'           => true,
                'qualifyfreq'       => 61,
                'outbound_proxy'    => 'proxy2.miko.ru',
                'disablefromuser'   => true,
                'fromuser'          => '',
                'fromdomain'        => '',
                'manualattributes'  => '',
            ],
        ];


        $params[] = [
            [
                'registration_type'=> 'outbound',
                'type'             => 'sip',
                'description'      => 'Provider for CTI tests',
                'host'             => '127.0.0.1',
                'username'         => 'test',
                'password'         => 'test567',
                'dtmfmode'         => 'auto',
                'port'             => 5062,
                'qualify'          => false,
                'qualifyfreq'       => '',
                'outbound_proxy'    => '',
                'disablefromuser'  => true,
                'fromuser'         => '',
                'fromdomain'       => 'miko.ru',
                'manualattributes' => '[endpoint]' . PHP_EOL . 'callerid=Mark Spenser <79261234567>',

            ],
        ];

        $params[] = [
            [
                'type'              => 'sip',
                'registration_type' => 'none',
                'description'       => 'Mango office for delete',
                'host'              => 'mango1.office.ru',
                'username'          => 'mango1',
                'password'          => 'office2',
                'dtmfmode'          => 'inband',
                'port'              => 5063,
                'qualify'           => true,
                'qualifyfreq'       => 63,
                'outbound_proxy'    => '',
                'disablefromuser'   => true,
                'fromuser'          => '',
                'fromdomain'        => '',
                'manualattributes'  => '',
            ],
        ];

        return $params;
    }

}